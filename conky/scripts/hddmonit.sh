#!/bin/bash
echo "$(nc localhost 7634 | cut -d'|' -f4)"
