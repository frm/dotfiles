# Based on AVIT ZSH Theme

CURR_DIR="%{$fg[red]%}%3~%{$reset_color%}"
USER_HOST="%{$fg[blue]%}%n%{$reset_color%} at %{$fg[white]%}%m%{$reset_color%}"

PROMPT='
$USER_HOST in $CURR_DIR $(_git_info)
  › '

PROMPT2='  ›%{$fg[red]%}› %{$reset_color%} '

RPROMPT='$(_ruby_version)'

function _ruby_version() {
 rb=$(rbenv version | awk '{ print $1 }')
 echo "%{$fg[red]%}rb: $rb%{$reset_color%}"
}

function _git_info() {
  if git rev-parse --git-dir > /dev/null 2>&1; then
    echo ":: git:($(_git_branch) | $(_git_time_since_commit) |$(parse_git_dirty))"
  fi
}

# Get current git branch
# git zsh plugin function
function _git_branch() {
  ref=$(git symbolic-ref HEAD 2> /dev/null) || \
  ref=$(git rev-parse --short HEAD 2> /dev/null) || return
  echo ${ref#refs/heads/}
}

# Determine the time since last commit. If branch is clean,
# use a neutral color, otherwise colors will vary according to time.
function _git_time_since_commit() {
  # Only proceed if there is actually a commit.
  if [[ $(git log 2>&1 > /dev/null | grep -c "^fatal: bad default revision") == 0 ]]; then
    # Get the last commit.
    last_commit=$(git log --pretty=format:'%at' -1 2> /dev/null)
    now=$(date +%s)
    seconds_since_last_commit=$((now-last_commit))

    # Totals
    minutes=$((seconds_since_last_commit / 60))
    hours=$((seconds_since_last_commit/3600))

    # Sub-hours and sub-minutes
    days=$((seconds_since_last_commit / 86400))
    sub_hours=$((hours % 24))
    sub_minutes=$((minutes % 60))
    if [ $hours -gt 24 ]; then
      commit_age="${days}d"
      color=$ZSH_THEME_GIT_TIME_SINCE_COMMIT_LONG
    elif [ $minutes -gt 60 ]; then
      commit_age="${sub_hours}h${sub_minutes}m"
      color=$ZSH_THEME_GIT_TIME_SINCE_COMMIT_NEUTRAL
    else
      commit_age="${minutes}m"
      color=$ZSH_THEME_GIT_TIME_SINCE_COMMIT_SHORT
    fi
    echo "$color$commit_age%{$reset_color%}"
  fi
}

if [[ $USER == "root" ]]; then
 CARETCOLOR="red"
else
 CARETCOLOR="white"
fi

MODE_INDICATOR="%{$fg_bold[yellow]%}❮%{$reset_color%}%{$fg[yellow]%}❮❮%{$reset_color%}"

ZSH_THEME_GIT_PROMPT_PREFIX="%{$fg[green]%}"
ZSH_THEME_GIT_PROMPT_SUFFIX="%{$reset_color%}"

ZSH_THEME_GIT_PROMPT_DIRTY=" %{$fg[red]%}✗%{$reset_color%}"
ZSH_THEME_GIT_PROMPT_CLEAN=" %{$fg[green]%}✔%{$reset_color%}"
ZSH_THEME_GIT_PROMPT_ADDED="%{$fg[green]%}✚ "
ZSH_THEME_GIT_PROMPT_MODIFIED="%{$fg[yellow]%}⚑ "
ZSH_THEME_GIT_PROMPT_DELETED="%{$fg[red]%}✖ "
ZSH_THEME_GIT_PROMPT_RENAMED="%{$fg[blue]%}▴ "
ZSH_THEME_GIT_PROMPT_UNMERGED="%{$fg[yellow]%}§ "
ZSH_THEME_GIT_PROMPT_UNTRACKED="%{$fg[white]%}◒ "

# Colors vary depending on time lapsed.
ZSH_THEME_GIT_TIME_SINCE_COMMIT_SHORT="%{$fg[green]%}"
ZSH_THEME_GIT_TIME_SHORT_COMMIT_MEDIUM="%{$fg[yellow]%}"
ZSH_THEME_GIT_TIME_SINCE_COMMIT_LONG="%{$fg[red]%}"
ZSH_THEME_GIT_TIME_SINCE_COMMIT_NEUTRAL="%{$fg[white]%}"

export LSCOLORS="exfxcxdxbxegedabagacad"
# export LS_COLORS='di=34;34:ln=35;35:so=32;32:pi=33;33:ex=31;31:bd=34;46:cd=34;43:su=0;41:sg=0;46:tw=0;42:ow=0;43:'
# export GREP_COLOR='1;33'
