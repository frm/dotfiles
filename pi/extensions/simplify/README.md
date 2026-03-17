# Simplify Extension

Review and refine recently changed code. Runs three analysis subagents in parallel (reuse, quality, efficiency), synthesizes their findings, then delegates to the `simplifier` agent to apply the real fixes.

## Commands

| Command | Description |
|---|---|
| `/simplify` | Analyze and simplify recent changes |
| `/simplify <scope>` | Restrict analysis to a specific file or path |

## Workflow

1. Runs `simplifier-reuse`, `simplifier-quality`, and `simplifier-efficiency` in parallel.
2. Synthesizes findings and discards false positives.
3. Delegates consolidated issues to the `simplifier` agent, which applies the actual edits.
4. Reports what was changed.
