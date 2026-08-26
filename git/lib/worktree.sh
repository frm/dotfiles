# Shared helpers for git-worktree-{add,del,list,status}.
#
# Sourced, never executed. Every function is prefixed __git_wt_ to avoid
# colliding with the sourcing script's own helpers.
#
# The per-repo contract is four variables, read from the repo's resolved env:
#
#   _WT_VARS      NAME:strategy pairs. Strategies:
#                   port      assign from the worktree's hash bucket
#                   unique    primary's value + _<hash>
#                   database  unique, plus clone <base>_dev/<base>_test on
#                             create and drop them on teardown
#   _WT_COPY      extra paths to share, for what language detection can't infer
#   _WT_ENV_FILE  where derived values are written (auto-detected). Space-
#                 separated for a repo that needs more than one, each written
#                 in the format its extension implies.
#   _WT_DB_PSQL   psql command prefix (default: psql -h localhost -U postgres)

_WT_ALWAYS_COPY=".env .envrc .pi"
_WT_DB_SUFFIXES="_dev _test"
_WT_MARKER=".worktree-state.json"
_WT_SKIP_BUILD=".elixir_ls .expert"
_WT_TAB="$(printf '\t')"

#
# identity
#

# SHA256 of the input, first 8 hex chars.
__git_wt_hash_id() {
  local input="$1"
  local digest

  if command -v shasum >/dev/null 2>&1; then
    digest=$(printf '%s' "$input" | shasum -a 256 | awk '{print $1}')
  elif command -v sha256sum >/dev/null 2>&1; then
    digest=$(printf '%s' "$input" | sha256sum | awk '{print $1}')
  else
    echo "[git]: missing shasum/sha256sum" >&2
    return 1
  fi

  printf '%s' "$digest" | cut -c1-8
}

# The primary worktree root: the common git dir is <primary>/.git.
__git_wt_primary_root() {
  local common

  common=$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null) || return 1
  echo "${common%/.git}"
}

__git_wt_valid_name() {
  case "$1" in
    '' | [0-9]* | *[!A-Za-z0-9_]*) return 1 ;;
  esac
}

#
# _WT_VARS
#

# Emit NAME<TAB>STRATEGY for each declared var, skipping malformed names.
__git_wt_vars() {
  local entry name strategy

  for entry in $_WT_VARS; do
    name="${entry%%:*}"
    strategy="${entry#*:}"
    [ "$strategy" = "$entry" ] && strategy="unique"

    __git_wt_valid_name "$name" || continue
    case "$strategy" in
      port | unique | database) ;;
      *) continue ;;
    esac

    printf '%s\t%s\n' "$name" "$strategy"
  done
}

__git_wt_vars_by_strategy() {
  __git_wt_vars | awk -F'\t' -v want="$1" '$2 == want { print $1 }'
}

# Ports are assigned in declaration order from a bucket derived from the
# worktree path, so a given worktree always lands on the same ports.
__git_wt_derive_port() {
  local hash="$1" index="$2" count="$3"
  local seed bucket

  seed=$(printf '%d' "0x$hash")
  bucket=$((seed % 500))

  echo $((20000 + bucket * count + index))
}

# ATLAS_PORT -> atlas
__git_wt_port_label() {
  local name="${1%_PORT}"

  echo "$name" | tr '[:upper:]' '[:lower:]'
}

#
# env files
#

__git_wt_is_mise_repo() {
  [ -f "$1/mise.toml" ] || [ -f "$1/.mise.toml" ]
}

# Where derived values get written, as a space-separated list. Auto-detection
# always answers with exactly one: mise repos take the local overlay next to
# their config (matching its dotting); everything else prefers .envrc, which is
# shell config, over .env, which apps tend to read directly. A repo needing
# several declares them itself.
__git_wt_env_file() {
  local root="$1"

  if [ -n "$_WT_ENV_FILE" ]; then
    echo "$_WT_ENV_FILE"
  elif [ -f "$root/.mise.toml" ]; then
    echo ".mise.local.toml"
  elif [ -f "$root/mise.toml" ]; then
    echo "mise.local.toml"
  elif [ -f "$root/.envrc" ]; then
    echo ".envrc"
  else
    echo ".env"
  fi
}

# Read a var's fully resolved value from a checkout. mise already merges its
# config layers, so we ask it rather than parsing toml. A repo can use both
# mise and direnv, so the shell files are still consulted when mise has no
# answer.
__git_wt_resolve_env() {
  local root="$1" key="$2"
  local value file

  __git_wt_valid_name "$key" || return 0

  if __git_wt_is_mise_repo "$root"; then
    value=$( (cd "$root" && mise env --json 2>/dev/null) \
      | jq -r --arg k "$key" '.[$k] // empty' 2>/dev/null )

    if [ -n "$value" ]; then
      printf '%s' "$value"
      return 0
    fi
  fi

  for file in .envrc .env; do
    [ -f "$root/$file" ] || continue

    value=$(
      cd "$root" || exit 0
      # shellcheck disable=SC1090
      . "./$file" >/dev/null 2>&1
      eval "printf '%s' \"\${$key-}\""
    ) 2>/dev/null

    if [ -n "$value" ]; then
      printf '%s' "$value"
      return 0
    fi
  done
}

