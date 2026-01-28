---
name: codex-plan-review
description: Review a completed plan using Codex CLI and implement feedback. Use when the user says "review the plan", "iterate on the plan", "get codex to review", or after finishing a plan that needs external review.
---

# Plan Review Iteration

Use Codex CLI to review a completed plan and implement any feedback.

## Instructions

1. **Locate the plan**: Find the current plan file path from the conversation context, if unable to find a plan ask the user for a file path.

2. **Run Codex review**: Execute Codex CLI with JSON output pointing to the plan file:

   ```bash
   codex exec --full-auto --json "Review the implementation plan at <PLAN_FILE_PATH> and provide feedback on:

   1. SIMPLICITY: Is the implementation as simple as possible? Does it avoid over-engineering, unnecessary abstractions, or premature optimization?
   2. ROBUSTNESS: Does it handle errors appropriately? Are edge cases considered? Is it resilient to failures?
   3. REUSE: Does the plan leverage existing functions/modules in the codebase, or does it propose writing new code that duplicates existing functionality? Search the codebase for existing implementations before suggesting new code.
   4. SECURITY: Are there any potential security concerns?
   5. COMPLETENESS: Does it cover all requirements and edge cases?
   6. CODE QUALITY: Is the implementation approach sound? Are the patterns appropriate?

   Be specific about any issues found and suggest concrete improvements."
   ```

3. **Extract the session ID**: Parse the JSON output for the `thread.started` event to get the `thread_id`:

   ```json
   {
     "type": "thread.started",
     "thread_id": "0199a213-81c0-7800-8aa1-bbab2a035a53"
   }
   ```

   Save this `thread_id` for use in resume commands.

4. **Handle timeout with resume**: If the command times out (hits the 5 minute bash timeout), resume using the specific session ID:

   ```bash
   codex exec resume <THREAD_ID> "Continue the plan review and provide your findings."
   ```

   Keep resuming until Codex completes its review. Each resume continues from where the previous session left off.

   **Important**: After 3 consecutive timeouts (~15 minutes total), ask the user if they want to continue before resuming again. This prevents runaway sessions and gives the user control over long-running reviews.

5. **Parse the JSON output**: Extract the feedback from Codex's structured response.

6. **Present feedback**: Summarize Codex's findings for the user.

7. **Implement changes**: Update the plan based on Codex's feedback:
   - Simplify over-engineered approaches
   - Improve error handling and robustness
   - Replace new code proposals with references to existing functions where applicable
   - Fix security concerns
   - Address completeness gaps
   - Improve implementation approaches and code quality

8. **Iterate if needed**: If significant changes were made, consider running another review pass.

## Example

User: "Review the plan with codex"

1. Identify plan file path from conversation (e.g., `/tmp/plan-abc123.md`)
2. Run: `codex exec --full-auto --json "Review the implementation plan at /tmp/plan-abc123.md..."`
3. Extract `thread_id` from the `thread.started` event (e.g., `"0199a213-81c0-7800-8aa1-bbab2a035a53"`)
4. If timeout occurs, run: `codex exec resume "0199a213-81c0-7800-8aa1-bbab2a035a53" --full-auto --json "Continue the plan review and provide your findings."`
5. Repeat step 4 until Codex completes (after 3 timeouts, ask user before continuing)
6. Parse JSON output for feedback items
7. Present summary to user
8. Update plan with approved changes

## Notes

- Codex requires being in a git repository
- `--full-auto` allows Codex to explore the codebase
- `--json` provides structured JSON Lines output for parsing
- Progress streams to stderr, final output to stdout
- The `thread_id` from the `thread.started` event uniquely identifies the session for resume
