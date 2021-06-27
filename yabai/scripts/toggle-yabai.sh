#!/usr/bin/env sh

if pgrep yabai &> /dev/null; then
  brew services stop yabai
else
  brew services start yabai
fi
