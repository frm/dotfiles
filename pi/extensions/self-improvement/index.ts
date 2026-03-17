/**
 * Self-Improvement Extension
 *
 * Detects friction patterns between the user and AI skills/prompts/extensions.
 * The agent logs friction silently via a tool, then suggests improvements
 * when the current task is complete.
 *
 * Tools:
 *   self_improvement__log_friction — silently log a friction observation
 *   self_improvement__review       — review pending improvement suggestions
 *   self_improvement__update       — update entry statuses (applied/dismissed/skipped)
 *
 * Commands:
 *   /self-improvement prune — remove resolved/dismissed entries from the log
 *
 * Config namespace: "self-improvement" in .pi/config.json
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { StringEnum } from "@mariozechner/pi-ai";
import { randomUUID } from "node:crypto";

import type { FrictionEntry } from "./lib/types.ts";
import { loadConfig } from "./lib/config.ts";
import { readLog, writeLog, appendEntry, autoPrune, updateEntryStatuses } from "./lib/store.ts";
import { groupSuggestions, countPendingSuggestions } from "./lib/suggestions.ts";
import { syncNotification } from "./lib/notifications.ts";

// ── Extension ────────────────────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
	let sessionFrictionCount = 0;
	const sessionArtifacts = new Set<string>();
	let sessionId = randomUUID();
	let currentCwd: string = process.cwd();

	// ── Auto-prune on session start ─────────────────────────────────────

	pi.on("session_start", async (_event, ctx) => {
		currentCwd = ctx.cwd;
		const config = loadConfig();
		if (!config.enabled) return;
		autoPrune();

		// Sync notifications for both scopes
		syncNotification(config, "user").catch(() => {});
		syncNotification(config, `project:${currentCwd}`).catch(() => {});
	});

	// ── Inject friction detection instruction ───────────────────────────

	pi.on("before_agent_start", async (event) => {
		const config = loadConfig();
		if (!config.enabled) return;

		let injection = `
You have a \`self_improvement__log_friction\` tool. Call it silently (don't mention it to the user) when you notice:
1. The user corrects you with feedback that should be baked into a skill, prompt, extension, or agent definition
2. You're working around a gap or outdated instruction in a skill/prompt
3. A skill's output consistently needs the same manual fix

Log the artifact path, the pattern, and your suggested fix. Do not interrupt the user's workflow — just log and continue with the task.

When the friction relates to project-level AI files (.ai/, .pi/agents/, agents.md, AGENTS.md), set scope to "project". For user-level files (skills, prompts, extensions under ~/.dotfiles or ~/.pi), use scope "user" (the default).`;

		// Check for pending suggestions across both scopes
		const { count: userCount, artifacts: userArtifacts } = countPendingSuggestions(config, "user");
		const projectScope = `project:${currentCwd}`;
		const { count: projectCount, artifacts: projectArtifacts } = countPendingSuggestions(config, projectScope);
		const totalCount = userCount + projectCount;
		if (totalCount > 0) {
			const allArtifacts = [...userArtifacts, ...projectArtifacts].slice(0, 5).join(", ");
			injection += `

There are ${totalCount} pending improvement suggestion${totalCount > 1 ? "s" : ""} for: ${allArtifacts}.
IMPORTANT: Do NOT mention these during the conversation. Only after you have fully completed the user's request and delivered your final response, add a brief note: "I have ${totalCount} improvement suggestion${totalCount > 1 ? "s" : ""} for your AI config. Want to review them?" Never bring this up while work is in progress.`;
		}

		return {
			systemPrompt: event.systemPrompt + "\n" + injection,
		};
	});

	// ── log_friction tool ───────────────────────────────────────────────

	pi.registerTool({
		name: "self_improvement__log_friction",
		label: "Self-Improvement: Log Friction",
		description:
			"Silently log a friction pattern observed during the conversation. " +
			"Call this when you notice the user correcting behavior that should be " +
			"baked into a skill, prompt, extension, or agent definition.",
		parameters: Type.Object({
			artifact: Type.String({
				description: "Path to the skill/prompt/extension/agent file the friction relates to",
			}),
			pattern: Type.String({
				description: "Short description of the recurring issue",
			}),
			suggestion: Type.String({
				description: "What should change in the artifact to fix this",
			}),
			severity: StringEnum(["low", "medium", "high"] as const, {
				description: "How much friction this causes",
			}),
			scope: Type.Optional(
				StringEnum(["user", "project"] as const, {
					description: 'Scope: "user" for user-level files, "project" for project-level AI files (.ai/, .pi/agents/, agents.md). Defaults to "user".',
				})
			),
		}),
		async execute(_id, params) {
			const resolvedScope = params.scope === "project"
				? `project:${currentCwd}`
				: "user";

			const entry: FrictionEntry = {
				id: randomUUID(),
				timestamp: new Date().toISOString(),
				sessionId,
				scope: resolvedScope,
				artifact: params.artifact,
				pattern: params.pattern,
				suggestion: params.suggestion,
				severity: params.severity,
				status: "pending",
			};

			appendEntry(entry);
			sessionFrictionCount++;
			sessionArtifacts.add(params.artifact);

			// Publish/update notification if threshold is met
			const config = loadConfig();
			syncNotification(config, resolvedScope).catch(() => {});

			return {
				content: [{ type: "text", text: JSON.stringify({ logged: true }) }],
				details: { entryId: entry.id },
			};
		},
		renderCall() {
			return undefined; // silent — no UI rendering
		},
		renderResult() {
			return undefined; // silent — no UI rendering
		},
	});

	// ── review tool ─────────────────────────────────────────────────────

	pi.registerTool({
		name: "self_improvement__review",
		label: "Self-Improvement: Review",
		description:
			"Review pending improvement suggestions. Returns grouped friction patterns " +
			"with current artifact content. Present results to the user via questionnaire " +
			"with options: Approve, Dismiss, Skip, or Give instructions.",
		parameters: Type.Object({
			scope: Type.Optional(
				StringEnum(["user", "project"] as const, {
					description: 'Filter by scope. Defaults to "user".',
				})
			),
		}),
		async execute(_id, params) {
			const config = loadConfig();
			const resolvedScope = params.scope === "project"
				? `project:${currentCwd}`
				: "user";
			const { actionable, emerging } = groupSuggestions(config, resolvedScope);

			if (actionable.length === 0 && (!config.showEmergingPatterns || emerging.length === 0)) {
				return {
					content: [{ type: "text", text: "No friction patterns to review." }],
					details: { suggestions: [], emerging: [] },
				};
			}

			const suggestions = actionable.map((g) => ({
				artifact: g.artifact,
				entryCount: g.entries.length,
				patterns: g.entries.map((e) => ({
					id: e.id,
					pattern: e.pattern,
					suggestion: e.suggestion,
					severity: e.severity,
					timestamp: e.timestamp,
				})),
				currentContent: g.currentContent,
			}));

			const emergingData = config.showEmergingPatterns
				? emerging.map((g) => ({
						artifact: g.artifact,
						count: g.entries.length,
						latestPattern: g.entries[g.entries.length - 1]?.pattern,
					}))
				: [];

			const summary = suggestions
				.map(
					(s) =>
						`**${s.artifact}** (${s.entryCount} entries)\n` +
						s.patterns.map((p) => `  - [${p.id}] ${p.pattern}`).join("\n")
				)
				.join("\n\n");

			return {
				content: [
					{
						type: "text",
						text:
							`Found ${suggestions.length} improvement suggestion${suggestions.length !== 1 ? "s" : ""}:\n\n` +
							summary +
							(emergingData.length
								? `\n\nAlso tracking ${emergingData.length} emerging pattern${emergingData.length !== 1 ? "s" : ""} below threshold.`
								: ""),
					},
				],
				details: { suggestions, emerging: emergingData },
			};
		},
	});

	// ── update tool ─────────────────────────────────────────────────────

	pi.registerTool({
		name: "self_improvement__update",
		label: "Self-Improvement: Update Status",
		description:
			"Update the status of friction log entries after the user reviews them. " +
			"Call this with the entry IDs and their new status (applied, dismissed, or skipped).",
		parameters: Type.Object({
			updates: Type.Array(
				Type.Object({
					id: Type.String({ description: "Friction log entry ID" }),
					status: StringEnum(["applied", "dismissed", "skipped"] as const, {
						description: "New status for the entry",
					}),
				}),
				{ description: "List of entry ID + status updates" }
			),
		}),
		async execute(_id, params) {
			const { updated, affectedScopes } = updateEntryStatuses(params.updates);

			// Dismiss notifications for scopes that no longer have actionable entries
			const config = loadConfig();
			for (const scope of affectedScopes) {
				syncNotification(config, scope).catch(() => {});
			}

			return {
				content: [{ type: "text", text: `Updated ${updated} entries.` }],
				details: { updated },
			};
		},
	});

	// ── session_shutdown notification ────────────────────────────────────

	pi.on("session_shutdown", async (_event, ctx) => {
		const config = loadConfig();
		if (!config.enabled) return;
		if (!config.showEndOfSessionSummary) return;
		if (sessionFrictionCount < config.minEntriesForSummary) return;
		if (sessionFrictionCount === 0) return;

		const artifacts = [...sessionArtifacts].map((a) => a.split("/").pop());

		ctx.ui.notify(
			`Logged ${sessionFrictionCount} friction pattern${sessionFrictionCount !== 1 ? "s" : ""} this session (${artifacts.join(", ")})`,
			"info"
		);
	});

	// ── /self-improvement command ────────────────────────────────────────

	pi.registerCommand("self-improvement", {
		description: "Manage the self-improvement friction log. Usage: /self-improvement prune [--all]",
		handler: async (args, ctx) => {
			const trimmed = (args || "").trim();

			if (trimmed === "prune" || trimmed === "prune --all") {
				const all = trimmed.includes("--all");
				const entries = readLog();
				const before = entries.length;

				if (all) {
					writeLog([]);
					ctx.ui.notify(`Cleared all ${before} entries from the friction log.`, "info");
				} else {
					const kept = entries.filter((e) => e.status !== "applied" && e.status !== "dismissed");
					writeLog(kept);
					const pruned = before - kept.length;
					ctx.ui.notify(
						`Pruned ${pruned} resolved/dismissed entries. ${kept.length} entries remaining.`,
						"info"
					);
				}
				return;
			}

			if (trimmed === "status") {
				const config = loadConfig();
				const entries = readLog();
				const pending = entries.filter((e) => e.status === "pending").length;
				const applied = entries.filter((e) => e.status === "applied").length;
				const dismissed = entries.filter((e) => e.status === "dismissed").length;
				const { actionable } = groupSuggestions(config);

				ctx.ui.notify(
					`Friction log: ${entries.length} total (${pending} pending, ${applied} applied, ${dismissed} dismissed)\n` +
						`Actionable suggestions: ${actionable.length}`,
					"info"
				);
				return;
			}

			ctx.ui.notify(
				"Usage:\n  /self-improvement prune        — remove applied/dismissed entries\n" +
					"  /self-improvement prune --all  — clear entire log\n" +
					"  /self-improvement status       — show log stats",
				"info"
			);
		},
	});
}
