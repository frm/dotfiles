# Shell-specific config options

# Enable comments in shell and history
setopt interactivecomments

# Prompt settings
COMPLETION_WAITING_DOTS=true
ENABLE_CORRECTION=false

# History settings

export HISTFILE="$HOME/.zhistory"
export HIST_STAMPS="dd.mm.yyyy"
export HISTSIZE=10000000
export SAVEHIST=10000000

setopt HIST_FIND_NO_DUPS
setopt EXTENDED_HISTORY
setopt INC_APPEND_HISTORY
setopt SHARE_HISTORY
setopt HIST_REDUCE_BLANKS
