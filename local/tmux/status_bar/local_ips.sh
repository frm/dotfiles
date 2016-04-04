SEPARATOR_COLOR="#[fg=white]"
IP_COLOR="#[fg=yellow]"

ifconfig en0 | awk -v ip="$IP_COLOR" '$1 == "inet" { print ip $2 }' \
  | sed -e ':a' -e 'N' -e '$!ba' -e 's/\n/ '$SEPARATOR_COLOR'> /g'
