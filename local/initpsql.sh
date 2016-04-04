#!/bin/bash

export LOCAL_PSQL=$HOME/UMinho/MSc/EA/DBA/dbs/

initpsql() {
  if [ "$#" -ne 1 ]; then
    echo "ERROR: Wrong number of arguments given."
    return
  fi

  tmux new -s "_psql_$1" -d
  tmux send-keys -t "_psql_$1" "_init_psql $1" C-m

  echo "Running tmux session on _psql_$1."
}

function _init_psql {
  echo "### Changing to local psql directory..."
  echo "> cd $LOCAL_PSQL\n"

  cd $LOCAL_PSQL

  if [ ! -d $1 ]; then
    echo "### Local database cluster not found. Creating..."
    echo "> initdb -D $1\n\n"
    initdb -D $1
  fi

  echo "\n\n> postgres -D $1 -k.\n"
  postgres -D $1 -k.
}

