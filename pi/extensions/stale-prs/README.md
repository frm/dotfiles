# Stale PR Nudger

Background extension that detects stale pull requests and publishes notifications to nudge action. Checks every hour (configurable) for PRs awaiting your review and your own PRs waiting on reviewers.

## How it works

On `session_start`, the extension runs an immediate check then starts a timer. Each tick:

1. Fetches review-requested PRs and your own open PRs via `gh pr list`
2. Classifies staleness from `max(createdAt, latestReviewActivity, updatedAt)`
3. Publishes or dismisses notifications based on current stale set

**Exclusions:** Draft PRs, approved PRs, PRs in merge queue, and PRs you've already reviewed are excluded.

## Notification types

### Reviews you owe

- **Title:** `PR #142 by alice needs your review (open 2 days)`
- **Summary:** PR title
- **Action:** `stale-prs:review` — sends `/review-pr <number>` to the active pi session

### Your own stale PRs

- **Title:** `Your PR #98 has been waiting 3 days for review`
- **Summary:** PR title + requested reviewers
- **Action:** `stale-prs:ping-reviewers` — confirms, then posts a `gh pr comment` pinging missing reviewers

## Config

Namespace `"stale-prs"` in `.pi/config.json`:

| Option | Type | Default | Description |
|---|---|---|---|
| `enabled` | boolean | `true` | Enable/disable the extension |
| `reviewOwedHours` | number | `24` | Hours before nudging about a review you owe |
| `ownPrStaleHours` | number | `48` | Hours before nudging about your own stale PR |
| `pollIntervalMinutes` | number | `60` | How often to check (minutes) |
| `snoozeDurationHours` | number | `4` | How long snooze lasts when dismissing a notification |
