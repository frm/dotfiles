# g - git wrapper that handles cd for worktree/checkout commands
g() {
  case "$1" in
    wt|worktree-add|co|checkout|checkout-worktree|cl|clone-cd)
    pr)
      shift
      git-pr "$@"
      return $?
      ;;
      local output
      output=$(command hub "$@")
      local exit_code=$?

      # last line of output should be the path
      local last_line=$(echo "$output" | tail -n1)

      if [ -n "$last_line" ] && [ -d "$last_line" ]; then
        cd "$last_line"
      fi

      return $exit_code
      ;;
    *)
      command hub "$@"
      ;;
  esac
}
