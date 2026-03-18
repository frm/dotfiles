# Work Setup Extension

Creates a development environment for a Linear ticket: worktree, tmux window, and optionally launches pi with `/brainstorm`. Used by the `find-work` and `triage` skills.

## Tools

### `work__setup`

Create a worktree and tmux window for a Linear ticket. Fetches the ticket, creates a branch, opens a new tmux window with pi, assigns the ticket, and moves it to In Progress.

| Param | Type | Required | Description |
|---|---|---|---|
| `identifier` | string | yes | Linear ticket ID, e.g. `RVR-123` |
| `brainstorm` | boolean | no | Launch pi with `/brainstorm` (default: `true`) |
| `planAfterBrainstorm` | boolean | no | Chain `/writing-plans` after brainstorm (default: `false`) |

**What it does:**

1. Fetches ticket details from Linear
2. Detects the repo's default branch (`main`/`master`)
3. Generates branch name: `frm/<ticket-id>/<slug>`
4. Creates a new tmux window in the current session
5. Runs `g co <default-branch> && g wt <branch-name> && pi` (with brainstorm prompt if enabled)
6. Assigns the ticket to you (using `user-id` from auth.json) if not already assigned
7. Moves the ticket to In Progress

## Auth Config

Reads Linear credentials from `~/.pi/agent/auth.json` via `readAuth("linear")`:

```json
{
  "linear": {
    "api-key": "lin_api_...",
    "user-id": "..."
  }
}
```
