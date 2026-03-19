---
name: manual-testing
description: >
  Drive a browser to manually test UI changes. Use when user says "manually test",
  "manual test", "setup manual testing", or asks to test a specific flow in the browser.
---

# Manual Testing

## Overview

Use the Playwright browser tools to test UI changes. Either test autonomously and return
screenshots as proof, or set up the browser for the user to test manually.

## Trigger Modes

Determine what to test based on context:

1. **Explicit instruction** — User says "manually test the signup flow" → use their instruction directly, no diff analysis.
2. **Current changes** — User says "manually test" and there are staged/unstaged changes → run `git diff HEAD` to understand what changed, reason about which UI flows are affected.
3. **Recent commits** — User says "manually test" and working tree is clean → run `git diff $(git merge-base HEAD main)..HEAD` (try `master` if `main` doesn't exist) to find what changed across recent commits.

## Testing a PR Branch

When testing changes from a PR (not local changes), create a worktree first so you don't disturb the current working tree:

1. Run `git wt --pr <number>` to create a worktree for the PR branch
2. `cd` into the new worktree directory
3. Start the server there (see Server Start Command below)
4. Proceed with the normal test flow

## Server Start Command

Determine how to start the dev server:

1. **Config**: `fetch_config` with key `server` — the project's `.pi/config.json` may specify the exact command (e.g. `"alto react dev"`)
2. **Project config files**: check for scripts in `package.json`, `Makefile`, or framework-specific configs
3. **Common defaults**: try `mix phx.server` (Phoenix), `npm run dev` / `yarn dev` (JS), `make dev`, etc.

## Execution Modes

### Autonomous Mode (default)
Trigger: "manually test", "test the changes", etc.

1. Determine what to test (see trigger modes above)
2. Detect the base URL: check `manual-testing.baseUrl` config via `fetch_config`, or inspect project config files / running processes / try common defaults (4000, 3000, 5173)
3. Launch browser in headless mode via `browser_launch`
4. Handle auth if needed (see Auth section)
5. Navigate to affected pages, interact as a user would
6. Take screenshots at each meaningful state transition (page load, form fill, submission, result)
7. Close browser via `browser_close`
8. Report: summary of what was tested, what was observed, and screenshot paths

### Guided Mode
Trigger: "setup manual testing", "set up the browser for me to test"

1. Same as autonomous steps 1-4
2. Launch browser in **headed** mode (`headless: false`)
3. Navigate to the relevant screen where the changes are visible
4. Tell the user exactly what to look at and what to try
5. Do NOT close the browser — leave it open for the user
6. Do NOT take excessive screenshots — one to confirm you're on the right page

## Auth

Try in order:
1. Check config for credentials: `fetch_config` with key `manual-testing.credentials` — expects `{ email, password }`
2. Inspect the codebase for seed files, test fixtures, or factory definitions that contain test credentials
3. If nothing found, ask the user for credentials

When you have credentials, look at the page for a login form. Use `browser_read_page` to find input fields, fill them with `browser_type`, and submit.

## Base URL Detection

Try in order:
1. Config: `fetch_config` with key `manual-testing.baseUrl`
2. Check environment files in the project root for port overrides. **Worktrees often have their own env config with unique ports to avoid conflicts** — always check these before falling back to defaults:
   - `.env` — look for `PORT`, `VITE_DEV_PORT`, `ALTO_WEB_PORT`, etc.
   - `.envrc` — direnv config, may export port variables
   - `.mise.toml` — mise config, check `[env]` section for port variables
3. Check project config files for port/host settings (e.g. `config/dev.exs`, `next.config.js`, `vite.config.ts`) — these often reference env vars found in step 2
4. Check running processes for common dev server ports
5. Fall back to common defaults: `http://localhost:4000` (Phoenix), `http://localhost:3000` (Next/Rails), `http://localhost:5173` (Vite)

## Test Summary

After every test run (autonomous mode), present a clear summary:

1. **Result** — ✅ Success or ❌ Failure, with a one-line verdict
2. **What was tested** — brief description of the flow(s) exercised
3. **Screenshots** — numbered list of every screenshot taken, with a short description of what it shows:
   ```
   1. /tmp/manual-test-1234/step-001.png — Login page loaded
   2. /tmp/manual-test-1234/step-002.png — Filled credentials, about to submit
   3. /tmp/manual-test-1234/step-003.png — Dashboard after login, settings link visible
   4. /tmp/manual-test-1234/step-004.png — Settings page with updated email field
   ```
4. **Issues found** — if anything looked wrong, describe what and which screenshot shows it

## Guidelines

- Use `browser_read_page` before interacting to understand page structure
- After clicking or submitting, wait for the page to settle before screenshotting
- If something fails (element not found, navigation error), try an alternative approach rather than giving up
- Keep screenshot count reasonable — capture state transitions, not every micro-step
- In guided mode, be specific about what the user should test: "Click the Save button and verify the toast notification appears"
