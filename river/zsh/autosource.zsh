emulate -L zsh
set -o pipefail
autoload -Uz add-zsh-hook

typeset -gA _ENV_AUTOLOAD_MTIMES
typeset -g  _ENV_AUTOLOAD_LASTROOT=""

autosource_target=${RIVER_ENV_SCRIPT:-"environment.sh"}

_env_find_root() {
  emulate -L zsh
  local dir="${PWD:A}" parent
  while :; do
    [[ -f "$dir/$autosource_target" ]] && { print -r -- "$dir"; return 0; }
    # if this dir is a git root, stop; do not search above
    [[ -d "$dir/.git" ]] && break
    parent="${dir:h}"
    [[ "$parent" == "$dir" ]] && break   # reached filesystem root
    dir="$parent"
  done
  return 1
}

_env_mtime() {
  emulate -L zsh
  local f="$1" ts
  if stat -f %m "$f" >/dev/null 2>&1; then
    ts="$(stat -f %m "$f")"
  else
    ts="$(stat -c %Y "$f")"
  fi
  print -r -- "$ts"
}

_env_autoload_hook() {
  emulate -L zsh
  set -o pipefail

  local root envfile mtime
  if root="$(_env_find_root)"; then
    envfile="$root/$autosource_target"
    mtime="$(_env_mtime "$envfile")"
    if [[ -z "${_ENV_AUTOLOAD_MTIMES[$root]:-}" || "${_ENV_AUTOLOAD_MTIMES[$root]}" != "$mtime" ]]; then
      source "$envfile"
      _ENV_AUTOLOAD_MTIMES[$root]="$mtime"
      _ENV_AUTOLOAD_LASTROOT="$root"
      # print -P "↻ sourced %F{cyan}$envfile%f"
    fi
  else
    _ENV_AUTOLOAD_LASTROOT=""
  fi
}

add-zsh-hook -d chpwd _env_autoload_hook >/dev/null 2>&1 || true
add-zsh-hook chpwd _env_autoload_hook
_env_autoload_hook

env_reload() {
  emulate -L zsh
  unset '_ENV_AUTOLOAD_MTIMES' 2>/dev/null
  typeset -gA _ENV_AUTOLOAD_MTIMES
  _env_autoload_hook
}

env_autoload_off() {
  emulate -L zsh
  add-zsh-hook -d chpwd _env_autoload_hook
  unset _ENV_AUTOLOAD_LASTROOT
  unset '_ENV_AUTOLOAD_MTIMES'
  unfunction _env_autoload_hook _env_find_root _env_mtime 2>/dev/null || true
  echo "env autoload disabled for this shell."
}

