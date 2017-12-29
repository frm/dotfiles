autoload -U add-zsh-hook
add-zsh-hook precmd prompt_render

GEOMETRY_COLOR_GIT_BRANCH=239
GEOMETRY_GIT_NO_COMMITS_MESSAGE="?"
GEOMETRY_COLOR_TIME=4
GEOMETRY_COLOR_TIME_SHORT=10
GEOMETRY_COLOR_TIME_NEUTRAL=15
GEOMETRY_COLOR_TIME_LONG=9
GEOMETRY_COLOR_NO_TIME=9

-prompt_geometry_time_short_format() {
  local human=""
  local color=""
  local days=$1
  local hours=$2
  local minutes=$3
  local seconds=$4

  if (( days > 0 )); then
    human="${days}d"
    color=$GEOMETRY_COLOR_TIME_LONG
  elif (( hours > 0 )); then
    human="${hours}h"
    color=${color:-$GEOMETRY_COLOR_TIME_NEUTRAL}
  elif (( minutes > 0 )); then
    human="${minutes}m"
    color=${color:-$GEOMETRY_COLOR_TIME_SHORT}
  else
    human="${seconds}s"
    color=${color:-$GEOMETRY_COLOR_TIME_SHORT}
  fi

  geometry_time_color=$color
  geometry_time_human=$human
}

prompt_geometry_seconds_to_human_time() {
  local total_seconds=$1
  local long_format=$2

  local days=$(( total_seconds / 60 / 60 / 24 ))
  local hours=$(( total_seconds / 60 / 60 % 24 ))
  local minutes=$(( total_seconds / 60 % 60 ))
  local seconds=$(( total_seconds % 60 ))

  # It looks redundant but it seems it's not
  if [[ $long_format == true ]]; then
    -prompt_geometry_time_long_format $days $hours $minutes $seconds
  else
    -prompt_geometry_time_short_format $days $hours $minutes $seconds
  fi

  echo "$(prompt_geometry_colorize $geometry_time_color $geometry_time_human)"
}

prompt_geometry_git_time_since_commit() {
  # Defaults to "", which would hide the git_time_since_commit block
  local git_time_since_commit=""

  # Get the last commit.
  local last_commit=$(git log -1 --pretty=format:'%at' 2> /dev/null)
  if [[ -n $last_commit ]]; then
      now=$(date +%s)
      seconds_since_last_commit=$((now - last_commit))
      git_time_since_commit=$(prompt_geometry_seconds_to_human_time $seconds_since_last_commit false)
  else
      git_time_since_commit=$(prompt_geometry_colorize $GEOMETRY_COLOR_TIME $GEOMETRY_GIT_NO_COMMITS_MESSAGE)
  fi

  echo $git_time_since_commit
}

prompt_geometry_git_branch() {
  ref=$(git symbolic-ref --short HEAD 2> /dev/null) || \
  ref=$(git rev-parse --short HEAD 2> /dev/null) || return
  echo "$(prompt_geometry_colorize $GEOMETRY_COLOR_GIT_BRANCH "($ref)")"
}

prompt_geometry_colorize() {
  echo "%F{$1}$2%f"
}

prompt_git_stuff() {
  if git rev-parse --git-dir > /dev/null 2>&1 ; then
    echo "$(prompt_geometry_git_branch) $(prompt_geometry_git_time_since_commit) "
  fi
}

prompt_render() {
  PROMPT="%F{7}%2~%f $(prompt_git_stuff)"
}