# Load the repo's _WT_* contract from primary's resolved env. Scripts call this
# before reading any _WT_ var so behaviour never depends on which worktree's
# env the invoking shell happens to have activated.
__git_wt_load_config() {
  local root="$1"
  local name value

  for name in _WT_VARS _WT_COPY _WT_ENV_FILE _WT_DB_PSQL; do
    value=$(__git_wt_resolve_env "$root" "$name")
    [ -n "$value" ] || continue
    eval "$name=\$value"
  done
}

# Upsert KEY into an env file, in the format the file's extension implies:
# a .toml gets KEY = "VALUE" under [env], anything else gets export KEY=VALUE.
__git_wt_upsert_env() {
  local env_file="$1"

  case "$env_file" in
    *.toml) __git_wt_upsert_env_toml "$@" ;;
    *) __git_wt_upsert_env_shell "$@" ;;
  esac
}

# Upsert KEY into every env file the repo declared.
__git_wt_write_env() {
  local root="$1" env_files="$2" key="$3" value="$4"
  local file

  for file in $env_files; do
    __git_wt_upsert_env "$root/$file" "$key" "$value"
  done
}

__git_wt_trust_env() {
  local root="$1" env_files="$2"
  local file

  command -v mise >/dev/null 2>&1 || return 0

  for file in $env_files; do
    case "$file" in
      *.toml)
        mise trust --yes "$root" >/dev/null 2>&1 || true
        return 0
        ;;
    esac
  done
}

__git_wt_upsert_env_shell() {
  local env_file="$1" key="$2" value="$3"
  local tmp_file="${env_file}.tmp.$$"

  if [ ! -f "$env_file" ]; then
    echo "export ${key}=${value}" > "$env_file"
    return
  fi

  awk -v key="$key" -v value="$value" '
  BEGIN { updated = 0 }
  $0 ~ "^export " key "=" {
    print "export " key "=" value
    updated = 1
    next
  }
  { print }
  END {
    if (!updated) {
      if (NR > 0) print ""
      print "export " key "=" value
    }
  }' "$env_file" > "$tmp_file"

  mv "$tmp_file" "$env_file"
}

__git_wt_upsert_env_toml() {
  local env_file="$1" key="$2" value="$3"
  local tmp_file="${env_file}.tmp.$$"

  if [ ! -f "$env_file" ]; then
    printf '[env]\n%s = "%s"\n' "$key" "$value" > "$env_file"
    return
  fi

  awk -v key="$key" -v value="$value" '
  BEGIN { in_env = 0; updated = 0 }
  /^[[:space:]]*\[env\][[:space:]]*$/ { in_env = 1; print; next }
  /^[[:space:]]*\[/ {
    if (in_env && !updated) { print key " = \"" value "\""; updated = 1 }
    in_env = 0; print; next
  }
  in_env && $0 ~ "^[[:space:]]*" key "[[:space:]]*=" {
    print key " = \"" value "\""; updated = 1; next
  }
  { print }
  END {
    if (updated) exit
    if (in_env) { print key " = \"" value "\""; exit }
    print ""; print "[env]"; print key " = \"" value "\""
  }' "$env_file" > "$tmp_file"

  mv "$tmp_file" "$env_file"
}

#
# language detection
#

# Emit LANG<TAB>RELDIR for every project marker in the tree. Heavy and
# generated directories are pruned so this stays fast and never descends into
# a dependency's own copy of a marker file.
__git_wt_detect() {
  local root="$1"
  local file rel dir

  find "$root" \
    \( -name node_modules -o -name _build -o -name deps -o -name target \
    -o -name .venv -o -name .git -o -name .worktrees -o -name .elixir_ls \
    -o -name .expert \) -prune -o \
    -type f \( -name mix.exs -o -name package.json -o -name Cargo.toml \
    -o -name pyproject.toml \) -print 2>/dev/null \
    | while IFS= read -r file; do
      rel="${file#"$root"/}"
      dir=$(dirname "$rel")
      [ "$dir" = "." ] && dir=""

      case "${file##*/}" in
        mix.exs) printf 'elixir\t%s\n' "$dir" ;;
        package.json) printf 'node\t%s\n' "$dir" ;;
        Cargo.toml) printf 'rust\t%s\n' "$dir" ;;
        pyproject.toml) printf 'python\t%s\n' "$dir" ;;
      esac
    done
}

# Paths worth sharing, derived from the detected markers.
__git_wt_detect_paths() {
  local root="$1"
  local lang dir prefix

  __git_wt_detect "$root" | while IFS="$_WT_TAB" read -r lang dir; do
    prefix="${dir:+$dir/}"
    case "$lang" in
      elixir) printf '%s\n' "${prefix}deps" "${prefix}_build" "${prefix}priv/plts" "${prefix}.elixir_ls" "${prefix}.expert" ;;
      node) printf '%s\n' "${prefix}node_modules" ;;
      rust) printf '%s\n' "${prefix}target" ;;
      python) printf '%s\n' "${prefix}.venv" ;;
    esac
  done
}

