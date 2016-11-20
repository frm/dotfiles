# Tab completion from both ends
setopt completeinword

# Case-insensitive tab completion
zstyle ':completion:*' matcher-list 'm:{a-zA-Z}={A-Za-z}'
#
# pasting with tabs doesn't perform completion
zstyle ':completion:*' insert-tab pending

# Use menu selection instead of tab cycle
zstyle ':completion:*' menu select

# list-colors when completing
zstyle ':completion:*:default' list-colors ${(s.:.)LS_COLORS}

source $DOTFILES/completions/tmuxinator.zsh

fpath=($DOTFILES/completions $fpath)
