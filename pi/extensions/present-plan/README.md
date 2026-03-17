# Present Plan Extension

Displays a scrollable plan overlay in the terminal for the user to review and approve before implementation begins. The agent presents a markdown plan; the user can approve it, reject it, or leave inline comments tied to specific line ranges. The result is persisted to session history and re-opening a plan shows a diff against the previous version.

## Tools

### `present_plan`

Display a plan for review. Returns the user's decision.

| Param | Type | Required | Description |
|---|---|---|---|
| `plan` | string | yes | Full implementation plan in markdown format |
| `contexts` | array | no | Context blocks for inline comment editing (see below) |

**Return values:** `"approved"`, `"rejected"`, or a feedback string with the user's inline comments.

#### `contexts` — inline comment editor

Each context object maps a range of lines in the plan to content shown when the user writes a comment on those lines:

| Field | Type | Required | Description |
|---|---|---|---|
| `rawStart` | number | yes | First line of the range (1-indexed) in the raw markdown |
| `rawEnd` | number | yes | Last line of the range (1-indexed) in the raw markdown |
| `content` | string | yes | Markdown rendered in the inline comment editor for this range |

## Commands

| Command | Description |
|---|---|
| `/plan` | Reopen and display the last presented plan |

## Shortcuts

None.

## Notable Behavior

- **Diff view** — When `/plan` is used to re-present a plan that was previously shown, the overlay renders a diff highlighting what changed between versions.
- **Persistence** — Plans are stored in session history so they survive context resets within the same session.
- **Inline comments** — When `contexts` are provided, selecting a line range in the overlay opens a context-aware comment editor that shows the relevant `content` alongside the user's input.
