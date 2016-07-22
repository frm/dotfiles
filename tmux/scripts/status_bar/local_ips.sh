ifconfig en0 | awk '$1 == "inet" { print $2 }'
