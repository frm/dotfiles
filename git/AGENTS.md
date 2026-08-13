# Git Configuration

Custom git setup: aliases, custom commands, worktree management, and the `g` wrapper function.

## Structure

```
git/
  bin/              Custom git subcommands (invoked as `git <name>` or `g <name>`)
  lib/worktree.sh   Shared helpers for the worktree commands (sourced, not run)
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
- Shared helpers live in `lib/worktree.sh` and are prefixed `__git_wt_`. Anything used by more than one command belongs there.

## Worktree commands

`worktree-add` shares the source worktree's artifacts, derives a per-worktree identity, and installs dependencies in the background. `worktree-del` reverses it. `worktree-list` and `worktree-status` report.

### Sharing

Artifacts are copied with `cp -ca` (APFS `clonefile`), so a multi-GB `_build` costs no disk and no data movement until one side is written. Copies run concurrently because cloning still walks every inode.

What gets shared is mostly inferred. Language detection walks for marker files at any depth — `mix.exs`, `package.json`, `Cargo.toml`, `pyproject.toml` — and contributes both the paths to copy (`deps`, `_build`, `node_modules`, `target`, `.venv`) and the install command to run afterwards. A marker only counts as a project root when a lockfile sits beside it; otherwise it's a workspace member whose root installs on its behalf.

`.elixir_ls` and `.expert` are copied without their `build/` subdirectory, which bakes in absolute paths.

### Identity

Each worktree hashes its own path into an 8-char id, then derives values from it. Bases always resolve from the **primary** worktree, so branching off a worktree yields `nexus_<hash>`, never `nexus_<hash>_<hash>`.

Resolution goes through `mise env --json` for mise repos (it already merges config layers) and through sourcing `.envrc`/`.env` otherwise.

Derived values are written to the worktree's env file — `mise.local.toml` for mise repos, `.envrc`/`.env` otherwise — and recorded in `.worktree-state.json` at the worktree root.

### The marker file

`.worktree-state.json` is written **last**, only once everything that can fail has succeeded, so it doubles as the "provisioned" flag. A worktree with a marker is skipped; a directory without one is resumed in place. It's gitignored globally.

It is not trusted for destructive operations. Teardown recomputes the databases and ports a worktree owns from its path and primary's config, and refuses to act on a mismatch — the file is writable by anything, and a tampered value would otherwise steer a drop at a shared database.

### Per-repo contract

Four variables, read from the repo's resolved env. Most repos need one or none.

| var | purpose |
|---|---|
| `_WT_VARS` | `NAME:strategy` pairs — see below |
| `_WT_COPY` | extra paths to share, for what detection can't infer |
| `_WT_ENV_FILE` | where derived values are written (auto-detected) |
| `_WT_DB_PSQL` | psql command prefix (default `psql -h localhost -U postgres`) |

Strategies:

- `port` — assigned from the worktree's hash bucket, in declaration order. The first one declared is what `worktree-list` shows.
- `unique` — primary's value plus `_<hash>`.
- `database` — `unique`, plus lifecycle: `<base>_dev` and `<base>_test` are cloned from the source worktree on `--reset` and dropped on teardown. The var holds a **base name**; the `_dev`/`_test` suffixes are convention.

Database cloning uses `CREATE DATABASE ... WITH TEMPLATE`, so an isolated worktree starts with real data rather than an empty migrated schema. The template is the source worktree's database, not primary's — branching off a worktree means its migrations are the ones that match. The marker is only flipped to `isolated` after every clone succeeds, so a failure leaves the worktree on the shared databases rather than pointing at ones that don't exist.

### Hooks

`worktree-setup` and `worktree-teardown` live in the shared git dir (`git rev-parse --git-common-dir`), so they're machine-local, per-repo, and never controlled by whatever branch a worktree has checked out. Non-executable `.sample` stubs are seeded there; `chmod +x` a copy to enable one. Setup hooks receive `_WT_HASH` and `_WT_RESET` in their environment.

With language detection providing real defaults, a hook is only needed when a repo does something the generic tooling can't know about.

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
