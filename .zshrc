export ZSH=$HOME/.oh-my-zsh
ZSH_THEME="aviato"
ENABLE_CORRECTION="false"
COMPLETION_WAITING_DOTS="true"

HIST_STAMPS="dd.mm.yyyy"

source $ZSH/oh-my-zsh.sh
export EDITOR='vim'

# Loading personal commands
source $HOME/local/aliases

# Loading personal execs
export PATH="$HOME/local/bin:${PATH}"

# Base16 Shell by Chris Kempson
BASE16_THEME="default"
BASE16_SHELL="$HOME/.config/base16-shell/base16-$BASE16_THEME.dark.sh"
[[ -s $BASE16_SHELL ]] && source $BASE16_SHELL

# Loading zsh-syntax-highlight
source $ZSH/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh

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
    export PATH=/Users/frm/local/bin:/Users/frm/local/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/mysql/bin:$PATH

    # Loading rbenv
    eval "$(rbenv init -)"

    # Loading nvm
    source ~/.nvm/nvm.sh

    # MySQL settings
    MYSQL=/usr/local/mysql/bin
    export PATH=$PATH:$MYSQL
    export DYLD_LIBRARY_PATH=/usr/local/mysql/lib:$DYLD_LIBRARY_PATH
fi
