#!/bin/bash

ROOT_COLOR="#[fg=red]"
SEPARATOR_COLOR="#[fg=white]"
HOSTNAME_COLOR="#[fg=green]"
ONLY_ROOT=1
ONLY_SSH=1

#SSH_SESSION=`ps aux | grep ssh | awk '$11 == "ssh" { print $12 }'`
SSH_CMD=`tmux display-message -p "#{pane_current_command}"`
ACTIVE_SSH=0; [ "$SSH_CMD" == "ssh" ] && ACTIVE_SSH=1

display() {
  case $1 in
    "root")
      echo "$ROOT_COLOR$1$SEPARATOR_COLOR@$HOSTNAME_COLOR$2$ $SEPARATOR_COLOR:: "
      ;;
    *)
      if [ $ONLY_ROOT -eq 0 ] || [ $ACTIVE_SSH -eq 1 ];
      then
        echo "$1$SEPARATOR_COLOR@$HOSTNAME_COLOR$2 $SEPARATOR_COLOR:: "
      fi
      ;;
  esac
}

handle_ssh() {
  local ssh_cmd=$(pgrep -flP `tmux display-message -p "#{pane_pid}"` | sed -E 's/^[0-9]+ ssh //')

  local ssh_user=$(echo $ssh_cmd | awk '{print $NF}'|cut -f1 -d@)
  local ssh_host=$(echo $ssh_cmd | awk '{print $NF}'|cut -f2 -d@)

  display $ssh_user $ssh_host
}

if [ $ACTIVE_SSH -eq 1 ];
then
  handle_ssh
elif [ $ONLY_SSH -eq 0 ] || [ `whoami` == "root" ];
then
  display `whoami` `hostname`
fi

