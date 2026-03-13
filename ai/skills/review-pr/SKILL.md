---
name: review-pr
description: Review a GitHub PR with context-aware depth. Use when user wants to review a PR, asks about PR changes, needs help with code review, or says "review PR".
argument-hint: <pr-number-or-branch-or-url>
---

# PR Review Skill

Review a pull request and present proposed inline comments for the user to approve before posting.

## Setup

Read `~/.dotfiles/ai/me.md` to get:
- GitHub username
- Teams you're a member of

## Step 1: Resolve PR Number

**If given a PR URL (e.g., `https://github.com/owner/repo/pull/123`):**
Extract the PR number from the URL path.

**If given a PR number:**
Use it directly.

**If given a branch name:**
```bash
gh pr list --head $ARGUMENTS --json number --jq '.[0].number'
```

## Step 2: Gather PR Information

```bash
gh pr view $PR_NUMBER --json number,title,body,author,baseRefName,headRefName,reviewRequests,files,additions,deletions,comments,reviews
```

**If the GraphQL API is rate-limited**, fall back to REST:
```bash
gh api repos/{owner}/{repo}/pulls/{number} --jq '{number, title, body, base: .base.ref, head: .head.ref, additions, deletions}'
gh api repos/{owner}/{repo}/pulls/{number}/files --paginate --jq '.[].filename'
gh api repos/{owner}/{repo}/pulls/{number}/requested_reviewers --jq '{users: [.users[].login], teams: [.teams[].slug]}'
gh api repos/{owner}/{repo}/pulls/{number}/reviews --jq '[.[] | {user: .user.login, state: .state, body: .body}]'
```

## Step 3: Gather Context

### Linear ticket
1. Extract ticket ID from branch name (pattern: `prefix/TEAM-123/description`)
2. If not found, parse PR body for Linear URLs (`linear.app/.../{identifier}`)
3. If found, fetch the issue using `linear_fetch_issue` tool if available, otherwise:
```bash
curl -s -X POST -H "Content-Type: application/json" \
  -H "Authorization: $(jq -r '.linear["api-key"]' ~/.pi/agent/auth.json)" \
  -d '{"query":"query($filter:IssueFilter){issues(filter:$filter,first:1){nodes{identifier title description url state{name}}}}","variables":{"filter":{"team":{"key":{"eq":"TEAM"}},"number":{"eq":123}}}}' \
  https://api.linear.app/graphql
```

### Linked GitHub issues
Parse PR body for "Fixes #N", "Closes #N", "Resolves #N":
```bash
gh issue view <ISSUE_NUMBER> --json title,body
```

### Existing reviews
```bash
gh api repos/{owner}/{repo}/pulls/{number}/reviews --jq '[.[] | {user: .user.login, state: .state, body: .body}]'
```

## Step 4: Determine Review Mode

1. **Direct reviewer**: username is in `reviewRequests[].login`
2. **Team reviewer**: any team from me.md matches `reviewRequests[]` (where `typename == "Team"`), OR changed files match user's teams in CODEOWNERS

For team reviews, determine scope:
```bash
cat .github/CODEOWNERS 2>/dev/null || cat CODEOWNERS 2>/dev/null
```
Match changed files against CODEOWNERS entries for the user's teams. Only files matching are in-scope.

## Step 5: Fetch Diff

**Important: do NOT modify the working tree.** No `git checkout`, `git apply`, `git stash`, `git merge`, or `git add`. The review runs on the user's current branch — only compare remote refs.

```bash
git fetch origin <baseRefName> <headRefName>
git diff origin/<baseRefName>...origin/<headRefName>
```

To read a file as it appears on the PR branch (without checking it out):
```bash
git show origin/<headRefName>:<file_path>
```

For team reviews, also get the scoped diff (only in-scope files):
```bash
git diff origin/<baseRefName>...origin/<headRefName> -- <in-scope-files...>
```

## Step 6: Analyze

