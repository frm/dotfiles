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

# Create a tmux session named after the current directory
t() {
  if [ $# -eq 0 ]; then
    SESSION_NAME=$(basename `pwd`)
  else
    SESSION_NAME=$1
  fi

  tmux new -s $SESSION_NAME;
}
