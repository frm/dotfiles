---
description: Show available commands and setup reference
---
Display this help reference exactly as written:

## Commands

| Command | Description |
|---------|-------------|
| `/ship` | Commit, push, and open a PR. Use `--simplify` or `-s` to run simplifier first |
| `/simplify` | Run 3 analysis agents in parallel (reuse, quality, efficiency), then apply fixes |
| `/linear <id>` | Fetch a Linear issue and send to agent |
| `/plan` | Reopen the last presented plan |
| `/shepherd` | Toggle autonomous PR shepherding (CI, reviews, conflicts) |
| `/worktrees` | Toggle worktrees context panel |
| `/git-panel` | Toggle git context panel |
| `/context-panels` | Toggle both context panels |

## Tools

| Tool | Description |
|------|-------------|
| `present_plan` | Display a plan in a scrollable overlay for review/approval |
| `questionnaire` | Structured multi-choice prompts (single or tabbed) |
| `subagent` | Delegate to specialized agents (single, parallel, or chain) |
| `linear_fetch_issue` | Fetch a Linear issue by identifier |
| `linear_create_issue` | Create a Linear issue or sub-issue |
| `linear_update_issue` | Update a Linear issue |
| `linear_list_issues` | List/filter Linear issues |

## Prompt Templates

| Template | Description |
|----------|-------------|
| `/h` | This help reference |
| `/implement <task>` | Scout → planner → worker chain |
| `/scout-and-plan <task>` | Scout → planner only (no implementation) |
| `/implement-and-review <task>` | Worker → reviewer → worker applies feedback |

## Subagents

| Agent | Model | Purpose |
|-------|-------|---------|
| `scout` | Sonnet | Map out relevant files and architecture |
| `planner` | Opus | Create implementation plans (read-only) |
| `worker` | Sonnet | Implement isolated subtasks |
| `reviewer` | Opus | Review for bugs and quality (read-only) |
| `shipper` | Sonnet | Draft commit/PR messages (read-only, strict JSON) |
| `simplifier` | Opus | Apply code refinements |
| `simplifier-reuse` | Opus | Find duplicate logic (read-only) |
| `simplifier-quality` | Opus | Check code clarity (read-only) |
| `simplifier-efficiency` | Opus | Find performance issues (read-only) |

## Skills

| Skill | Trigger | Description |
|-------|---------|-------------|
| `brainstorm` | "brainstorm", "/brainstorm" | Collaborative design exploration |
| `writing-plans` | Before multi-step tasks | TDD-style implementation plans |
| `executing-plans` | After writing a plan | Batched execution with checkpoints |
| `commit` | "/commit" | Conventional commit message generator |
| `review-pr` | PR review requests | Context-aware PR review with inline comments |
| `solve-conflicts` | Git conflicts | Structured conflict resolution |
| `codex-plan-review` | "review the plan" | External plan review via Codex CLI |
| `unit-testing-guidelines` | Writing Elixir tests | ExUnit conventions (ex_machina, Mimic) |
| `speech` | "/speech" | Toggle speech mode |
| `sync-codex-skills` | Sync skills | Copy dotfiles skills to Codex |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `ctrl+shift+w` | Toggle worktrees panel |
| `ctrl+shift+g` | Toggle git panel |
