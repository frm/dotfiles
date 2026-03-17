# Ping

Notifies the user with a sound and macOS notification banner. Used when the user says "ping me when ready" — the agent calls `ping()` when the task completes.

## Tool

| Tool | Description |
|------|-------------|
| `ping` | Play notification sound + show macOS banner. Params: `{ message: string }` |

## Effects

- Plays `/System/Library/Sounds/Purr.aiff` via `afplay`
- Shows macOS notification banner via `osascript`

## Notes

- macOS-only (uses `afplay` and `osascript`)
- Stateless — no config, no persistence
- Agent must be explicitly told to ping (no auto-detection)
