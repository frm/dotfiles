# Load custom git completions
source $DOTFILES/git/completions.zsh

# Load custom git commands
export PATH="$PATH:$DOTFILES/git/bin"

# Sets up user.email and user.signingkey to values set by env vars.
#
# Before using git set GIT_EMAIL and GIT_SIGNING_KEY in
# system/secrets.init
export GIT_CONFIG_COUNT=2
export GIT_CONFIG_KEY_0="user.email"
export GIT_CONFIG_VALUE_0=$GIT_EMAIL
export GIT_CONFIG_KEY_1="user.signingkey"
export GIT_CONFIG_VALUE_1=$GIT_SIGNING_KEY