**Reminder: do NOT modify the working tree.** Use `git show origin/<headRefName>:<path>` to read PR files without checkout. Use `git diff origin/<base>...origin/<head>` for comparisons.

### If `subagent` tool is available (pi)

Use the parallel agent pipeline:

1. **Chain step 1** — Run `reviewer-context` agent with PR number, providing all gathered context
2. **Parallel step** — Run these agents simultaneously, each receiving the context output:
   - `reviewer-correctness` — logic bugs, edge cases, error handling
   - `reviewer-architecture` — module boundaries, coupling, integration
   - `reviewer-security` — high-confidence vulnerabilities only
   - `reviewer-quality` — readability, naming, duplication, test gaps, exceptional work
   - `reviewer-risk` — migrations, breaking changes, deployment concerns
3. **Chain step 2** — Run `reviewer-synthesizer` with all agent outputs to produce the final review

The synthesizer uses `present_plan` to show the review to the user.

For team reviews, pass only the scoped diff to the analysis agents in step 2.

### If `subagent` is NOT available (Claude Code, Codex)

Do all analysis sequentially in-context. Read changed files to understand full context (not just diff hunks), then produce the review in the output format below.

## Step 7: Present Review

Use `present_plan` to show the review. The output follows this structure:

```markdown
## PR Review: #<number> — <title>

**Author:** <author> | **Review type:** <direct|team> | **Existing reviews:** <summary>

### Context
[What the PR achieves and why. Narrative paragraph sourced from PR body, Linear ticket, and linked issues. Include Linear ticket reference if available.]

### Overview
[How the PR achieves it, at component level. Which parts of the system are touched and what each change does. For team reviews: briefly mention out-of-scope areas in passing ("also modifies the Stripe adapter — outside your scope"), focus detail on in-scope files only.]

### Attention Areas
[Only if there are concerns. Grouped by type: correctness, architecture, security, quality. Each with file:line and explanation of *why* it's a concern. For team reviews: only in-scope files.

Omit entirely if the PR is clean — don't manufacture concerns, be concrete and pragmatic.

Praise exceptional work rarely — if something is genuinely well done, a brief ❤️ or "nice" with file:line and what stands out.]

### Risk Assessment
[Only if there's concrete risk: migrations, breaking changes, data loss, deployment ordering. Omit for straightforward PRs. Be pragmatic — don't manufacture risks.]

### Reading Order
[Brief — 2-3 bullets suggesting where to start in the diff. Omit for small PRs.]

### Inline Comments

#### Comment 1 — <severity: Critical / Important / Nit>
**File:** `<file>` line <N>
> <exact comment body to post>

[If no inline comments: "No inline comments — the implementation is clean."]

### Suggested Action
**Event:** COMMENT | APPROVE | REQUEST_CHANGES
**Review body:** <top-level review summary, or empty>
```

The user will approve, reject, or give feedback to iterate.

## Step 8: Validate Comment Positions

Before posting, verify each inline comment targets a diff-commentable line:

```bash
gh api repos/{owner}/{repo}/pulls/{number}/files --jq '.[] | {filename, patch}'
```

- Every comment MUST target a line within a `@@` hunk range on the RIGHT side
- If a finding references a line not in the diff, move it to the review body
- If there are no nearby changed lines in the file, the comment cannot be inline

## Step 9: Post Review

After the user approves, post as a **single GitHub review**:

```bash
HEAD_SHA=$(gh api repos/{owner}/{repo}/pulls/{number} --jq '.head.sha')

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
```

**If a comment fails with 422 "Line could not be resolved":**
- The line is not in the diff. Add it to the review body instead.
- Do NOT post it as a standalone `gh pr comment` — keep everything in one review.

## Step 10: Local Checkout (on request)

When the user asks to "check it locally" or "set up a worktree":

```bash
g wt --pr $PR
```

If the worktree already exists:
```bash
g co <branch_name>
```
