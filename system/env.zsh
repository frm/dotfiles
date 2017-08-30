# Custom variables
export LC_ALL=en_US.UTF-8
export LANG=en_US.UTF-8
export EDITOR='nvim'

# Set TERM to screen-256color to allow neovim to capture <M-BS>
# Don't forget to remove the 'screen' if branch in the base16 theme script
export TERM=screen-256color

# Loading global env variables
source $HOME/.env_global

# Load direnv
eval "$(direnv hook zsh)"
