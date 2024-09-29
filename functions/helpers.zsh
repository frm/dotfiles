#!/usr/bin/env zsh

# private functions only used by personal scripts
export MNDS_FMT_BOLD=`tput bold`
export MNDS_FMT_RESET=`tput sgr0`
export MNDS_FMT_RED=`tput setaf 1`
export MNDS_FMT_GREEN=`tput setaf 2`
export MNDS_FMT_YELLOW=`tput setaf 3`
export MNDS_FMT_BLUE=`tput setaf 4`
export MNDS_FMT_MAGENTA=`tput setaf 5`
export MNDS_FMT_CYAN=`tput setaf 6`
export MNDS_FMT_WHITE=`tput setaf 7`

_mnds_pp() {
  echo "${MNDS_FMT_BOLD}$1[$2]${MNDS_FMT_RESET}$1: $3${MNDS_FMT_RESET}"
}

_mnds_pp_info() {
  _mnds_pp $MNDS_FMT_BLUE "$1" "$2"
}

_mnds_pp_success() {
  _mnds_pp $MNDS_FMT_GREEN "$1" "$2"
}

_mnds_pp_error() {
  _mnds_pp $MNDS_FMT_RED "$1" "$2"
}

_mnds_pp_warn() {
  _mnds_pp $MNDS_FMT_YELLOW "$1" "$2"
}

_mnds_pp_neutral() {
  _mnds_pp $MNDS_FMT_WHITE "$1" "$2"
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
