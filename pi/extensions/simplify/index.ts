/**
 * Simplify Extension - Review and refine recently changed code
 *
 * Runs 3 analysis subagents in parallel (reuse, quality, efficiency),
 * then delegates to the simplifier agent to apply fixes.
 *
 * Usage:
 *   /simplify                - Simplify recent changes
 *   /simplify src/auth.ts    - Simplify specific scope
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const SIMPLIFY_PROMPT = `Use the subagent tool to run these 3 agents in PARALLEL (use the "tasks" parameter, not "chain"):

1. Agent "simplifier-reuse" — task: "Find reuse opportunities in recently changed code. SCOPE_HINT"
2. Agent "simplifier-quality" — task: "Review recently changed code for clarity, naming, structure, and conventions. SCOPE_HINT"
3. Agent "simplifier-efficiency" — task: "Review recently changed code for performance and efficiency issues. SCOPE_HINT"

Once all 3 complete, synthesize their findings. Discard any findings that are false positives or not worth fixing. Then use the subagent tool to run the "simplifier" agent with a task that includes the consolidated list of real issues to fix. The simplifier will make the actual edits.

After the simplifier completes, briefly report what was changed.`;

export default function (pi: ExtensionAPI) {
	pi.registerCommand("simplify", {
		description: "Review and refine recently changed code (reuse, quality, efficiency)",
		handler: async (args, ctx) => {
			if (!ctx.isIdle()) {
				ctx.ui.notify("Agent is busy, wait for it to finish", "warning");
				return;
			}

			const scope = args.trim();
			const message = scope
				? SIMPLIFY_PROMPT.replace(/SCOPE_HINT/g, `Focus on: ${scope}`)
				: SIMPLIFY_PROMPT.replace(/SCOPE_HINT/g, "");

			pi.sendUserMessage(message);
		},
	});
}
