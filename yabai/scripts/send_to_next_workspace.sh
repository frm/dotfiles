#!/usr/bin/env sh

spaces=$(yabai -m query --spaces)
spaces_len=$(echo $spaces | jq length)
current_idx=$(echo $spaces | jq -c 'to_entries[] | select(.value.focused == 1) | .key')
next_idx=$((($current_idx + 1) % $spaces_len))
workspace_idx=$(echo $spaces | jq "nth($next_idx) | .index")

# Call applescript to move to that workspace
keycode=$(( next_idx > current_idx ? 124 : 123 ))
osascript -e "tell app \"System Events\" to key code $keycode using {control down}" &

# Send window to next workspace
yabai -m window --space $workspace_idx &
