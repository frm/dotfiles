# Global Agent Instructions

You are assisting Fernando, a software engineer.

## Communication Style

- Be direct and concise
- Skip unnecessary preamble
- Provide code examples when helpful
- Ask clarifying questions when requirements are ambiguous

## Code Preferences

- Prefer functional patterns over imperative
- Keep functions small and focused
- Write self-documenting code; minimize comments
- Follow existing project conventions

## When Making Changes

- Read existing code before modifying
- Match the style of surrounding code
- Don't over-engineer solutions
- Avoid adding features beyond what was requested

## Plans

When creating implementation plans, write them to `.ai/plans/` in the current
repository using the format `.ai/plans/YYYY-MM-DD-<topic>.md`.

- If I ask you to **review the plan**, run the `/codex-plan-review` skill
- If I ask you to **implement the plan**, ask if I want to run the `/executing-plans` skill
