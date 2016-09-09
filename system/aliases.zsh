alias vw="view"
alias v="nvim"

# Just screw the world
alias vim="nvim"
alias vi="command vim"
alias ireallywantvi="command vi"

alias g="git"

alias r="rails"
alias s="bin/server"
alias b="bundle"
alias be="bundle exec"
alias tm="tmux new -s"

alias gh="git-browse" # see bin/git-browse

# Workaround while tmuxinator doesn't properly symlink mux
alias mux="tmuxinator"

# postgres on OS X
alias pg.server="pg_ctl -D /usr/local/var/postgres -l /usr/local/var/postgres/server.log"
alias mongo.server="mongod --config /usr/local/etc/mongod.conf"

# vim-like exit
alias :q="exit"
alias :qa="_qa" # see bin/_qa

alias ta="tmux attach"
alias sr="screen -r"
alias cl="clear"

# irssi please
alias irssi='TERM=screen-256color irssi'

# prolog alias
if which sicstus &> /dev/null;
    then alias prolog="rlwrap sicstus"
fi

# Group ls by name, type & extension
if which gls &> /dev/null;
then
  alias ll="gls -lFX --color"
else
  alias ll="ls -lFX"
fi

# Creating compacted cd ..
alias ..="cdl .."
alias ..2="cdl ../.."
alias ..3="cdl ../../.."
alias ..4="cdl ../../../.."
alias ..5="cdl ../../../../.."

# subl for sublime text
sb () {
    if which subl &> /dev/null;
        then subl $@
    elif which subl3 > /dev/null;
        then subl3 $@
    else
        subl $@ 2>&1 > /dev/null &
    fi
}

# fzf alias
function f () { "$@" | fzf }

# Reloading rc file
reload() {
    eval source $( echo $SHELL | awk -F/ '{ print "$HOME/."$NF"rc" }' )
}

alias rl="reload"
