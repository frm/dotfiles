# Subagent Extension

Delegates tasks to specialized agents running in isolated context windows. Agents are defined as markdown files with optional frontmatter and run as separate Claude processes. Three execution modes are supported: single (one agent, one task), parallel (multiple agents run concurrently), and chain (sequential pipeline where each step receives the previous output).

## Tools

### `subagent`

Invoke one or more agents.

| Param | Type | Required | Description |
|---|---|---|---|
| `agent` | string | no | Agent name, for `single` mode |
| `task` | string | no | Task description, for `single` mode |
| `tasks` | array | no | List of `{agent, task, cwd?}` for `parallel` mode |
| `chain` | array | no | List of `{agent, task, cwd?}` for `chain` mode |
| `agentScope` | `"user"` \| `"project"` \| `"both"` | no | Which agent directories to search (default: `"user"`) |
| `confirmProjectAgents` | boolean | no | Prompt before running project-local agents (default: `true`) |
| `cwd` | string | no | Working directory for the agent process (single mode) |

#### Modes

**Single** — provide `agent` + `task`. Runs one agent and returns its output.

**Parallel** — provide `tasks` array. All agents run concurrently. Max 8 agents total, 4 running at once.

**Chain** — provide `chain` array. Agents run sequentially; use `{previous}` as a placeholder in a task string to inject the prior agent's output.

## Commands

None.

## Shortcuts

None.

## Agent Files

Agents are defined as markdown files. The filename (without `.md`) is the agent name.

| Location | Scope |
|---|---|
| `~/.pi/agent/agents/*.md` | User-level agents (`"user"`) |
| `.pi/agents/*.md` (project root) | Project-local agents (`"project"`) |

#### Frontmatter fields

```yaml
---
name: my-agent          # Display name (optional, defaults to filename)
description: ...        # What the agent does
model: claude-sonnet    # Model override (optional)
tools: [read, bash]     # Tool allow-list (optional, defaults to all)
---
```

The body of the markdown file is the agent's system prompt.

## Notable Behavior

- **Isolated context** — Each agent runs in its own context window and cannot access the main conversation history.
- **`confirmProjectAgents`** — When `true` (default), the user is prompted before any project-local agent runs. Set to `false` for programmatic callers.
- **`agentScope: "both"`** — Searches both user and project agent directories, with project agents taking precedence on name conflicts.
- **Concurrency limits** — Parallel mode caps at 8 total agents and 4 running simultaneously to avoid resource exhaustion.

## Config

No configuration options.
