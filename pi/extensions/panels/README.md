# Panels Extension

Orchestrates tmux panes to display persistent context panels alongside the pi terminal. Two panels flank the main window — a Global panel on the left (22% width) and a Local panel on the right (22% width) — each with multiple tabs that update in response to session and tool events. The extension also manages a worktree switcher, popup terminals, and sets the `@pi_state` tmux option so status-bar themes can reflect the agent's current state.

## Tools

None.

## Commands

| Command | Description |
|---|---|
| `/global` | Focus the global left panel |
| `/local` | Focus the local right panel |
| `/panels` | Re-initialize or refresh all panels |

## Shortcuts

| Shortcut | Description |
|---|---|
| `alt+1` – `alt+9` | Switch to worktree 1–9 |
| `alt+g` | Focus / toggle the global left panel |
| `alt+l` | Focus / toggle the local right panel |
| `alt+t` | Open a terminal popup |
| `alt+v` | Open an nvim popup |

## Panels

### Global panel (left, 22%)

Tabs:

| Tab | Description |
|---|---|
| **Worktrees** | Lists git worktrees; selecting one switches context |
| **PRs** | Open pull requests from `gh` (singleton process) |
| **Notifications** | GitHub notifications (singleton process) |

### Local panel (right, 22%)

Tabs:

| Tab | Description |
|---|---|
| **Files** | Changed files in the current worktree |
| **Checks** | CI check statuses for the current branch |
| **Detail** | Contextual detail view (e.g. selected PR or check output) |

## Events

| Event | Effect |
|---|---|
| `session_start` | Initializes both panels, starts `gh` and notifications singletons |
| `session_switch` | Refreshes the local panel to reflect the new worktree context |
| `session_shutdown` | Tears down panels and stops singleton processes |
| Tool events | Panel content updates reactively as the agent invokes tools |

## Notable Behavior

- **`@pi_state` tmux option** — The extension writes the agent's current state (idle, thinking, tool-use, etc.) to the `@pi_state` tmux option so that tmux themes and status-bar scripts can display a visual indicator.
- **Singletons** — The `gh` (pull requests) and notifications processes are started once at session start and kept alive for the duration of the session.
- **Worktree switching** — `alt+1`–`alt+9` map to indexed worktrees listed in the Worktrees tab.

## Config

No configuration options.
