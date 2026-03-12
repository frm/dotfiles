---
name: review-pr
description: Review a GitHub PR with context-aware depth. Use when user wants to review a PR, asks about PR changes, or needs help with code review.
argument-hint: <pr-number-or-branch-or-url>
---

# PR Review Skill

Review a pull request and present proposed inline comments for the user to approve before posting.

## Setup

Read `~/.dotfiles/ai/me.md` to get:
- GitHub username
- Teams you're a member of

## Step 1: Gather PR Information

**If given a PR URL (e.g., `https://github.com/owner/repo/pull/123`):**
Extract the PR number from the URL path and use it directly with `gh pr view`.

**If given a PR number:**
```bash
gh pr view $ARGUMENTS --json number,title,body,baseRefName,headRefName,reviewRequests,files,additions,deletions,comments,reviews
```

**If given a branch name:**
```bash
gh pr list --head $ARGUMENTS --json number --jq '.[0].number'
# Then use that number
```

**If the GraphQL API is rate-limited**, fall back to the REST API:
```bash
gh api repos/{owner}/{repo}/pulls/{number} --jq '{number, title, body, base: .base.ref, head: .head.ref, additions, deletions}'
gh api repos/{owner}/{repo}/pulls/{number}/files --paginate --jq '.[].filename'
gh api repos/{owner}/{repo}/pulls/{number}/requested_reviewers --jq '{users: [.users[].login], teams: [.teams[].slug]}'
gh api repos/{owner}/{repo}/pulls/{number}/reviews --jq '[.[] | {user: .user.login, state: .state, body: .body}]'
```

## Step 2: Determine Reviewer Relationship

Check in this order:

1. **Direct reviewer**: Check if username is in `reviewRequests[].login`
2. **Team reviewer**: Check if any team from me.md matches `reviewRequests[]` where `typename == "Team"`
3. **Codeowner**: Parse CODEOWNERS file and check if changed files match user's teams
   ```bash
   cat .github/CODEOWNERS 2>/dev/null || cat CODEOWNERS 2>/dev/null
   gh pr diff $PR --name-only
   ```

## Step 3: Fetch and Compare

```bash
# Fetch the branches
git fetch origin <baseRefName> <headRefName>

# Get the full diff
git diff origin/<baseRefName>...origin/<headRefName>
```

## Step 4: Gather Context

**Existing comments** (to avoid duplicating feedback):
```bash
gh api repos/{owner}/{repo}/pulls/{number}/reviews --jq '[.[] | {user: .user.login, state: .state, body: .body}]'
```

**Linked issues** (parse from PR body for "Fixes #", "Closes #", etc.):
```bash
gh issue view <ISSUE_NUMBER> --json title,body
```

## Step 5: Analyze and Validate Comment Positions

Read changed files to understand the full context (not just the diff hunks).

For each finding, determine the **exact diff-commentable line**:

```bash
# Get diff hunks with line ranges for each file
gh api repos/{owner}/{repo}/pulls/{number}/files --jq '.[] | {filename, patch}'
```

**Rules for comment placement:**
- Every comment MUST target a line that appears in the diff (within a `@@` hunk range on the RIGHT side)
- If a finding is about code that isn't in the diff (e.g., unchanged line 45 in a file where only line 1 changed), place the comment on the nearest changed line in that file and reference the actual line in the comment body
- If there are no nearby changed lines in the file, the comment cannot be inline — note it for the review body instead

## Step 6: Present Proposed Comments

Use `present_plan` to show the user all proposed comments before posting. Format:

```markdown
## PR Review: #<number> - <title>

**Author:** <author> | **Review type:** <type> | **Existing reviews:** <summary>

### Summary
[1-2 sentences on what the PR does and overall assessment]

### Proposed Comments

#### Comment 1 — <severity: Critical / Important / Nit>
**File:** `<file>` line <N>
> <exact comment body to post>

#### Comment 2 — <severity>
**File:** `<file>` line <N>
> <exact comment body to post>

...

### Review Action
**Event:** COMMENT / APPROVE / REQUEST_CHANGES
**Review body:** <optional top-level review summary, or empty>
```

The user will approve, reject, or give feedback to iterate on individual comments (wording, tone, whether to include them).

## Step 7: Post Comments

After the user approves, post all comments as a **single GitHub review** using the REST API:

```bash
# Get the head commit SHA
HEAD_SHA=$(gh api repos/{owner}/{repo}/pulls/{number} --jq '.head.sha')

# Post review with inline comments
gh api repos/{owner}/{repo}/pulls/{number}/reviews \
  --method POST \
  -f event=<COMMENT|APPROVE|REQUEST_CHANGES> \
  -f body="<review body>" \
  -f commit_id="$HEAD_SHA" \
  --input - <<'EOF'
{
  "comments": [
    {
      "path": "<file>",
      "line": <line_number>,
      "side": "RIGHT",
      "body": "<comment body>"
    }
  ]
}
EOF

# Then submit if it was created as PENDING
gh api repos/{owner}/{repo}/pulls/{number}/reviews/{review_id}/events \
  --method POST \
  -f event=<COMMENT|APPROVE|REQUEST_CHANGES>
```

**If a comment fails with 422 "Line could not be resolved":**
- The line is not in the diff. Post it as part of the review body instead.
- Do NOT post it as a standalone `gh pr comment` — keep everything in one review.

## Step 8: Local Checkout (on request)

When the user asks to "check it locally" or "set up a worktree":

```bash
g wt --pr $PR
```

This creates a worktree and copies build artifacts automatically.

**If the worktree already exists**, the command will output the path. Use `g co` to switch to it:

```bash
g co <branch_name>
```

## Review Focus by Relationship

| Relationship | Primary Focus |
|--------------|---------------|
| Direct reviewer | Implementation details, code quality, testing, edge cases |
| Team reviewer | Architecture impact, integration points, team conventions |
| Codeowner | Owned files analysis, implications of changes, backward compatibility |
