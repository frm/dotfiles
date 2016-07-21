# Tab completion from both ends
setopt completeinword

# Case-insensitive tab completion
zstyle ':completion:*' matcher-list 'm:{a-zA-Z}={A-Za-z}'

# Use menu selection instead of tab cycle
zstyle ':completion:*' menu select

# list-colors when completing
zstyle ':completion:*:default' list-colors ${(s.:.)LS_COLORS}

# Loading tmuxinator completion
source $DOTFILES/completions/tmuxinator.zsh

# hub completion
fpath=(~/.zsh/completions $fpath)
