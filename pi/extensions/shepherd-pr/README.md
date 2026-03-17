# Shepherd PR Extension

Watches the current branch's pull request and automatically fixes CI failures, addresses actionable review comments, and resolves merge conflicts — all via Claude subprocesses that commit and push in-place.

## Commands

| Command | Description |
|---|---|
| `/shepherd` | Toggle shepherd on/off for the current PR |
| `/shepherd status` | Show current mode, fix counts, and any pending failures |
| `/shepherd review` | Open the review triage overlay for ambiguous comments |
| `/shepherd retry` | Re-queue all previously failed items for another attempt |

## Widget

A one-line status bar appears above the editor when shepherd is active:

| State | Display |
|---|---|
| Off | `not shepherding` |
| Watching | `⟐  watching · ✓ N · ✗ N · ⟡  N` (passed / failed / pending reviews) |
| Fixing | `⟐  fixing <label> … · <progress>` |
| Needs review | `⟐  ⚠ N needs review` |
| Merged | `⟐  ✓ merged!` (auto-closes after 5 s) |

## What it monitors

### CI checks

When a check transitions to `FAILURE` or `CANCELLED`, shepherd:

1. Fetches the failed run logs via `gh run view --log-failed`
2. Compares failing test files against files changed in the PR
3. If none of the failing tests touch changed files, treats it as a flaky failure and reruns the job (`gh run rerun --failed`)
4. Otherwise spawns a Claude subprocess with the log excerpt and a prompt to identify the root cause, apply a minimal fix, and push

### Review comments

New review comments are fetched on each poll cycle and classified by a Claude one-shot call:

- **Actionable** — concrete code change requested (fix, rename, add check). Queued for automatic fixing.
- **Ambiguous** — question, opinion, architectural concern, or vague suggestion. Held for human triage via `/shepherd review`.

The review triage overlay (`/shepherd review`) shows each ambiguous comment with its diff hunk and lets you **Fix** (queue it), **Skip** (dismiss it), or **Reply** (post a GitHub reply inline).

### Merge conflicts

When `pr.mergeable === "CONFLICTING"`, shepherd:

1. Fetches the base branch and attempts a clean rebase
2. If the rebase succeeds, force-pushes with `--force-with-lease`
3. If conflicts remain, spawns Claude with a prompt to use the `solve-conflicts` skill and complete the rebase

## Auto-merge

On first enable, shepherd offers to turn on GitHub auto-merge for the PR. If the repo uses a merge queue, the bare `gh pr merge --auto` form is used. For repos without merge queues, you choose the strategy (squash / rebase / merge commit).

## Stats

`/shepherd status` shows cumulative counts for the session:

| Counter | Meaning |
|---|---|
| `fixed` | Items successfully fixed and pushed |
| `rerun` | Flaky CI failures rerun (or trivial rebases pushed) |
| `skipped` | Items skipped because the git worktree was dirty |
| `failed` | Items where the Claude subprocess or push failed |

Failed items are listed with their error reason and can be retried with `/shepherd retry`.

## Module layout

```
shepherd-pr/
├── index.ts          # Extension entry point, monitor loop, executors, widget, command handler
├── lib/
│   ├── types.ts      # All shared type definitions
│   ├── checks.ts     # CI check summarisation and flaky-failure detection
│   ├── reviews.ts    # Review comment classification and pending count
│   └── gh-helpers.ts # GitHub CLI and git wrappers, exec utilities
└── README.md
```
