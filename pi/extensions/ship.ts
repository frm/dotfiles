/**
 * Ship Extension - Commit, push, and open a PR in one command
 *
 * Uses the shipper subagent to analyze changes, then confirms with the user
 * via questionnaire before executing git commands.
 *
 * Usage:
 *   /ship                       - Ship with auto-generated description
 *   /ship added dark mode       - Ship with a description hint
 *   /ship --simplify            - Run simplifier before shipping
 *   /ship -s added dark mode    - Simplify then ship with hint
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const SIMPLIFY_STEP = `First, run the simplify pipeline before analyzing for commit:

Use the subagent tool to run these 3 agents in PARALLEL (use the "tasks" parameter):
1. Agent "simplifier-reuse" — task: "Find reuse opportunities in recently changed code."
2. Agent "simplifier-quality" — task: "Review recently changed code for clarity, naming, structure, and conventions."
3. Agent "simplifier-efficiency" — task: "Review recently changed code for performance and efficiency issues."

Synthesize findings and discard false positives. If there are real issues worth fixing, use the subagent tool to run the "simplifier" agent with the consolidated issues to apply fixes.

After simplification is complete (or if there were no issues), proceed to the shipping steps below.

`;

const SHIP_PROMPT = `SIMPLIFY_PLACEHOLDERUse the subagent tool to delegate to the "shipper" agent. The task is to analyze the current git changes and draft a commit message and PR description.

HINT_PLACEHOLDER

Once the shipper agent returns its analysis, follow these steps:

1. Parse the shipper's JSON output to extract: filesToStage, commitMessage, prExists, prUrl, prTitle, prBody, summary, branch, baseBranch.

2. Use the questionnaire tool to confirm with the user. Show the summary and proposed commit message. Keep the prompt text SHORT — put the summary on one line and the commit message on the next. Do NOT include the full PR description. Use these EXACT options with allowInput set:
   - { value: "ship", label: "Looks good, ship it" }
   - { value: "suggest", label: "Suggest change", allowInput: true, description: "Your input guides the LLM to redraft the message" }
   - { value: "override", label: "Fine, I'll do it myself", allowInput: true, description: "Your input becomes the literal commit message" }
   - { value: "cancel", label: "Cancel" }
   Set allowOther to false on the question.

   If the user selects "Suggest change", their input is guidance — re-draft the commit message based on their suggestion and use the new one.
   If the user selects "Fine, I'll do it myself", their input IS the literal commit message — use it exactly as typed.

3. If confirmed:
   - Before staging, run the project's formatter on the changed files. Detect it from the project config (e.g. package.json scripts, Makefile, biome.json, .prettierrc, rustfmt.toml, etc.). If you can't determine a formatter, skip this step.
   - Stage the files by name (from filesToStage — NOT git add -A)
   - Commit with the message (use HEREDOC format). If the user edited the message, use their version.
   - Check if a remote branch exists; if not, push with -u to set upstream
   - If remote branch exists, push --force-with-lease

4. After pushing:
   - If prExists is true, just confirm the push and show the existing PR URL
   - If prExists is false, create a PR using gh pr create with the drafted prTitle and prBody (use HEREDOC for body)
   - Return the PR URL

Do NOT skip steps or ask additional questions outside of the questionnaire step.`;

export default function (pi: ExtensionAPI) {
  pi.registerCommand("ship", {
    description: "Commit, push, and open a PR. Use --simplify or -s to run simplifier first.",
    handler: async (args, ctx) => {
      if (!ctx.isIdle()) {
        ctx.ui.notify("Agent is busy, wait for it to finish", "warning");
        return;
      }

      let remaining = args.trim();
      let simplify = false;

      if (remaining.startsWith("--simplify") || remaining.startsWith("-s")) {
        simplify = true;
        remaining = remaining.replace(/^(--simplify|-s)\s*/, "").trim();
      }

      let message = SHIP_PROMPT;
      message = message.replace("SIMPLIFY_PLACEHOLDER", simplify ? SIMPLIFY_STEP : "");
      message = remaining
        ? message.replace("HINT_PLACEHOLDER", `The user described the changes as: "${remaining}". Pass this hint to the shipper agent as part of the task.`)
        : message.replace("HINT_PLACEHOLDER", "");

      pi.sendUserMessage(message);
    },
  });
}