# A marker only counts as a project root for setup purposes when it has a
# lockfile beside it; otherwise it is a member of a workspace whose root
# already installs on its behalf.
__git_wt_has_lockfile() {
  local dir="$1" lang="$2"

  case "$lang" in
    elixir) [ -f "$dir/mix.lock" ] ;;
    rust) [ -f "$dir/Cargo.lock" ] ;;
    python) [ -f "$dir/uv.lock" ] ;;
    node)
      [ -f "$dir/bun.lock" ] || [ -f "$dir/bun.lockb" ] \
        || [ -f "$dir/yarn.lock" ] || [ -f "$dir/pnpm-lock.yaml" ] \
        || [ -f "$dir/package-lock.json" ]
      ;;
    *) return 1 ;;
  esac
}

__git_wt_node_install_cmd() {
  local dir="$1"

  if [ -f "$dir/bun.lock" ] || [ -f "$dir/bun.lockb" ]; then
    echo "bun install"
  elif [ -f "$dir/yarn.lock" ]; then
    echo "yarn install"
  elif [ -f "$dir/pnpm-lock.yaml" ]; then
    echo "pnpm install"
  else
    echo "npm install"
  fi
}

#
# marker file
#

__git_wt_marker_path() {
  echo "$1/$_WT_MARKER"
}

__git_wt_marker_exists() {
  [ -f "$(__git_wt_marker_path "$1")" ]
}

# Read a jq filter out of a worktree's marker (e.g. .hash, .db_mode).
__git_wt_marker_get() {
  local file
  file=$(__git_wt_marker_path "$1")

  [ -f "$file" ] || return 1
  command -v jq >/dev/null 2>&1 || return 1

  jq -r "$2 // empty" "$file" 2>/dev/null
}

__git_wt_marker_var() {
  __git_wt_marker_get "$1" ".vars.\"$2\".value"
}

# $3 is NAME<TAB>VALUE<TAB>STRATEGY lines.
__git_wt_marker_write() {
  local root="$1" hash="$2" db_mode="$3" vars_tsv="$4"

  printf '%s' "$vars_tsv" | jq -R -s \
    --arg hash "$hash" \
    --arg db_mode "$db_mode" '
    {
      version: 1,
      hash: $hash,
      created_at: (now | todate),
      db_mode: $db_mode,
      vars: (
        split("\n")
        | map(select(length > 0) | split("\t"))
        | map({ key: .[0], value: { value: .[1], strategy: .[2] } })
        | from_entries
      )
    }' > "$(__git_wt_marker_path "$root")"
}

#
# postgres
#

__git_wt_valid_db_name() {
  case "$1" in
    '' | [0-9]* | *[!A-Za-z0-9_]*) return 1 ;;
  esac
}

__git_wt_psql() {
  local psql_cmd="${_WT_DB_PSQL:-psql -h localhost -U postgres}"

  # Unquoted on purpose: _WT_DB_PSQL is a command prefix with its own flags.
  # shellcheck disable=SC2086
  PGOPTIONS="-c client_min_messages=warning" \
    $psql_cmd -v ON_ERROR_STOP=1 -q -tAc "$1"
}

__git_wt_db_exists() {
  local name="$1"
  local result

  __git_wt_valid_db_name "$name" || return 1

  result=$(__git_wt_psql "SELECT 1 FROM pg_database WHERE datname='$name'" 2>/dev/null | tr -d '[:space:]')
  [ "$result" = "1" ]
}

# Postgres refuses to use a template that has live connections, and an
# interrupted earlier run can leave a half-built target behind.
__git_wt_db_clone() {
  local source_db="$1" target_db="$2"

  __git_wt_valid_db_name "$source_db" || return 1
  __git_wt_valid_db_name "$target_db" || return 1
  [ "$source_db" = "$target_db" ] && return 0

  __git_wt_psql "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname IN ('$source_db', '$target_db') AND pid <> pg_backend_pid();" >/dev/null 2>&1
  __git_wt_psql "DROP DATABASE IF EXISTS \"$target_db\";" >/dev/null || return 1
  __git_wt_psql "CREATE DATABASE \"$target_db\" WITH TEMPLATE \"$source_db\";" >/dev/null || return 1
}

__git_wt_db_drop() {
  local name="$1"

  __git_wt_valid_db_name "$name" || return 1

  __git_wt_psql "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$name' AND pid <> pg_backend_pid();" >/dev/null 2>&1
  __git_wt_psql "DROP DATABASE IF EXISTS \"$name\";" >/dev/null || return 1
}

#
# hooks
#

# Hooks live in the shared git dir: machine-local, per-repo, and never
# controlled by whatever branch a worktree happens to have checked out.
__git_wt_hooks_dir() {
  local common

  common=$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null) || return 1
  echo "$common/hooks"
}

__git_wt_run_hook() {
  local name="$1"
  shift

  local hooks_dir
  hooks_dir=$(__git_wt_hooks_dir) || return 0
  [ -x "$hooks_dir/$name" ] || return 0

  "$hooks_dir/$name" "$@"
}
