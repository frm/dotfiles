---
name: review-pr
description: Review a GitHub PR with context-aware depth. Use when user wants to review a PR, asks about PR changes, or needs help with code review.
argument-hint: <pr-number-or-branch>
---

# PR Review Skill

Review a pull request with context-aware depth based on your relationship to the PR.

## Setup

Read `~/.dotfiles/ai/me.md` to get:
- GitHub username
- Teams you're a member of

## Step 1: Gather PR Information

**If given a PR number:**
```bash
gh pr view $ARGUMENTS --json number,title,body,baseRefName,headRefName,reviewRequests,files,additions,deletions,comments,reviews
```

**If given a branch name:**
```bash
gh pr list --head $ARGUMENTS --json number --jq '.[0].number'
# Then use that number
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

# Get the diff
gh pr diff $PR
```

## Step 4: Gather Context

**Existing comments** (to avoid duplicating feedback):
```bash
gh pr view $PR --json comments,reviews
```

**Linked issues** (parse from PR body for "Fixes #", "Closes #", etc.):
```bash
gh issue view <ISSUE_NUMBER> --json title,body
```

## Step 5: Generate Review

Follow the template in [review-template.md](review-template.md) for output format.

**Focus based on relationship:**

| Relationship | Primary Focus |
|--------------|---------------|
| Direct reviewer | Implementation details, code quality, testing, edge cases |
| Team reviewer | Architecture impact, integration points, team conventions |
| Codeowner | Owned files analysis, implications of changes, backward compatibility |

## Step 6: Local Checkout (on request)

When the user asks to "check it locally" or "set up a worktree":

```bash
g wt --pr $PR
```

This creates a worktree and copies build artifacts automatically.

**If the worktree already exists**, the command will output the path. Use `g co` to switch to it:

```bash
g co <branch_name>
```
