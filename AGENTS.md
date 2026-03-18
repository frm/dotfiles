# Dotfiles

Personal dotfiles repo — shell config, editor setup, pi agent configuration, and AI skills.

## Key Areas

### `pi/` — Pi Agent Configuration

Extensions, subagents, prompt templates, and Linear integration for the [pi coding agent](https://github.com/mariozechner/pi-coding-agent). Symlinked to `~/.pi/agent/`.

**Before working here, read:** `pi/AGENTS.md`

### `pi/extensions/` — Pi Extensions

TypeScript extensions registering commands, tools, shortcuts, and lifecycle hooks. Each extension is a folder with `index.ts` + `README.md`.

**Before creating or modifying extensions, read:** `pi/extensions/AGENTS.md`

### `pi/extensions/lib/singleton/` — Shared Singleton IPC

Generic library for single-leader services across multiple pi instances.

**Before creating a new singleton service, read:** `pi/extensions/lib/singleton/AGENTS.md`

### `ai/skills/` — AI Skills

Markdown skill files loaded by pi. Each skill is a folder with `SKILL.md`. Auto-discovered from `~/.dotfiles/ai/skills/`.

### `git/` — Git Configuration

Custom git commands, aliases, worktree management, and the `g` wrapper function. Commands in `bin/` follow a specific pattern (POSIX sh, prefixed helpers, stderr logging, stdout for cd paths).

**Before creating or modifying git commands, read:** `git/AGENTS.md`

### `functions/` — Shell Functions & Aliases

Zsh functions and aliases sourced on shell startup.

### `nvim/` — Neovim Configuration

Lazy.nvim plugin management, horizon color scheme, language-specific settings, VS Code mode support.

**Before modifying nvim config, read:** `nvim/AGENTS.md`
