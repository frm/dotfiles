# Dotfiles

Personal dotfiles repo — shell config, editor setup, and git tooling.

pi, its extensions and agents, the AI skills, herdr and the Sable daemon and app live in the sable repo (`~/Developer/frm/sable`). `install` clones it and runs `sable install`, which sets all of them up. `ai` here is a link to `../sable/ai`, kept because `claude/settings.json.symlink` reads it through `~/.dotfiles/ai`.

## Key Areas

### `git/` — Git Configuration

Custom git commands, aliases, worktree management, and the `g` wrapper function. Commands in `bin/` follow a specific pattern (POSIX sh, prefixed helpers, stderr logging, stdout for cd paths).

**Before creating or modifying git commands, read:** `git/AGENTS.md`

### `functions/` — Shell Functions & Aliases

Zsh functions and aliases sourced on shell startup.

### `nvim/` — Neovim Configuration

Lazy.nvim plugin management, horizon color scheme, language-specific settings, VS Code mode support.

**Before modifying nvim config, read:** `nvim/AGENTS.md`
