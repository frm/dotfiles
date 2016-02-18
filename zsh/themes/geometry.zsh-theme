# Based on AVIT ZSH Theme

PROMPT='
 ▲ %{$fg[blue]%}%3~%{$reset_color%} '

function _frm_git_branch() {
  if git rev-parse --gi-dir > /dev/null 2>&1; then
    echo "on "
  fi
}

PROMPT2=' ◇ '


RPROMPT='$(_git_info)'

function _git_info() {
  if git rev-parse --git-dir > /dev/null 2>&1; then
    echo "\uE0A0 %{$fg[yellow]%}$(_git_branch)%{$reset_color%} :: $(_git_time_since_commit) :: $(parse_git_dirty)"
  fi
}

# Get current git branch
# git zsh plugin function
function _git_branch() {
  ref=$(git symbolic-ref HEAD 2> /dev/null) || \
  ref=$(git rev-parse --short HEAD 2> /dev/null) || return
  echo "${ref#refs/heads/}"
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

ZSH_THEME_GIT_PROMPT_DIRTY="%{$fg[red]%}⬡%{$reset_color%}"
ZSH_THEME_GIT_PROMPT_CLEAN="%{$fg[green]%}⬢%{$reset_color%}"
ZSH_THEME_GIT_PROMPT_ADDED="%{$fg[green]%}◙ "
ZSH_THEME_GIT_PROMPT_MODIFIED="%{$fg[yellow]%}◈ "
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
