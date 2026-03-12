---
name: solve-conflicts
description: >
  Resolve git conflicts with structured analysis. Use when the user has merge/rebase/cherry-pick/revert
  conflicts and needs help resolving them. Enters plan mode to explain both sides, then applies surgical fixes.
  Supports auto-accept mode for programmatic callers.
---

# Solve Git Conflicts

Resolve git conflicts through structured analysis and surgical edits.

## Auto-Accept Mode

When the user says "auto-accept" (or similar phrasing like "automatically accept the plan", "don't ask for approval", "skip plan approval"):

- **Phase 2:** Skip step 5 (asking the user if the strategy looks right). Proceed directly to Phase 3.
- **Phase 3:** Skip the review summary and test suggestions — just resolve and format.
- **Phase 4:** Execute `git add` and commit without waiting for approval. Run the continue command automatically.

This mode is intended for programmatic callers (e.g., the shepherd-pr extension) where human review is not available.

## Phase 1: Detection

Run these checks in parallel:

1. **Detect the active git operation** by checking which of these exist:
   - `.git/rebase-merge/` or `.git/rebase-apply/` -> rebase
   - `.git/MERGE_HEAD` -> merge
   - `.git/CHERRY_PICK_HEAD` -> cherry-pick
   - `.git/REVERT_HEAD` -> revert

2. **List conflicting files**: `git diff --name-only --diff-filter=U`

3. **Extract the Linear issue** from:
   - The branch name (look for patterns like `RVR-\d+` or `rvr-\d+`)
   - If not found, check the last commit message before the conflict
   - Store this for the commit message later; if not found, you'll use a scope fallback

If no git operation is in progress OR no conflicting files exist, tell the user there are no conflicts to resolve and stop.

## Phase 2: Understanding (Plan Mode)

**Enter plan mode immediately.** Do NOT attempt to fix conflicts without planning first.

Build a single holistic picture across ALL conflicting files. Do not analyze file-by-file in isolation — conflicts often share context across files.

### Steps

1. **Understand what "theirs" did**: examine incoming commits that touched the conflicting files. Use `git log` on the incoming side to find relevant commits. Summarize the overarching intent of their changes as a whole (e.g., "Master refactored the fee module: renamed functions, moved to a new namespace, updated all callers").

2. **Understand what "ours" did**: same for the current branch. Summarize the full intent (e.g., "Our branch added zero-amount fee exemptions across the fee calculation path").

3. **Explain why the conflicts exist**: connect both narratives into a single explanation (e.g., "Both branches modified the fee calculation path — master restructured while ours added new logic").

4. **Propose a resolution strategy**: a single cohesive plan covering ALL conflicting files, explaining how to reconcile both intents. Lead with your recommendation. Note alternatives only if there's genuine ambiguity.

5. **Ask the user if the strategy looks right** before proceeding. Do not exit plan mode until they approve. **If auto-accept is active, skip this step and proceed immediately.**

### How to get commit context

For **rebase**, the incoming commit info is in `.git/rebase-merge/`:
- `git log --oneline HEAD..ORIG_HEAD -- <conflicting files>` for commits being rebased
- `git log --oneline ORIG_HEAD..HEAD -- <conflicting files>` for new base commits

For **merge**, use:
- `git log --oneline HEAD -- <conflicting files>` for our side
- `git log --oneline MERGE_HEAD -- <conflicting files>` for their side

For **cherry-pick/revert**, check the relevant HEAD file for the source commit.

## Phase 3: Resolution

Once the user approves, exit plan mode and apply fixes:

1. **Surgical edits only**: for each conflicting file:
   - Read the file
   - Identify conflict marker regions (`<<<<<<<`, `=======`, `>>>>>>>`)
   - Use the `Edit` tool to replace ONLY the conflict regions with the agreed resolution
   - Do NOT rewrite entire files

2. **Format**: based on which files were resolved:
   - Elixir files (`.ex`, `.exs`, `.heex`): run `mix format`
   - JS/TS files (`.js`, `.ts`, `.jsx`, `.tsx`, `.css`, `.json`): read the nearest `package.json` to determine the package manager and available scripts, then run the lint and format scripts if they exist
   - Other languages: check for a project formatter (e.g., `Makefile`, config files for `prettier`, `black`, `rustfmt`, `gofmt`, etc.) and run it if found; otherwise skip formatting

3. **Review**: show a brief summary of what was resolved in each file so the user can sanity-check.

4. **Suggest tests**: based on which files were resolved:
   - Elixir files: suggest `mix test` (with specific test files if identifiable)
   - JS/TS files: read the nearest `package.json` to determine the package manager and test script, then suggest the appropriate test command (with specific test files if identifiable)
   - Other languages: look for a test runner in the project (e.g., `Makefile` test target, `cargo test`, `go test`, `pytest`, `rspec`) and suggest the appropriate command with specific test files if identifiable

## Phase 4: Wrap Up

### Commit proposal

Check if the sandbox is active by looking at the tool permissions context.

**If sandbox is OFF:**
- Propose `git add` for the resolved files
- Propose a commit message in conventional commits format:
  - With Linear issue: `<type>(<LINEAR-ISSUE>): <description>` (e.g., `fix(RVR-12345): resolve rebase conflicts in fee calculation`)
  - Without issue (fallback): `<type>(<scope>): <description>` (e.g., `fix(pricing): resolve rebase conflicts in fee calculation`)
- Wait for user approval before executing either command
- **If auto-accept is active:** execute `git add` and commit without waiting for approval

**If sandbox is ON:**
- Tell the user they cannot commit in sandbox mode
- Print the proposed commit message so they can copy it

### Continue command

Based on the operation detected in Phase 1, suggest the appropriate command:
- Rebase: `git rebase --continue`
- Merge: `git merge --continue`
- Cherry-pick: `git cherry-pick --continue`
- Revert: `git revert --continue`

Remind the user to run this after committing (or staging, depending on the operation). **If auto-accept is active, run the continue command automatically.**

## Important Rules

- ALWAYS enter plan mode before touching any files
- NEVER guess at conflict resolution without understanding both sides
- NEVER rewrite entire files — surgical edits on conflict regions only
- ALWAYS run the appropriate formatter after resolving
- ALWAYS ask the user to verify before committing (unless auto-accept is active)
- Handle the case where some conflicts are straightforward and others need discussion
