# Loading Antigen
ANTIGEN=$HOME/.antigen/antigen
source $ANTIGEN/antigen.zsh

# Load oh-my-zsh's library
antigen use oh-my-zsh

# Fish-like syntax highlighting
antigen bundle zsh-users/zsh-syntax-highlighting

# Theming
antigen theme $ANTIGEN/themes aviato

# Custom variables
COMPLETION_WAITING_DOTS="true"
HIST_STAMPS="dd.mm.yyyy"
ENABLE_CORRECTION="false"

antigen apply

# Loading personal commands
source $HOME/local/aliases

# Loading execs from ~/local/bin
export PATH="$HOME/local/bin:${PATH}"

# Base16 Shell
BASE16_SCHEME="ocean"
BASE16_SHELL="$HOME/.config/base16-shell/base16-$BASE16_SCHEME.dark.sh"
[[ -s $BASE16_SHELL ]] && . $BASE16_SHELL

# Loading nvm
source ~/.nvm/nvm.sh

# Linux specific settings
if [ $(uname)="Linux" ]; then
    export PATH="$PATH:/home/frmendes/.rvm/gems/ruby-2.1.2/bin:/home/frmendes/.rvm/gems/ruby-2.1.2@global/bin:/home/frmendes/.rvm/rubies/ruby-2.1.2/bin:/home/frmendes/local/bin:/usr/local/sbin:/usr/local/bin:/usr/bin:/usr/bin/core_perl"

    # Add RVM to PATH for scripting
    export PATH="$PATH:$HOME/.rvm/bin"

    # Remove annoying deprecated warning
    unset GREP_OPTIONS

    # Loading nvm
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

    # 256 colorspace
    export TERM=xterm-256color

    # Rust support
    export LD_LIBRARY_PATH=${LD_LIBRARY_PATH}:/usr/local/lib

    # Java pretty fonts
    export _JAVA_OPTIONS="-Dswing.aatext=TRUE -Dawt.useSystemAAFontSettings=on"

# OS X specific settings
else
    # Loading rbenv
    eval "$(rbenv init -)"
fi
