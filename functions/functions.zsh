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
  if [ $# -eq 0 ]; then
    SESSION_NAME=$(basename `pwd`)
  else
    SESSION_NAME=$1
  fi

  tmux new -s $SESSION_NAME;
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

  repo=$(echo $@ | awk -F / '{ print $NF }' | sed 's/.git//g')
  cd $repo
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
