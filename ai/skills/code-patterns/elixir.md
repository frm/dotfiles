# Elixir Patterns

### Context modules are thin orchestrators

Context modules (the public API of a domain) delegate to focused internal modules. They don't contain complex logic themselves — they wire together queries, commands, and side effects.

### Changesets validate, contexts orchestrate

Validation logic lives in the schema's changeset functions. Business rules that span multiple schemas live in the context. Don't put query logic in schemas or validation logic in contexts.

### Pattern match on function heads, not inside the body

Use multi-clause functions with pattern matching over `case`/`cond` inside a single function body. Each clause should handle one scenario clearly.

```elixir
# Good: pattern match on function heads
def process(%Order{status: :pending} = order), do: ...
def process(%Order{status: :confirmed} = order), do: ...

# Avoid: case inside function body
def process(order) do
  case order.status do
    :pending -> ...
    :confirmed -> ...
  end
end
```

### Extract nested statements into private functions

Nested control flow (case inside case, with inside with, conditionals inside comprehensions) should be extracted to named private functions. Each level of logic gets its own function with a clear name.

```elixir
# Bad
def process(order) do
  case validate(order) do
    {:ok, order} ->
      case charge(order) do
        {:ok, receipt} -> ...
        {:error, reason} -> ...
      end
    {:error, reason} -> ...
  end
end

# Good: flatten with `with`, or extract
def process(order) do
  with {:ok, order} <- validate(order),
       {:ok, receipt} <- charge(order) do
    ...
  end
end
```

### Use `with` for sequential operations that can fail

Chain operations that return `{:ok, _}` / `{:error, _}` with `with`. Put the unhappy path in `else`. Don't nest `case` statements for sequential failable operations.

### Pipeline conventions

Only start pipelines with a value if the same struct is being transformed through the chain. Otherwise, start with a function call.

```elixir
# Good: value is being transformed
params
|> Enum.drop([:a, :b])
|> Enum.to_list()

# Good: starts with function, result flows through
Accounts.owner_of_device(device.id)
|> has_privilege?(:delete)

# Bad: value isn't the thing being transformed
device.id
|> Accounts.owner_of_device()
|> has_privilege?(:delete)

# Bad: first call doesn't take piped input
Enum.drop(params, [:a, :b])
|> Enum.to_list()
```

Don't pipe into functions called purely for side effects — call those on their own line.

Avoid chaining multiple `Enum` passes over the same collection. Use `Stream` for intermediate steps:

```elixir
# Good
params
|> Stream.filter(&is_odd/1)
|> Stream.drop([1, 3])
|> Enum.map(& &1 * 2)

# Bad: iterates the collection three times
params
|> Enum.filter(&is_odd/1)
|> Enum.drop([1, 3])
|> Enum.map(& &1 * 2)
```

### Data loading conventions

Prefer a single generic query function with keyword filters over multiple specialized getters. Accept keywords for params and a separate preloads argument.

```elixir
# Good: generic, composable
def get_user_by(params \\ [], preloads \\ [])

# Bad: proliferating specialized functions
def get_user_by_uuid(uuid)
def get_user_by_uuid_and_mobile_device(uuid, device)
```

Prefer ids over structs as arguments for data loading:

```elixir
# Good
def get_owner_of_device(device_id)

# Bad: forces caller to have the full struct
def get_owner_of_device(%Device{id: id})
```

Reserve `get_*` for functions that return `resource | nil`. Use `fetch_*` for functions that return `{:ok, resource} | {:error, :not_found}`.

### Bang propagation

If a private function calls a `!` function (one that raises on failure), the caller should also have `!` in its name. This makes it obvious from the call site that the function can raise.

```elixir
# Good: bang propagates up
defp create_user!(attrs) do
  %User{}
  |> User.changeset(attrs)
  |> Repo.insert!()
end

# Bad: hides the raise
defp create_user(attrs) do
  %User{}
  |> User.changeset(attrs)
  |> Repo.insert!()
end
```

### Boundary hygiene

- Predicate functions end in `?`. Reserve `is_*` names for guards only.
- Normalize external input once at the interface boundary. After that, trust the shape — don't re-normalize or defensively filter downstream.
- Never access the same key in both atom and string form. No `foo[:bar] || foo["bar"]`, no `Map.drop(foo, [:bar, "bar"])`. Normalize to one form at the boundary, use that form everywhere.
- Don't add defensive guards that compensate for invalid or unnormalized input at internal boundaries. If a function's contract requires a shape, write against that shape and let invalid callers fail loudly.

```elixir
# Bad: defensive guard on internal function
def foo(%{x: x}) when x not in [nil, ""] do
  ...
end

# Good: trust the contract
def foo(%{x: x}) do
  ...
end
```

- Use guards for genuine multi-clause dispatch across supported input shapes, not as internal input policing.

```elixir
# Good: guards for dispatch
def add_two(foo) when is_integer(foo), do: foo + 2
def add_two(foo) when is_binary(foo), do: add_two(String.to_integer(foo))

# Bad: single-clause guard that just rejects bad input
def add_two(foo) when is_integer(foo), do: foo + 2

# Preferred: trust the contract
def add_two(foo), do: foo + 2
```

- If a state should be impossible, fail loudly rather than hide the mismatch with fallback logic.
