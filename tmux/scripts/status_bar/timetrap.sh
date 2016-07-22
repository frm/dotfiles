#!/bin/sh
# Modified version of @naps62 script:
# https://github.com/naps62/dotfiles/blob/a9b27f3e58a7b22ec270f6b099d3c3e9d1cd6823/bin.local/timetrap-tmux-status

timetrap_now=`t n 2> /dev/null`
if [[ "$timetrap_now" =~ \*([a-zA-Z]+)* ]]; then
  project=${BASH_REMATCH[1]}
  echo "#[fg=green] $project #[default]"
else
  echo "#[fg=red] get to work #[default]"
  exit 1
fi
