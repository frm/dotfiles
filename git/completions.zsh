__git_branches() {
  local branches=(${(f)"$(git branch -a --format='%(refname:short)' 2>/dev/null)"})
  compadd -a branches
}

_git_wrapper() {
  case ${words[2]} in
    co|cpr|mpr|ppr|del) __git_branches ;;
    *) _git ;;
  esac
}

# wrap around git completions and pass them down to hub
compdef _git_wrapper hub
compdef _git_wrapper git
