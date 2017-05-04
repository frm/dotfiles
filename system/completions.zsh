# Tab completion from both ends
setopt completeinword

# Case-insensitive tab completion
zstyle ':completion:*' matcher-list 'm:{a-zA-Z-_}={A-Za-z_-}' 'r:|=*' 'l:|=* r:|=*'

setopt nocasematch

# pasting with tabs doesn't perform completion
zstyle ':completion:*' insert-tab pending

# Use menu selection instead of tab cycle
zstyle ':completion:*:*:*:*:*' menu select

# list-colors when completing
zstyle ':completion:*' list-colors "${(@s.:.)LS_COLORS}"
zstyle ':completion:*:*:kill:*:processes' list-colors '=(#b) #([0-9]#) ([0-9a-z-]#)*=01;34=0=01'

if [[ $(uname) == "Linux" ]]; then
  source $DOTFILES/completions/tmuxinator.zsh
fi

autoload -Uz compinit && compinit

fpath=($DOTFILES/completions $fpath)
