# Shell-specific config options

# Enable comments in shell and history
setopt interactivecomments

# Prompt settings
ENABLE_CORRECTION=false

# History settings
export HISTFILE="$HOME/.zhistory"
export HISTSIZE=10000000
export SAVEHIST=10000000

setopt HIST_FIND_NO_DUPS
setopt EXTENDED_HISTORY
setopt INC_APPEND_HISTORY
setopt SHARE_HISTORY
setopt HIST_REDUCE_BLANKS

alias history="fc -El 1"

unsetopt beep
setopt long_list_jobs

export LESS_TERMCAP_so=$'\E[01;33;03;40m'
