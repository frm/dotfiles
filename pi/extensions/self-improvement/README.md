# Self-Improvement Extension

Detects friction patterns between the user and AI configuration files. The agent logs friction silently during conversations, then suggests improvements when patterns accumulate.

Works for both user-level files (skills, prompts, extensions) and project-level files (agents.md, .ai/, .pi/agents/).

## Tools

### `self_improvement__log_friction`

Silently log a friction pattern. Called by the agent when it notices the user correcting behavior that should be codified.

| Param | Type | Required | Description |
|---|---|---|---|
| `artifact` | string | yes | Path to the file the friction relates to |
| `pattern` | string | yes | Short description of the recurring issue |
| `suggestion` | string | yes | What should change to fix this |
| `severity` | `"low"` \| `"medium"` \| `"high"` | yes | How much friction this causes |
| `scope` | `"user"` \| `"project"` | no | `"user"` (default) for user-level files, `"project"` for project AI files |

### `self_improvement__review`

Review pending improvement suggestions grouped by artifact.

| Param | Type | Required | Description |
|---|---|---|---|
| `scope` | `"user"` \| `"project"` | no | Filter entries by scope. Defaults to `"user"`. |

Returns grouped patterns with current artifact content.

### `self_improvement__update`

Update entry statuses after review.

| Param | Type | Required | Description |
|---|---|---|---|
| `updates` | array | yes | List of `{id, status}` where status is `"applied"`, `"dismissed"`, or `"skipped"` |

## Commands

| Command | Description |
|---|---|
| `/self-improvement prune` | Remove applied and dismissed entries |
| `/self-improvement prune --all` | Clear the entire friction log |
| `/self-improvement status` | Show log stats (total, pending, applied, dismissed, actionable) |

## Config

Namespace: `"self-improvement"` in `.pi/config.json`.

| Option | Type | Default | Description |
|---|---|---|---|
| `enabled` | boolean | `true` | Enable/disable the extension |
| `showEndOfSessionSummary` | boolean | `true` | Show friction count at session end |
| `showEmergingPatterns` | boolean | `false` | Include below-threshold patterns in review output |
| `minEntriesForSummary` | number | `0` | Min friction entries in a session before showing end-of-session summary |
| `minEntriesForSuggestion` | object | `{"high": 1, "medium": 2, "low": 3}` | Per-severity threshold for surfacing suggestions. |
| `minEntriesForResurface` | number | `3` | How many new entries after dismissal before resurfacing |
| `ignoredArtifacts` | string[] | `[]` | Artifact paths to never surface |

### Severity-aware thresholds

`minEntriesForSuggestion` sets per-severity thresholds:

```json
{
  "self-improvement": {
    "minEntriesForSuggestion": {
      "high": 1,
      "medium": 2,
      "low": 3
    }
  }
}
```

A single high-severity entry is enough to surface a suggestion, while low-severity patterns need 3 occurrences.

## Scoping

- **`"user"`** — targets user-level files: skills, prompts, extensions, agent definitions under `~/.dotfiles`, `~/.pi`, etc.
- **`"project"`** — targets project-level AI files: `agents.md`, `AGENTS.md`, `.ai/`, `.pi/agents/`. Resolved to `project:<cwd>` internally so entries from different projects don't mix.

The agent is instructed to choose the appropriate scope automatically based on which file the friction relates to.

## Storage

All entries are stored in `~/.pi/logs/friction.jsonl` as newline-delimited JSON. Entries older than 30 days with `applied` status are auto-pruned on session start.
