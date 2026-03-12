---
name: commit
description: Generate a commit message for staged changes. Use when user says "/commit" or asks to create a commit message.
---

# Commit Message Generator

## Overview

Generate well-structured commit messages for staged changes. This skill suggests commit messages but does NOT commit - the user decides when to commit.

## Commit Message Format

```
<type>(<ticket>): <title>

Why:
* Bullet points summarizing the problem in a way anyone with minimal context can understand
* Keep it concise but clear

How:
* Overview of the implementation approach
* Don't go into too many technical details
* Explain how the problems in "Why" were addressed
```

## Types

- `feat`: New feature or functionality
- `fix`: Bug fix
- `refactor`: Code refactoring without changing behavior
- `chore`: Maintenance tasks, dependencies, tooling
- `docs`: Documentation changes
- `test`: Adding or updating tests
- `style`: Code style/formatting changes

## Ticket Extraction

Extract the ticket from the branch name. Branch format is typically:
- `<initials>/<ticket>/<description>` (e.g., `frm/proj-123/feature-name`)
- If no ticket, use whatever is between initials and description as a namespace
- If no ticket or namespace can be extracted (e.g., `main`, `master`), use a short scope derived from the area of the codebase being changed (e.g., `pi`, `nvim`, `zsh`)

## Process

1. **Analyze changes**: Run `git diff --staged` and `git status` to understand what changed. Only consider staged changes unless explicitly told to include all changed files. If told to include all changes, run `git add -A` to stage everything first.
2. **Extract ticket**: Get branch name with `git branch --show-current` and extract ticket
3. **Generate message**: Create a commit message following the format above
4. **Present to user**: Display the suggested commit message in a code block
5. **Iterate**: If the user provides feedback, refine the message accordingly
6. **Offer to commit**: Present the message and ask to commit in the same step. If the user gives feedback, iterate. In sandbox mode, copy to clipboard using `pbcopy` instead.

## Important Rules

- **Offer to commit with suggestion** - When presenting the message, ask "Want me to commit, or would you like to adjust anything?"
- **In sandbox mode** - If sandbox is active (no git write permissions), copy to clipboard instead of committing
- **Use exact message** - Never add co-authored-by lines, AI attribution, or any other text to the commit message
- **Be concise** in the "Why" section - anyone should understand the problem quickly
- **Be high-level** in the "How" section - avoid implementation minutiae
- **Wait for feedback** - The user may want to iterate on the message

## Example Output

When presenting a commit message, format it like this:

```
feat(proj-123): add user authentication flow

Why:
* Users had no way to log into the application
* Session management was missing, causing security concerns

How:
* Added login/logout endpoints with JWT token handling
* Implemented session storage with Redis for scalability
* Added middleware to protect authenticated routes
```

Then ask: "Want me to commit, or would you like to adjust anything?"

If in sandbox mode, copy to clipboard instead of offering to commit.
