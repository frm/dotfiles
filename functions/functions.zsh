#!/bin/env zsh

# cd to a directory and ls
cdl() {
    if [ "$#" -eq "0" ]; then
        cd $HOME
    else
        cd $@
    fi

    ls
}

# mkdir and cd to it
mkcd() {
  mkdir -p $@
  cd $@
}

# Search the tree for files and open them in $EDITOR
f() {
  file=$(fzf)

  if [ ! -z $file ]; then
    $EDITOR $file
  fi
}

# Create a tmux session named after the current directory
t() {
  local session_name=$(basename `pwd`)
  local attach
  local target_name

  while test $# -gt 0; do
    case "$1" in
      -s)
        shift
        session_name=$1
        shift
        ;;
      -t)
        shift
        attach=true
        target_name=$1
        shift
        ;;
    esac
  done

  if [ $attach ]; then
    tmux new-session -s $session_name -t $target_name
  else
    tmux new-session -s $session_name
  fi
}

# git clone a repo and cd to it
# This needs to be a function to change the current environment
alias gcl="git-clone-cd"

git-clone-cd() {
  if which hub &> /dev/null; then
    git="hub"
  else
    git="git"
  fi

  $git clone $@

  if [[ $? -eq 0 ]]; then
    repo=$(echo $@ | awk -F / '{ print $NF }' | sed 's/.git//g')
    cd $repo
  fi
}

x() {
  if [ -f $1 ]; then
    case $1 in
      *.tar.bz2)   tar xvjf $1    ;;
      *.tar.gz)    tar xvzf $1    ;;
      *.tar.xz)    tar xvJf $1    ;;
      *.bz2)       bunzip2 $1     ;;
      *.rar)       unrar x $1     ;;
      *.gz)        gunzip $1      ;;
      *.tar)       tar xvf $1     ;;
      *.tbz2)      tar xvjf $1    ;;
      *.tgz)       tar xvzf $1    ;;
      *.zip)       unzip $1       ;;
      *.Z)         uncompress $1  ;;
      *.7z)        7z x $1        ;;
      *.xz)        unxz $1        ;;
      *.exe)       cabextract $1  ;;
      *.ace)       unace $1       ;;
      *.arj)       unarj $1       ;;
      *)           echo "'$1': unrecognized file compression" ;;
    esac
  else
    echo "'$1' is not a valid file"
  fi
}

...() {
  cd $(git rev-parse --show-toplevel)
}

tw() {
  if ! tmux has-session -t twttr &>/dev/null; then
    tmux new -d -s twttr &>/dev/null
    tmux send-keys -t twttr:1 rainbowstream ENTER
  fi

  if [ -n "$TMUX" ]; then
    tmux switch-client -t twttr
  else
    tmux attach -t twttr
  fi
}

irc() {
  if ! tmux has-session -t irc &>/dev/null; then
    tmux new -d -s irc &>/dev/null
    tmux send-keys -t irc:1 irssi ENTER
  fi

  if [ -n "$TMUX" ]; then
    tmux switch-client -t irc
  else
    tmux attach -t irc
  fi
}

mutilate() {
  ps aux \
    | ag $1 \
    | ag -v "ag $1" \
    | tr -s " " \
    | cut -d ' ' -f 2 \
    | tee >(awk '{ print "mutilating " $0 }' > /dev/tty) \
    | xargs kill -9
}

rk() {
  if [[ -x bin/rails && "$(bin/rails -v)" =~ "Rails 5" ]]; then
    _mnds_pp_info "rk" "using bin/rails..."
    bin/rails $@
  elif [ -f Gemfile ]; then
    _mnds_pp_info "rk" "using bundle rake..."
    bundle exec rake $@
  else
    _mnds_pp_info "rk" "using standalone rake..."
    rake $@
  fi
}

phx() {
  if _mnds_not_installed "mix"; then
    _mnds_pp_error "phx" "mix not installed"
    return 1
  fi

  mix phx."$@"
}

party() {
  if _mnds_not_installed "curl"; then
    _mnds_pp_error "party" "to party you must install curl"
    return 1
  fi

  curl parrot.live
}

theme() {
  export MNDS_THEME=$1
  echo -e "\033]50;SetProfile=$1\a"
}

# private functions ahead, only used by personal scripts
_COLOR_BLUE='\033[1;34m'
_COLOR_GREEN='\033[1;32m'
_COLOR_RED='\033[1;91m'
_COLOR_RESET='\033[0m'

_mnds_pp() {
  echo "$1[$2]: $3${_COLOR_RESET}\n"
}

_mnds_pp_info() {
  _mnds_pp $_COLOR_BLUE "$1" "$2"
}

_mnds_pp_success() {
  _mnds_pp $_COLOR_GREEN "$1" "$2"
}

_mnds_pp_error() {
  _mnds_pp $_COLOR_RED "$1" "$2"
}

_mnds_pp_neutral() {
  _mnds_pp $_COLOR_RESET "$1" "$2"
}

_mnds_not_installed() {
  [ ! -x "$(command -v "$@")" ]
}

_mnds_ensure_confirmation() {
  read -r "confirmation?please confirm you want to continue [y/n] (default: y)"
  confirmation=${confirmation:-"y"}

  if [ "$confirmation" != "y" ]; then
    exit 1
  fi
}
