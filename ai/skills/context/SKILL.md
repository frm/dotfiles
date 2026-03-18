---
name: context
description: Dump or load conversation context for resuming work across sessions. Use when user says "/dump", "/dump <topic>", "/load <topic>", "dump context", or "load context".
---

# Context Dump/Load

Preserve conversation context across pi restarts by dumping structured summaries to disk and loading them back.

## Commands

- `/dump` or `/dump <topic>` — dump current context
- `/load` or `/load <topic>` — load most recent context (infers topic if not provided)

## Dump Process

1. **Determine topic**: Use provided topic, or infer from conversation (e.g., ticket ID, feature name, problem being solved). Keep it short and kebab-case.

2. **Create directory**: `mkdir -p /tmp/pi`

3. **Write file**: `/tmp/pi/<topic>-<timestamp>.md` where timestamp is `YYYYMMDD-HHMMSS`

4. **Structure**:
```markdown
# Context: <topic>

## Problem
What we were trying to solve (1-2 sentences)

## What Was Done
- Bullet points of completed work
- Include file paths for any code changes
- Note any commits made

## Current State
- What's working
- What's broken or untested
- Any blockers

## Next Steps
- What needs to happen next
- Any pending tests or verification

## Key Files
| File | Purpose |
|------|---------|
| path/to/file | Brief description |

## Notes
Any other context that would help resume (error messages, design decisions, etc.)
```

5. **Confirm**: Tell user the file path and topic name for loading later

## Load Process

1. **Determine topic**: Use provided topic, or infer from:
   - Branch name (e.g., `frm/rvr-123/notification-broadcast` → `notification-broadcast`)
   - Linear ticket in branch
   - Current working directory name
   - If multiple candidates, list available dumps in `/tmp/pi/` and ask user to pick

2. **Find file**: `ls -t /tmp/pi/<topic>*.md | head -1` to get most recent match. If no exact match, try partial/fuzzy matching against available files.

3. **Read and summarize**: Read the file, present a brief summary to confirm it's the right context

4. **Resume**: Continue the conversation with full context restored

## Tips

- When dumping, be thorough but concise — future you needs to understand quickly
- Include exact error messages if debugging
- Note which pi instance/window was the leader if relevant to singleton state
- If there are uncommitted changes, list the files
