#!/usr/bin/env sh

if pgrep yabai &> /dev/null; then
  yabai -m window --toggle zoom-fullscreen
else
  osascript -e 'tell app "BetterTouchTool" to trigger_named_async_without_response "MaximizeWindow"'
fi
