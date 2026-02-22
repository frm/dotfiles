#!/bin/bash
# Speaks Claude's response using macOS say command
# Toggle: touch /tmp/claude/.claude-speak to enable, rm /tmp/claude/.claude-speak to disable

# Check if speech is enabled (file exists or env var set)
if [ ! -f "/tmp/claude/.claude-speak" ] && [ "$CLAUDE_SPEAK" != "1" ]; then
  exit 0
fi

# Read the JSON input from stdin
input=$(cat)

# Extract the transcript path from the hook data
transcript_path=$(echo "$input" | jq -r '.transcript_path // empty')

if [ -z "$transcript_path" ] || [ ! -f "$transcript_path" ]; then
  exit 0
fi

# Get the last assistant message from the JSONL transcript
# Each line is a JSON object, we want the last assistant message
last_message=$(tail -20 "$transcript_path" | grep '"type":"assistant"' | tail -1 | jq -r '.message.content[] | select(.type == "text") | .text' 2>/dev/null)

if [ -z "$last_message" ]; then
  exit 0
fi

# Write to temp file to handle long/multi-line text and avoid shell argument limits
temp_file="/tmp/claude/.claude-speak-text"
# Strip any leading dashes to prevent option injection
echo "${last_message#-}" > "$temp_file"

# Speak the message (fully detached so it doesn't block the hook)
nohup say -f "$temp_file" >/dev/null 2>&1 &
disown

exit 0
