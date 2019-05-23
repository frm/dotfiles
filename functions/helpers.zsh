#!/usr/bin/env zsh

# private functions only used by personal scripts
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
