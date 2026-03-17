# Custom Instructions Extension

Reads `~/.pi/agent/instructions.md` and appends its contents to the system prompt on every session start. Edit the markdown file to change agent behavior without touching code.

## How it works

On `before_agent_start`, the extension checks for `~/.pi/agent/instructions.md`. If the file exists and is non-empty, its contents are appended to the system prompt. If the file doesn't exist or is empty, nothing happens.
