export ZSH=$HOME/.oh-my-zsh
ZSH_THEME="aviato"
ENABLE_CORRECTION="true"
COMPLETION_WAITING_DOTS="true"

# Uncomment the following line if you want to disable marking untracked files
# under VCS as dirty. This makes repository status check for large repositories
# much, much faster.
# DISABLE_UNTRACKED_FILES_DIRTY="true"

HIST_STAMPS="dd.mm.yyyy"

# Base16 Shell
BASE16_SHELL="$HOME/.config/base16-shell/base16-default.dark.sh"
[[ -s $BASE16_SHELL ]] && source $BASE16_SHELL

export PATH="/Users/mendes/local/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
source $ZSH/oh-my-zsh.sh
export EDITOR='vim'

# Loading personal commands
source $HOME/local/zsh/aliases

# Loading execs from ~/local/bin
export PATH="$HOME/local/bin:${PATH}"

# Loading zsh-syntax-highlight
source $ZSH/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh

export PATH=/Users/mendes/local/bin:/Users/mendes/local/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/mysql/bin:$PATH

# Loading rbenv
eval "$(rbenv init -)"

# Loading nvm
source ~/.nvm/nvm.sh

MYSQL=/usr/local/mysql/bin
export PATH=$PATH:$MYSQL
export DYLD_LIBRARY_PATH=/usr/local/mysql/lib:$DYLD_LIBRARY_PATH
