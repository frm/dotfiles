# Testing Anti-Patterns

## Testing mock behavior instead of real behavior

Asserting that a mock was called rather than asserting the actual outcome of the code under test.

```elixir
# Bad: only verifying the mock exists and was called
test "sends notification" do
  Mimic.expect(MyApp.Mailer, :deliver, fn _email -> {:ok, "sent"} end)
  Notifier.send_welcome(user)
  # passes because mock was called, but never checked that
  # the notification record was created or the right email was sent
end

# Good: verify the real outcome
test "sends welcome email to user" do
  Mimic.expect(MyApp.Mailer, :deliver, fn email ->
    assert email.to == "new@example.com"
    assert email.template == :welcome
    {:ok, %{id: "msg_123"}}
  end)

  assert :ok = Notifier.send_welcome(user)
  assert %Notification{type: :welcome} = Repo.get_by!(Notification, user_id: user.id)
end
```

## Test-only methods in production code

Adding functions to production modules that are only called from tests. This pollutes production code and is dangerous if accidentally called at runtime.

```elixir
# Bad: production module has test-only method
defmodule MyApp.Accounts.Session do
  def destroy_for_test(session) do
    Repo.delete(session)
  end
end

# Good: put it in test support
defmodule MyApp.TestHelpers do
  def cleanup_session(session) do
    Repo.delete(session)
  end
end
```

## Mocking internal modules

Even in unit tests, call real internal dependencies. Only mock external third-party APIs. Mocking internal code hides integration bugs — tests pass but real code paths fail.

```elixir
# Bad: mocking internal business logic
test "creates order" do
  Mimic.expect(MyApp.Ledger, :create_entry, fn _, _ -> {:ok, %LedgerEntry{}} end)
  Mimic.expect(MyApp.Accounting, :update_balance, fn _ -> :ok end)
  assert {:ok, _} = Orders.create(params)
end

# Good: let real code run, assert on outcome
test "creates order and updates ledger" do
  user = insert(:user, status: :active)
  assert {:ok, order} = Orders.create(user, %{amount: Decimal.new("100")})
  assert %LedgerEntry{} = Repo.get_by!(LedgerEntry, order_id: order.id)
end
```

## Incomplete mock/stub data

Stubbing an external API response with only the fields you think you need. Downstream code may depend on fields you didn't include, causing failures that the test hides.

```elixir
# Bad: partial response, missing fields downstream code reads
Mimic.stub(MyApp.PaymentGateway, :get_account, fn _id ->
  {:ok, %{"account_id" => "123"}}
end)

# Good: mirror the real API response shape
Mimic.stub(MyApp.PaymentGateway, :get_account, fn _id ->
  {:ok, %{
    "account_id" => "123",
    "balances" => %{"available" => 1000, "current" => 1100},
    "status" => "active",
    "metadata" => %{}
  }}
end)
```

When creating stubs for external APIs, check the real API documentation and include all fields that the system might consume downstream.
