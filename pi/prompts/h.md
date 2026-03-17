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
| `/global` | Toggle the global (left) panel |
| `/local` | Toggle the local (right) panel |
| `/panels` | Re-initialize or refresh all panels |
| `/music` | Toggle the music widget |
| `/self-improvement prune` | Remove applied/dismissed friction entries |
| `/self-improvement status` | Show friction log stats |
| `/gh` | Show GitHub singleton status (role, uptime, cache) |

## Tools

| Tool | Description |
|------|-------------|
| `present_plan` | Display a plan in a scrollable overlay for review/approval |
| `questionnaire` | Structured multi-choice prompts (single or tabbed) |
| `subagent` | Delegate to specialized agents (single, parallel, or chain) |
| `fetch_config` | Read a value from `.pi/config.json` (dot-notation key) |
| `self_improvement__log_friction` | Silently log a friction pattern (user or project scope) |
| `self_improvement__review` | Review pending friction suggestions grouped by artifact |
| `self_improvement__update` | Update friction entry statuses (applied/dismissed/skipped) |
| `browser_launch` | Launch a browser for manual testing |
| `browser_navigate` | Navigate to a URL |
| `browser_click` | Click an element by selector or text |
| `browser_type` | Type text into an input field |
| `browser_screenshot` | Take a screenshot of the current page |
| `browser_read_page` | Read page content (visible text, DOM structure) |
| `browser_close` | Close the browser |
| `linear_fetch_issue` | Fetch a Linear issue by identifier |
| `linear_create_issue` | Create a Linear issue or sub-issue |
| `linear_update_issue` | Update a Linear issue |
| `linear_list_issues` | List/filter Linear issues |
| `linear_list_my_projects` | List Linear projects where you're a member |

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
| `code-patterns` | Writing new code | Code structure and organization patterns (general + per-language) |
| `elixir-testing-guide` | Writing Elixir tests | ExUnit conventions, Mimic, anti-patterns |
| `manual-testing` | "manually test" | Drive a browser to test UI changes |
| `speech` | "/speech" | Toggle speech mode |
| `sync-codex-skills` | Sync skills | Copy dotfiles skills to Codex |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `alt+1` – `alt+9` | Switch to worktree by index |
| `alt+g` | Toggle global (left) panel |
| `alt+l` | Toggle local (right) panel |
| `alt+t` | Open terminal popup |
| `alt+v` | Open nvim popup |
| `alt+m` | Toggle music widget |
| `alt+k` | Cycle music visualizer |
| `alt+j` | Toggle lyrics |
