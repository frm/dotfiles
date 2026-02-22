---
name: speech
description: Toggle speech mode for Claude responses. Use when user says "/speech", "turn on speech", "stop talking", etc.
---

# Speech Mode Toggle

Toggle text-to-speech for Claude's responses using macOS `say` command.

## Commands

- `/speech on` or "turn on speech" - Enable TTS
- `/speech off` or "stop talking" - Disable TTS
- `/speech` - Show current state and toggle options

## Process

1. Check current state: `[ -f /tmp/claude/.claude-speak ] && echo "Speech is ON" || echo "Speech is OFF"`
2. To enable: `touch /tmp/claude/.claude-speak`
3. To disable: `~/.dotfiles/ai/bin/speech-off`

After any toggle, confirm the new state to the user briefly.

## Notes

- Speech runs in background and doesn't block Claude
- Uses macOS built-in `say` command
- Requires `jq` for JSON parsing
