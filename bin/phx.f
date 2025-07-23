#!/usr/bin/env zsh
#
# finds phoenix routes matching a pattern
# -s (optional): strict match to the existing route
# -v (optional): HTTP verb to query for

source $DOTFILES/functions/helpers.zsh

set -e

zparseopts -D -E -- s=strict v:=verb
shift $(( OPTIND - 1 ))

if _mnds_not_installed "mix"; then
  _mnds_pp_error "phx.f" "mix not installed"
  exit 1
fi

if [ ! -f mix.exs ]; then
  _mnds_pp_error "phx.f" "not in an Elixir project"
  exit 1
fi

pattern="$1"

[[ -n "$strict" ]] && pattern="$1\s"

[[ ${#verb[@]} -gt 1 ]] && pattern="${verb[2]}.*$pattern"

mix phx.routes \
  | rg -e "$pattern" \
  | awk '{; printf "* %s %s\n  [%s] %s\n    as %s\n\n", $2, $3, $4, $5, $1}'
