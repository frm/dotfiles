alias vw="view"
alias v="nvim"

# Just screw the world
alias vim="nvim"
alias vi="command vim"
alias ireallywantvi="command vi"

alias ls="gls --color -h -F --group-directories-first"

alias g="git"

alias s="bin/server"
alias l="bin/lint"
alias r="rails"
alias b="bundle"
alias be="bundle exec"
alias rk="bundle exec rake"
alias m="mix"
alias mk="make"

alias prod="production"
alias stag="staging"
alias dev="development"

# Create a named tmux session
alias tm="tmux new -s"
alias ta="tmux attach"
alias tat="tmux attach -t"
alias tls="tmux list-sessions"

alias gh="hub browse"

# Workaround while tmuxinator doesn't properly symlink mux
alias mux="tmuxinator"

# postgres on OS X
alias pg.server="pg_ctl -D /usr/local/var/postgres -l /usr/local/var/postgres/server.log"
alias mongo.server="mongod --config /usr/local/etc/mongod.conf"

# vim-like exit
alias :q="exit"

alias cl="clear"

# prolog alias
if which sicstus &> /dev/null;
    then alias prolog="rlwrap sicstus"
fi

# Group ls by name, type & extension
alias ll="ls -lh"

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
