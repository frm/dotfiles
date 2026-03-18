---
name: find-work
description: >
  Find and set up Linear tickets to work on. Use when user says "find work",
  "what should I work on", "show me tickets", "setup some work", "get started
  on something", "start working", "get some work done", or similar phrases
  about finding or starting work.
---

# Find Work

## Overview

Help the user find Linear tickets and set up a development environment for them. Detect three escalating intent levels from the user's phrasing.

**Announce at start:** "Looking for work on Linear..."

## Intent Modes

Determine the mode from the user's phrasing:

- **Browse** — "find work", "what should I work on", "show me tickets", "any tickets?" → Present options, user picks. After setup, launches pi with `/brainstorm` on the ticket.
- **Setup** — "setup some work", "get started on something", "start working" → Auto-pick and set up immediately. No brainstorm.
- **Full** — "get some work done", "let's get some work done" → Auto-pick, set up, launch pi with `/brainstorm` on the ticket, then `/writing-plans` after the brainstorm completes.

## Step 1: Fetch Assigned Tickets

Call `linear__list_issues` with `stateType: "unstarted"` (defaults to assigned-to-me).

If tickets are found, proceed based on mode. If none found, go to **Fallback** (regardless of mode).

## Step 2a: Browse Mode — Present Options

1. Present tickets via `questionnaire`. Each option should show:
   - Identifier and title as the label
   - Priority and state in the description
   - If the ticket is blocked (has a `relations` entry where `type` is `"blocks"` and the related issue's `state.type` is not `completed` or `cancelled`), append "(blocked by ISSUE-ID)" to the label
2. User selects one → proceed to **Setup Step**.

## Step 2b: Setup / Full Mode — Auto-Pick

1. Filter out blocked tickets (see blocked definition above).
2. From remaining, pick the best ticket:
   - Highest priority first (1=Urgent > 2=High > 3=Medium > 4=Low > 0=None).
   - If priorities tie, fetch full details of the tied tickets with `linear__fetch_issue` and read their descriptions to judge which seems most urgent or impactful.
3. If all tickets are blocked, go to **Fallback**.
4. Tell the user which ticket was picked and why.
5. Proceed to **Setup Step**.

## Setup Step

Once a ticket is selected, use the `work__setup` tool to create the worktree and tmux window:

- **Browse mode:** `work__setup(identifier: "<TICKET-ID>", brainstorm: true)`
- **Setup mode:** `work__setup(identifier: "<TICKET-ID>", brainstorm: false)`
- **Full mode:** `work__setup(identifier: "<TICKET-ID>", brainstorm: true, planAfterBrainstorm: true)`

The `work__setup` tool handles everything: fetching the ticket, detecting the default branch, generating the branch name (`frm/<ticket-id>/<slug>`), creating a tmux window with a worktree, launching pi with `/brainstorm` if requested, assigning the ticket, and moving it to In Progress.

## Brainstorm → Plan Flow (Full Mode)

In Full mode, `work__setup` launches pi with a `/brainstorm` prompt and an instruction to follow up with `/writing-plans` after the design is written. Both skills run in the new pi session — the current session's job is done after setup.

## Fallback: No Assigned Tickets

When no unstarted tickets are assigned (regardless of original mode):

1. Tell the user: "No unstarted tickets assigned to you. Checking your projects for unassigned work..."
2. Call `linear__list_my_projects` to get projects you're a member of.
3. For each project, call `linear__list_issues` with:
   - `assignedToMe: false`
   - `unassigned: true`
   - `projectId: <project-id>`
   - `stateType: "unstarted"`
4. If fewer than 5 candidates, also query with `stateType: "backlog"` for remaining projects.
5. Combine results. Sort by: unstarted before backlog, then highest priority first.
6. Pick 5-7 candidates.
7. **Always present via questionnaire** — never auto-pick from unassigned work.
8. After user picks → proceed to **Setup Step**.

If no tickets found across all projects: "No unassigned tickets found in your projects either. Nothing to work on!"

## Important

- Never auto-pick unassigned tickets. Always ask.
- Blocked = has a `relations` node with `type: "blocks"` where the related issue's state type is not `completed` or `cancelled`.
