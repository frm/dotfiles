/**
 * Present Plan Extension
 *
 * Custom tool: present_plan — agent calls with markdown plan, user sees scrollable overlay.
 * Command: /plan — reopens the last presented plan.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { ENTRY_TYPE } from "./lib/types.ts";
import { showPlanOverlay } from "./lib/overlay.ts";

export default function presentPlan(pi: ExtensionAPI) {
	let latestPlan: string | null = null;
	let previousPlan: string | null = null;
	let hasPresentedThisSession = false;

	// Restore latest plan from session on start
	pi.on("session_start", async (_event, ctx) => {
		latestPlan = null;
		previousPlan = null;
		hasPresentedThisSession = false;
		for (const entry of ctx.sessionManager.getEntries()) {
			if (entry.type === "custom" && entry.customType === ENTRY_TYPE) {
				latestPlan = (entry as any).data?.plan ?? null;
			}
		}
	});

	pi.on("session_switch", async (_event, ctx) => {
		latestPlan = null;
		previousPlan = null;
		hasPresentedThisSession = false;
		for (const entry of ctx.sessionManager.getEntries()) {
			if (entry.type === "custom" && entry.customType === ENTRY_TYPE) {
				latestPlan = (entry as any).data?.plan ?? null;
			}
		}
	});

	pi.registerTool({
		name: "present_plan",
		label: "Present Plan",
		description:
			"Present an implementation plan to the user for review and approval. " +
			"Use this when you have a complete plan ready for the user to review. " +
			"The plan will be displayed in a scrollable overlay. " +
			"The user will approve or reject it. Returns their decision. " +
			"Optionally pass contexts to enable context-aware comment editing on specific sections.",
		promptGuidelines: [
			"Use present_plan when you have a complete implementation plan to show the user.",
			"Write the plan in markdown format with clear sections and structure.",
			"Wait for the user's approval before proceeding with implementation.",
		],
		parameters: Type.Object({
			plan: Type.String({ description: "The full implementation plan in markdown format" }),
			contexts: Type.Optional(Type.Array(Type.Object({
				rawStart: Type.Number({ description: "First line in raw markdown (1-indexed)" }),
				rawEnd: Type.Number({ description: "Last line in raw markdown (1-indexed)" }),
				content: Type.String({ description: "Markdown to render in the context-aware comment editor" }),
			}), { description: "Context blocks for inline comment editing. Each maps a range of plan lines to content shown when the user writes a comment on those lines." })),
		}),
		async execute(toolCallId, params, signal, onUpdate, ctx) {
			const { plan } = params;

			// Track previous for diff — only from plans shown this session
			previousPlan = hasPresentedThisSession ? latestPlan : null;
			hasPresentedThisSession = true;

			// Persist
			latestPlan = plan;
			pi.appendEntry(ENTRY_TYPE, { plan });

			// Show overlay
			const result = await showPlanOverlay(plan, ctx, previousPlan, params.contexts);

			let text: string;
			if (result.approved && result.feedback) {
				text = `User APPROVED the plan with inline comments. Review the comments and adjust before implementing:\n\n${result.feedback}`;
			} else if (result.approved) {
				text = "User APPROVED the plan. Proceed with implementation.";
			} else if (result.feedback) {
				text = `User provided FEEDBACK on the plan. Address this feedback and present a revised plan:\n\n${result.feedback}`;
			} else {
				// Reject without feedback — abort the agent loop so no LLM turn fires.
				// The user can follow up in their own words when ready.
				ctx.abort();
				text = "User rejected the plan.";
			}

			return {
				content: [{ type: "text", text }],
				details: { approved: result.approved, feedback: result.feedback },
			};
		},

		renderCall(args, theme) {
			const { Text } = require("@mariozechner/pi-tui");
			return new Text(
				theme.fg("toolTitle", theme.bold("present_plan ")) +
					theme.fg("dim", "Presenting plan for review..."),
				0, 0,
			);
		},

		renderResult(result, { expanded }, theme) {
			const { Text } = require("@mariozechner/pi-tui");
			const approved = result.details?.approved;
			const feedback = result.details?.feedback;
			let icon: string, color: string, label: string;
			if (approved) {
				icon = "✓"; color = "success"; label = "Plan approved";
			} else if (feedback) {
				icon = "✎"; color = "warning"; label = "Feedback provided";
			} else {
				icon = "✗"; color = "error"; label = "Plan rejected";
			}
			let text = theme.fg(color, `${icon} ${label}`) +
				theme.fg("dim", "  /plan to review again");
			if (expanded && feedback) {
				text += "\n" + theme.fg("muted", feedback);
			}
			return new Text(text, 0, 0);
		},
	});

	pi.registerCommand("plan", {
		description: "Reopen the last presented plan",
		handler: async (_args, ctx) => {
			if (!latestPlan) {
				ctx.ui.notify("No plan has been presented yet", "warning");
				return;
			}
			await showPlanOverlay(latestPlan, ctx, previousPlan);
		},
	});
}
