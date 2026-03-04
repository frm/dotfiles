---
name: unit-testing-guidelines
description: "Guidelines for writing Elixir unit tests. Follow these conventions when generating, reviewing, or modifying ExUnit tests."
---

# Elixir Unit Testing Guidelines

## Test Case Classification

Always explicitly mark `async`. Default to `async: true` unless the test requires synchronous execution.

```elixir
# Pure logic — no DB, no side effects
use ExUnit.Case, async: true

# DB-interacting modules
use YourApp.DataCase, async: true
```

Use `async: false` only when the test uses patterns that require synchronous execution:

- **Supervised processes** with global names or DB queries in init
- **Global state**: `Application.put_env`, `Mox.set_mox_global()`, ETS writes to shared tables, `Oban.drain_queue()`
- **Other global effects**: feature flag toggling without actor scoping, email testing libraries

When a test file mixes async-compatible and async-incompatible tests, split them into separate files so the async-safe tests can run in parallel.

## Test Data Setup

Use [ex_machina](https://github.com/beam-community/ex_machina) factories for DB state. Never call business logic to build test state.

```elixir
# GOOD: factory sets up DB state directly
user = insert(:user, role: :admin, email: "admin@example.com")
order = insert(:order, user: user, status: :pending)

assert :ok = Orders.approve(order)
```

```elixir
# BAD: calling business logic for setup
{:ok, user} = Accounts.register(%{email: "admin@example.com", role: :admin})
{:ok, order} = Orders.create(user, %{amount: 100})

assert :ok = Orders.approve(order)
```

**Why:** Business logic calls in setup break test isolation and make tests dependent on unrelated code paths. If `Accounts.register/1` changes, tests for `Orders.approve/1` break.

**Key rules:**

- Use factory functions (`insert`, `build`, `params_for`) for all DB state
- Factories accept keyword options for customization
- Keep factories minimal — override only what the test needs

## Test Organization

- Prefer `setup` callbacks over helper functions for shared state
- Helpers go at bottom of `describe` block or module
- Organize `describe` blocks by function under test

```elixir
defmodule MyApp.PricingTest do
  use MyApp.DataCase, async: true

  import MyApp.Factory

  describe "calculate_total/2" do
    setup do
      product = insert(:product, price: Decimal.new("29.99"))
      %{product: product}
    end

    test "returns total for single item", %{product: product} do
      assert {:ok, total} = Pricing.calculate_total(product, 1)
      assert Decimal.equal?(total, Decimal.new("29.99"))
    end

    test "applies quantity multiplier", %{product: product} do
      assert {:ok, total} = Pricing.calculate_total(product, 3)
      assert Decimal.equal?(total, Decimal.new("89.97"))
    end

    test "rejects zero quantity", %{product: product} do
      assert {:error, :invalid_quantity} = Pricing.calculate_total(product, 0)
    end
  end
end
```

## Assertions

### Hardcoded Expected Values

Assert against hardcoded values only — never compute expected values using production logic.

```elixir
# GOOD: hardcoded expected value, worked out by hand
test "calculates 1.5% fee on $100" do
  assert {:ok, fee} = Fees.calculate(Decimal.new("100.00"))
  assert Decimal.equal?(fee, Decimal.new("1.50"))
end
```

```elixir
# BAD: duplicating production logic in test
test "calculates fee" do
  amount = Decimal.new("100.00")
  expected = Decimal.mult(amount, Decimal.new("0.015"))
  assert {:ok, ^expected} = Fees.calculate(amount)
end
```

If you're computing the expected value with the same logic as production code, the test proves nothing — it just confirms the code matches itself.

### Pattern Matching

Pattern match on result tuples to verify structure and values:

```elixir
# Match on ok/error tuples
assert {:ok, %Order{status: :confirmed}} = Orders.confirm(order)
assert {:error, :insufficient_funds} = Orders.confirm(broke_order)

# Verify persisted data
assert %User{email: "new@example.com"} = Repo.get!(User, user.id)

# Check changeset errors
assert {:error, changeset} = Accounts.register(%{email: ""})
assert "can't be blank" in errors_on(changeset).email
```

### Don't Assume an Empty Database

Never pattern match on `Repo.all` assuming you know the full contents. Filter for specific records.

```elixir
# GOOD: query for the specific record
user = Repo.get!(User, user.id)
refute user.active

# BAD: assumes only one user in the database
[user] = Repo.all(User)
refute user.active
```

## Test Structure

- **One behavior per test.** If the name has "and", split it.
- **Cover happy path + error/edge cases** for every public function.
- **Descriptive test names** that describe behavior, not implementation.

| Quality          | Good                                | Bad                                                |
| ---------------- | ----------------------------------- | -------------------------------------------------- |
| **Minimal**      | One thing. "and" in name? Split it. | `test "validates email and domain and whitespace"` |
| **Clear**        | Name describes behavior             | `test "test1"`                                     |
| **Shows intent** | Demonstrates desired API            | Obscures what code should do                       |

## Mocking

Only mock third-party/external dependencies. Never mock internal business logic modules.

### Use Mimic for External Dependencies

```elixir
defmodule MyApp.NotifierTest do
  use MyApp.DataCase, async: true
  use Mimic

  describe "send_welcome/1" do
    test "sends welcome email via provider" do
      user = insert(:user, email: "new@example.com")

      Mimic.expect(MyApp.EmailProvider, :deliver, fn email ->
        assert email.to == "new@example.com"
        assert email.template == :welcome
        {:ok, %{id: "msg_123"}}
      end)

      assert :ok = Notifier.send_welcome(user)
    end

    test "returns error when provider fails" do
      user = insert(:user)

      Mimic.expect(MyApp.EmailProvider, :deliver, fn _email ->
        {:error, :rate_limited}
      end)

      assert {:error, :delivery_failed} = Notifier.send_welcome(user)
    end
  end
end
```

**Key points:**

- `use Mimic` after `use DataCase`
- `Mimic.expect/3` sets expectations that are verified automatically
- `Mimic.stub/3` for fire-and-forget replacements (no verification)
- Mimic uses private mode by default and is async-safe

### What to Mock vs What Not To

```elixir
# GOOD: mock external HTTP API
Mimic.expect(MyApp.StripeClient, :charge, fn _params -> {:ok, %{id: "ch_123"}} end)

# GOOD: mock external email provider
Mimic.expect(MyApp.Mailer, :deliver, fn _email -> {:ok, %{id: "msg_123"}} end)

# BAD: mocking internal business logic
Mimic.expect(MyApp.Billing, :create_invoice, fn _ -> {:ok, %Invoice{}} end)
```

## Examples

### Pure Logic Module

```elixir
defmodule MyApp.SlugifierTest do
  use ExUnit.Case, async: true

  alias MyApp.Slugifier

  describe "slugify/1" do
    test "converts spaces to hyphens" do
      assert Slugifier.slugify("hello world") == "hello-world"
    end

    test "lowercases all characters" do
      assert Slugifier.slugify("Hello World") == "hello-world"
    end

    test "strips special characters" do
      assert Slugifier.slugify("hello! @world#") == "hello-world"
    end

    test "collapses consecutive hyphens" do
      assert Slugifier.slugify("hello   world") == "hello-world"
    end

    test "returns empty string for empty input" do
      assert Slugifier.slugify("") == ""
    end
  end
end
```

### DB-Interacting Module

```elixir
defmodule MyApp.Accounts.RegistrationTest do
  use MyApp.DataCase, async: true

  import MyApp.Factory

  alias MyApp.Accounts.Registration

  describe "register/1" do
    test "creates user with valid params" do
      params = params_for(:user, email: "new@example.com")

      assert {:ok, user} = Registration.register(params)
      assert user.email == "new@example.com"
      assert user.confirmed_at == nil
    end

    test "rejects duplicate email" do
      existing = insert(:user, email: "taken@example.com")

      params = params_for(:user, email: existing.email)
      assert {:error, changeset} = Registration.register(params)
      assert "has already been taken" in errors_on(changeset).email
    end

    test "rejects invalid email format" do
      params = params_for(:user, email: "not-an-email")
      assert {:error, changeset} = Registration.register(params)
      assert "must have the @ sign and no spaces" in errors_on(changeset).email
    end
  end
end
```

## Verification Checklist

Before marking test work complete:

- [ ] Every public function has tests
- [ ] Error and edge cases covered
- [ ] Tests pass
- [ ] Expected values are hardcoded, not computed
- [ ] No empty database assumptions
- [ ] Mocks only for external dependencies
- [ ] `async: true` unless required otherwise
- [ ] `describe` blocks organized by function
