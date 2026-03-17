# Ship Extension

Commit, push, and open a PR in one command. Uses the `shipper` subagent to analyze changes, drafts a commit message and PR description, confirms with the user, then executes the git workflow.

## Commands

| Command | Description |
|---|---|
| `/ship` | Ship with an auto-generated commit message and PR description |
| `/ship <hint>` | Ship with a natural-language hint to guide the commit message |
| `/ship --simplify` | Run the simplify pipeline before shipping |
| `/ship -s <hint>` | Simplify then ship with a hint |

## Workflow

1. (Optional) If `--simplify` / `-s` is passed, runs `simplifier-reuse`, `simplifier-quality`, and `simplifier-efficiency` in parallel, then applies fixes via the `simplifier` agent.
2. Delegates to the `shipper` subagent to analyze git changes and draft a commit message + PR description.
3. Presents a questionnaire — the user can approve, suggest a change, override the message, or cancel.
4. Runs the project formatter on changed files, stages them by name, commits, and pushes.
5. Creates a new PR via `gh pr create` or shows the existing PR URL if one already exists.
