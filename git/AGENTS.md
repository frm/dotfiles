# Git Configuration

Custom git setup: aliases, custom commands, worktree management, and the `g` wrapper function.

## Structure

```
git/
  bin/              Custom git subcommands (invoked as `git <name>` or `g <name>`)
  g.zsh             The `g()` wrapper function — handles cd for worktree/checkout commands
  completions.zsh   Zsh completions for g/git/hub, with branch completion for custom commands
  git.init          Shell init script — sources g.zsh, completions, adds bin/ to PATH
  gitconfig.symlink Symlinked to ~/.gitconfig — aliases, delta, gpg, merge config
  gitignore_global.symlink  Global gitignore
  gitmessage.symlink        Commit message template
  git_template/     Git template dir (hooks)
```

## Custom Commands (`bin/`)

Each file in `bin/` is a standalone shell script named `git-<name>`. Git discovers these automatically, so `git worktree-add` invokes `bin/git-worktree-add`.

### Conventions

Follow the patterns in `git-worktree-add` and `git-worktree-del`:

**Shell:**
- Use `#!/usr/bin/env sh` with `set -e` (POSIX sh, not bash/zsh) unless you need zsh-specific features.
- If you need zsh, use `#!/usr/bin/env zsh` and source `$DOTFILES/functions/helpers.zsh` for pretty-printing.

**Structure:**
- Comment at the top: one-line description + usage.
- Helper functions are prefixed with `__git_<command>_` to avoid collisions (e.g. `__git_wt_attach`, `__git_del_remove_worktree`).
- Group helpers under an `# aux functions` section, main logic under `# main script`.
- Parse options with `getopts` or manual `case` before positional args.

**Output:**
- Status messages go to stderr via `__echo_git()`: `echo "[git]: $message" >&2`
- If the command produces a path the caller should cd into (like worktree-add), output it as the **last line to stdout**. The `g()` wrapper reads this to auto-cd.

**Error handling:**
- `set -e` handles most failures.
- For optional/cleanup steps, append `|| true` or `2>/dev/null`.
- Validate required args early, print usage to stderr, exit 1.

**Worktree-specific patterns:**
- Branch path normalization: `__git_wt_normalize_branch_path` flattens deep paths (`a/b/c` → `a/b-c`).
- Worktree path inference: `__git_wt_infer_worktree_path` handles being called from inside or outside a worktree.
- Artifact copying: `__git_wt_cp_artifacts` copies build artifacts (deps, node_modules, .env) from the source tree.
- Environment isolation: `__git_wt_setup_env` assigns unique ports and derived vars per worktree via hashing.
- Project-specific hooks: `$_MNDS_WORKTREE_POST_SETUP` and `$_MNDS_WORKTREE_PRE_TEARDOWN` env vars allow per-project customization without editing the scripts.

## The `g` Wrapper (`g.zsh`)

`g()` wraps `hub` (which wraps `git`). For commands that produce a directory path (`co`, `wt`, `cl`, `del`), it reads the last line of stdout and `cd`s into it. All other commands pass through to hub directly.

The `pr` subcommand is special-cased to call `git-pr` directly (bypasses hub).

## Aliases (`gitconfig.symlink`)

Key aliases:
- `co` → `checkout-worktree` (cd-aware checkout)
- `wt` → `worktree-add` (create worktree)
- `wtd` → `worktree-del` (delete worktree)
- `dl` → `del` (delete branch + worktree)
- `cl` → `clone-cd` (clone + cd)

Most single-letter aliases map to standard git commands (`a`=add, `b`=branch, `c`=commit, etc.).

## Completions (`completions.zsh`)

Custom completions for `g`, `git`, and `hub`. Commands that take branches (`co`, `dl`, `wt`, `wtd`, etc.) get branch name completion via `__git_branches`. Everything else falls through to the default `_git` completer.

When adding a new command that takes a branch argument, add it to the `case` in `_git_wrapper`.
