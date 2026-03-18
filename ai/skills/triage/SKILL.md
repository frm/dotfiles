---
name: triage
description: >
  Triage work from multiple sources. Use when user says "triage my work",
  "what should I focus on", "prioritize my day", "what's next?",
  "pick my next task", or "/triage".
---

# Triage

## Overview

Gather work from multiple sources (Linear, Google Calendar, ad-hoc), apply learned preferences, and help the user decide what to focus on. Learns from choices over time.

**Announce at start:** "Triaging your work..."

## Modes

Determine from the user's phrasing:

- **Triage** — "triage my work", "prioritize my day" → full prioritized view of everything, user picks from list
- **Recommend** — "what's next?", "what should I focus on" → show the top 1-2 recommendations with reasoning, user confirms or asks for the next option
- **Auto** — "pick my next task", "just start something" → auto-pick the highest priority item and set up immediately

## Step 1: Load Preferences

Read `~/.pi/preferences.md`. This file contains:
- **Explicit Rules** — confirmed preferences (meeting prefs, work type prefs, general rules)
- **Observed Patterns** — unconfirmed patterns with observation counts

## Step 2: Check Pending Promotions

If any Observed Patterns have been seen 3 or more times, ask the user about them before starting triage:

"I've noticed you consistently <pattern>. Want me to remember that as a rule?"

Use `questionnaire` to confirm/dismiss each pending promotion. If confirmed, move it to the appropriate Explicit Rules section. If dismissed, remove it from Observed Patterns. Update the file.

Do this quickly — don't let it slow down triage. If there are many pending promotions, batch them into one questionnaire.

## Step 3: Gather Work

Pull from all sources in parallel:

1. **Linear tickets:** Call `linear__list_issues` with `stateType: "unstarted"` (assigned to me).
2. **Calendar events:** Call `calendar__list_events` for today's events (or the next work day if it's evening/weekend). If the calendar tool is not available or not configured, skip silently.
3. **Ad-hoc items:** If the user mentioned anything extra ("I also have a Slack ask from X"), include it.

## Step 4: Apply Preferences & Rank

Score and rank all items:

**Time-sensitivity (highest weight):**
- Meetings starting within the next hour: top priority
- Tickets with deadlines today: high priority
- Meetings later today: medium priority

**Preference rules (from Explicit Rules):**
- Apply meeting preferences: skip low-priority meetings, flag prep-needed meetings
- Apply work type preferences: boost preferred types, deprioritize avoided types
- Apply general rules: e.g. "deep work in the morning" boosts technical tickets before noon

**Observed patterns (lower weight than explicit rules):**
- Use observations to influence ranking but don't override explicit rules

**Default ranking (when no preferences apply):**
- Higher Linear priority first (1=Urgent > 2=High > 3=Medium > 4=Low > 0=None)
- Blocked tickets ranked lower (same blocked definition as find-work skill)

## Step 5: Present Results

### Triage Mode

Present a prioritized view via `questionnaire`. Group items:

1. **Do Now** — time-sensitive or urgent items
2. **Focus Work** — your main work for the day
3. **Can Defer** — lower priority, can wait

Each option shows:
- What it is (ticket ID + title, meeting name + time, ad-hoc description)
- Why it's ranked here (reference specific preferences if applicable)
- Suggested action (prep, start working, defer, skip)

Include blocked Linear tickets but mark them as "(blocked by X)" — same as find-work skill.

### Recommend Mode

Show the top 1-2 items with reasoning:
- What it is and why it's the top recommendation (reference preferences, time sensitivity, priority)
- Suggested action

Then ask: "Want to start on this, or see other options?" If the user wants other options, show the next recommendations or fall back to full triage view.

### Auto Mode

Pick the highest priority non-blocked item. Tell the user what was picked and why (referencing preferences). Immediately proceed to Step 6 to act on it.

## Step 6: Act on Choice

Based on what the user picks:

- **Linear ticket** → call `work__setup` tool with `brainstorm: true`. This creates a worktree, tmux window, and launches pi with `/brainstorm`.
- **Meeting needing prep** → tell the user what to prep for, suggest blocking 15 minutes before. Surface any relevant context from the calendar event (attendees, agenda if in description).
- **Meeting not needing prep** → acknowledge, move on to next item or end triage.
- **Ad-hoc ask** → acknowledge as current focus. No automated action.

After acting on a choice, ask if the user wants to continue triaging remaining items or stop.

## Step 7: Learn from Session (Async)

After the triage session ends, silently update `~/.pi/preferences.md`:

1. **Compare choices against predictions.** If the user consistently overrides a ranking (e.g. always picks bug fixes over architecture despite preferences saying otherwise), log a new observation or increment an existing one.

2. **Log new observations.** Format: `- <observation> (observed 1x)`. Increment count if the observation already exists.

3. **Do not interrupt the user.** This happens after they've moved on. Do not ask questions or present findings during this step. Pending promotions surface at the start of the next triage session (Step 2).

4. **Be conservative.** Only log observations for clear, repeated patterns. A single unusual choice is not a pattern.

## Important

- Preferences file is at `~/.pi/preferences.md` — not committed, personal to the user.
- If calendar is not configured, skip it silently. Don't error or nag about setup.
- If no work is found from any source, just say so.
- The `work__setup` tool handles the full Linear ticket setup (worktree, tmux, brainstorm, Linear update). Don't reimplement that logic.
- Blocked tickets: same definition as find-work skill — `relations` with `type: "blocks"` where related issue state is not completed/cancelled.
- Tone: helpful assistant, not a task master. You're surfacing information and suggesting priorities, not commanding.
