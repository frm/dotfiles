#!/bin/env zsh

source $DOTFILES/functions/helpers.zsh

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

# cd to Downloads
downl() {
  cd $HOME/Downloads
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
      *)
        _mnds_pp_error "t" "invalid flags. use: -t [target] | -s [name]"
        return 1
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
  if which gh &> /dev/null; then
    gh repo clone $@
  else
    git clone
  fi

  if [[ $? -eq 0 ]]; then
    dir=$(echo "$@" | awk -F / '{ print $NF }' | sed 's/.git//g' | cut -d ' ' -f 2)
    cd $dir
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

twcd() {
  if [[ -z $TMUX ]]; then
    _mnds_pp_error "tcd" "error: not in tmux"
    return 1
  fi

  tmux command -I "attach -c $PWD"
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
    | rg $1 \
    | rg -v "rg $1" \
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

  if [ $# -eq 0 ]; then
    mix phx
  else
    mix phx."$@"
  fi
}

party() {
  if _mnds_not_installed "curl"; then
    _mnds_pp_error "party" "to party you must install curl"
    return 1
  fi

  curl parrot.live
}

pgw() {
  if _mnds_not_installed "pgweb"; then
    _mnds_pp_error "pgw" "pgweb not installed"
    return 1
  fi

  db="${PGW_DB:-$(basename $(pwd))_dev}"
  user=${PGW_USER:-postgres}
  host=${PGW_HOST:-localhost}

  pgweb --host "$host" --user "$user" --db "$db"
}

s() {
  if [ -f bin/server ]; then
    bin/server
  elif [ -f mix.exs ]; then
    _mnds_pp_info "s" "starting phx.server..."
    iex -S mix phx.server
  elif [ -f bin/rails ]; then
    _mnds_pp_info "s" "starting rails server..."
    bin/rails s
  elif [ -f Gemfile ]; then
    _mnds_pp_info "s" "starting rails server..."
    bundle exec rails s
  elif [ -f next.config.js ]; then
    _mnds_pp_info "s" "starting next.js server..."
    yarn dev
  elif [ -f package.json ]; then
    _mnds_pp_info "s" "running npm start..."
    npm start
  elif [ -f Cargo.toml ]; then
    _mnds_pp_info "s" "running cargo..."
    cargo run
  elif [ -f go.mod ]; then
    _mnds_pp_info "s" "running go..."
    go run .
  elif [ -f main.go ]; then
    _mnds_pp_info "s" "running go..."
    go run main.go
  else
    _mnds_pp_error "s" "no server found"
    return 1
  fi
}

l() {
  if [ -f bin/lint ]; then
    bin/lint
  elif [ -f mix.exs ]; then
    _mnds_pp_info "l" "running mix lint..."
    iex -S mix lint
  else
    _mnds_pp_error "l" "no valid linters found"
    return 1
  fi
}

cn() {
  if [ -f bin/console ]; then
    bin/console
  elif [ -f mix.exs ]; then
    _mnds_pp_info "cn" "starting iex console..."
    iex -S mix
  elif [ -f Gemfile ]; then
    _mnds_pp_info "cn" "starting pry console..."
    pry
  elif [ -f package.json ]; then
    _mnds_pp_info "cn" "running node console..."
    node
  else
    _mnds_pp_error "cn" "no console found"
    return 1
  fi
}

battery_status() {
  pmset -g batt | awk -F '; *' 'NR==2 { print $2 }'
}

battery_percentage() {
  pmset -g batt | rg -o "[0-9]{1,3}%"
}

battery_charge_remaining() {
  pmset -g batt | rg -o "[0-9]+:[0-9]+"
}

battery() {
  echo "$(battery_status): $(battery_percentage) ($(battery_charge_remaining) remaining)"
}

cs_extensions() {
  case "$1" in
    "export")
      shift
      cs_extensions_export $@
      ;;
    "install")
      cs_extensions_install $@
      ;;
    *)
      pp_error "cs" "invalid subcommand: $1. supported: [export, install]"
    esac
}

cs_extensions_export() {
  local flag=$1
  local exts=$DOTFILES/cursor/extensions

  if [ -z "$flag" ]; then
      (cat $exts <(cursor --list-extensions) | sort | uniq) > $ext_file
      return 0
  fi

  case "$flag" in
    -f|--force)
      cursor --list-extensions > $exts
      ;;
    *)
      pp_error "cs" "invalid flag: $1. supported: [-f, --force]"
}

cs_extensions_install() {
  local exts=$DOTFILES/cursor/extensions

  if [ ! -f $exts ]; then
    pp_error "cs" "no extensions file found"
    return 1
  fi

  cat $exts | xargs -L 1 code --install-extension
}
