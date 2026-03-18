# Pi Agent Setup

Personal [pi coding agent](https://github.com/mariozechner/pi-coding-agent) configuration — extensions, subagents, prompt templates, and Linear integration.

## Directory Structure

`~/.pi/agent/` is symlinked from this dotfiles repo (`pi/`).

```
~/.pi/agent/
  extensions/       TypeScript extensions (commands, tools, hooks)
  agents/           Subagent definitions (model, tools, system prompt)
  prompts/          Prompt templates invoked as slash commands
  instructions.md   Custom instructions injected into every session
  settings.json     Model, provider, thinking level, Linear config
  auth.json         Provider API keys (not tracked)
```

Skills live separately in `ai/skills/` (symlinked to `~/.claude/skills/`).

## Architecture

### Extension Loading

Extensions export a default function receiving `ExtensionAPI`. They can:

- `registerCommand()` — slash commands (e.g. `/ship`, `/simplify`)
- `registerTool()` — LLM-callable tools (e.g. `present_plan`, `subagent`)
- `registerShortcut()` — keyboard shortcuts (e.g. `ctrl+shift+w`)
- `on()` — lifecycle hooks (`session_start`, `before_agent_start`)

At session start:

1. `custom-instructions.ts` hooks `before_agent_start` → injects `instructions.md` into the system prompt
2. `context-panels/index.ts` hooks `session_start` → spawns tmux side panels
3. `shepherd-pr.ts` hooks `session_start` → reconnects PR monitor if active
4. All tools (`present_plan`, `questionnaire`, `subagent`, `linear_*`) become available to the LLM

### Subagent System

The `subagent` tool spawns child `pi` processes with `--mode json -p --no-session` and an `--append-system-prompt` pointing to a temp file with the agent's system prompt. Each agent's markdown frontmatter defines model, allowed tools, and persona.

Three execution modes:

- **Single** — one agent, one task
- **Parallel** — up to 8 agents (concurrency 4), independent tasks
- **Chain** — sequential agents, output piped via `{previous}` placeholder

Agent discovery loads from `~/.pi/agent/agents/` (user scope) and `.pi/agents/` in the git tree (project scope).

### Context Panels

Two tmux split panes managed by the `context-panels` extension:

- **Left (22%):** `global.mjs` — worktrees + PR overview
- **Right (22%):** `local.mjs` — git status, changed files, detail view

The parent pi process sends `SIGUSR1` to trigger panel refresh.

### Custom Instructions

`instructions.md` defines communication style, code quality rules, git workflow, subagent delegation guidelines, and planning discipline. Injected via `custom-instructions.ts` on `before_agent_start`.

### PR Shepherding

`shepherd-pr.ts` monitors an open PR: polls CI status, review comments, and merge conflicts. When issues are detected, spawns a `claude` subprocess to auto-fix.

## Extensions

| Extension | What it does |
|---|---|
| `ship.ts` | `/ship` — commit, push, and open PRs with confirmation |
| `simplify.ts` | `/simplify` — run 3 analysis agents in parallel, then apply refinements |
| `linear/` | `/linear` + 5 Linear tools (fetch, create, update, list issues, list projects) |
| `work-setup/` | `work__setup` tool — create worktree + tmux window for a Linear ticket |
| `calendar/` | `calendar__list_events` tool — fetch Google Calendar events |
| `present-plan/` | `present_plan` tool + `/plan` — scrollable overlay with inline commenting |
| `questionnaire/` | `questionnaire` tool — structured multi-choice prompts |
| `subagent/` | `subagent` tool — delegate to specialized agents |
| `custom-instructions/` | Loads `instructions.md` into the system prompt |
| `shepherd-pr/` | `/shepherd` — autonomous PR shepherding |
| `panels/` | `/global`, `/local`, `/panels` + keyboard shortcuts |

## Subagents

| Agent | Model | Purpose |
|---|---|---|
| `scout` | Sonnet | Map out relevant files and architecture |
| `planner` | Opus (read-only) | Create implementation plans |
| `worker` | Sonnet | Execute isolated subtasks |
| `reviewer` | Opus (read-only) | Review for bugs, security, quality |
| `shipper` | Sonnet (read-only) | Draft commit/PR messages (strict JSON) |
| `simplifier` | Opus | Apply code refinements |
| `simplifier-reuse` | Opus (read-only) | Find duplicate logic |
| `simplifier-quality` | Opus (read-only) | Check code clarity |
| `simplifier-efficiency` | Opus (read-only) | Find performance issues |

## Prompt Templates

| Template | Workflow |
|---|---|
| `/h` | Help reference card |
| `/implement <task>` | Scout → planner → worker |
| `/scout-and-plan <task>` | Scout → planner (no implementation) |
| `/implement-and-review <task>` | Worker → reviewer → worker applies feedback |

## Skills

Loaded from `~/.claude/skills/` (configured in `settings.json`):

| Skill | Description |
|---|---|
| `brainstorm` | Collaborative design exploration before creative work |
| `writing-plans` | TDD-style implementation plans |
| `executing-plans` | Batched plan execution with checkpoint reviews |
| `commit` | Conventional commit message generator |
| `review-pr` | Context-aware PR review with inline comments |
| `solve-conflicts` | Structured git conflict resolution |
| `codex-plan-review` | External plan review via Codex CLI |
| `unit-testing-guidelines` | Elixir ExUnit conventions |
| `find-work` | Find Linear tickets and set up worktrees with brainstorm |
| `triage` | Prioritize work from Linear + Calendar + ad-hoc, learns preferences |
| `review-challenge` | Review candidate take-home challenges (sandboxed, prompt-injection safe) |
| `speech` | Toggle speech mode |
| `sync-codex-skills` | Sync dotfiles skills to Codex |
