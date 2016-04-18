# Loading Antigen
ANTIGEN=$HOME/.antigen
source $ANTIGEN/antigen.zsh

# Load oh-my-zsh's library
antigen use oh-my-zsh

# Fish-like syntax highlighting
antigen bundle zsh-users/zsh-syntax-highlighting
#antigen bundle marzocchi/zsh-notify

# Theming
antigen theme $ANTIGEN/themes geometry

# Custom variables
COMPLETION_WAITING_DOTS="true"
HIST_STAMPS="dd.mm.yyyy"
ENABLE_CORRECTION="false"

antigen apply

export EDITOR='nvim'

# Loading execs from ~/local/bin
export PATH="$HOME/local/bin:${PATH}"

# Loading personal commands
source $HOME/local/aliases

# Loading local postgresql commands
source $HOME/local/initpsql.sh

# Base16 Shell
#BASE16_SCHEME="ocean"
#BASE16_SHELL="$HOME/.config/base16-shell/base16-$BASE16_SCHEME.dark.sh"
#[[ -s $BASE16_SHELL ]] && . $BASE16_SHELL
export TERM=xterm-256color

# Remove annoying deprecated warning
unset GREP_OPTIONS

# Loading nvm
source ~/.nvm/nvm.sh

# Loading rbenv
export PATH="$HOME/.rbenv/bin:$PATH"
eval "$(rbenv init - --no-rehash)"

# Loading tmuxinator
source ~/local/bin/tmuxinator.zsh

# Use mux given window names
export DISABLE_AUTO_TITLE=true

# z
. `brew --prefix`/etc/profile.d/z.sh

# Loading pyenv
if which pyenv > /dev/null; then eval "$(pyenv init -)"; fi
