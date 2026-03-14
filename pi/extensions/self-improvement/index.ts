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
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { readConfig } from "../lib/config.ts";

// ── Types ────────────────────────────────────────────────────────────────────

interface FrictionEntry {
	id: string;
	timestamp: string;
	sessionId: string;
	artifact: string;
	pattern: string;
	suggestion: string;
	severity: "low" | "medium" | "high";
	status: "pending" | "applied" | "dismissed" | "skipped";
	dismissedAt?: string;
}

interface Config {
	enabled: boolean;
	showEndOfSessionSummary: boolean;
	showEmergingPatterns: boolean;
	minEntriesForSummary: number;
	minEntriesForSuggestion: number;
	minEntriesForResurface: number;
	ignoredArtifacts: string[];
}

// ── Constants ────────────────────────────────────────────────────────────────

const LOG_PATH = join(process.env.HOME || "", ".pi", "logs", "friction.jsonl");
const AUTO_PRUNE_DAYS = 30;

// ── Config ───────────────────────────────────────────────────────────────────

function loadConfig(): Config {
	const raw = readConfig("self-improvement");
	return {
		enabled: raw.enabled ?? true,
		showEndOfSessionSummary: raw.showEndOfSessionSummary ?? true,
		showEmergingPatterns: raw.showEmergingPatterns ?? false,
		minEntriesForSummary: raw.minEntriesForSummary ?? 0,
		minEntriesForSuggestion: raw.minEntriesForSuggestion ?? 2,
		minEntriesForResurface: raw.minEntriesForResurface ?? 3,
		ignoredArtifacts: raw.ignoredArtifacts ?? [],
	};
}

// ── Log Operations ───────────────────────────────────────────────────────────

function ensureLogDir(): void {
	const dir = dirname(LOG_PATH);
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function readLog(): FrictionEntry[] {
	if (!existsSync(LOG_PATH)) return [];
	const lines = readFileSync(LOG_PATH, "utf-8").trim().split("\n").filter(Boolean);
	const entries: FrictionEntry[] = [];
	for (const line of lines) {
		try {
			entries.push(JSON.parse(line));
		} catch {
			// skip malformed lines
		}
	}
	return entries;
}

function writeLog(entries: FrictionEntry[]): void {
	ensureLogDir();
	const content = entries.map((e) => JSON.stringify(e)).join("\n") + (entries.length ? "\n" : "");
	writeFileSync(LOG_PATH, content);
}

function appendEntry(entry: FrictionEntry): void {
	ensureLogDir();
	appendFileSync(LOG_PATH, JSON.stringify(entry) + "\n");
}

function autoPrune(): number {
	const entries = readLog();
	const cutoff = new Date(Date.now() - AUTO_PRUNE_DAYS * 24 * 60 * 60 * 1000).toISOString();
	const kept = entries.filter((e) => {
		if (e.status === "applied" && e.timestamp < cutoff) return false;
		return true;
	});
	const pruned = entries.length - kept.length;
	if (pruned > 0) writeLog(kept);
	return pruned;
}

// ── Suggestion Grouping ──────────────────────────────────────────────────────

interface SuggestionGroup {
	artifact: string;
	entries: FrictionEntry[];
	currentContent: string | null;
}

function groupSuggestions(config: Config): { actionable: SuggestionGroup[]; emerging: SuggestionGroup[] } {
	const entries = readLog();
	const ignored = new Set(config.ignoredArtifacts);

	// Filter active entries
	const active: FrictionEntry[] = [];
	for (const entry of entries) {
		if (ignored.has(entry.artifact)) continue;

		if (entry.status === "pending") {
			active.push(entry);
		} else if (entry.status === "dismissed" && entry.dismissedAt) {
			// Count post-dismissal pending entries for the same artifact
			const postDismissal = entries.filter(
				(e) =>
					e.artifact === entry.artifact &&
					e.status === "pending" &&
					e.timestamp > entry.dismissedAt!
			);
			if (postDismissal.length >= config.minEntriesForResurface) {
				active.push(...postDismissal);
			}
		}
	}

	// Group by artifact
	const groups = new Map<string, FrictionEntry[]>();
	for (const entry of active) {
		const existing = groups.get(entry.artifact) || [];
		// Deduplicate by id
		if (!existing.some((e) => e.id === entry.id)) {
			existing.push(entry);
		}
		groups.set(entry.artifact, existing);
	}

	const actionable: SuggestionGroup[] = [];
	const emerging: SuggestionGroup[] = [];

	for (const [artifact, groupEntries] of groups) {
		let content: string | null = null;
		try {
			const resolvedPath = artifact.replace(/^~/, process.env.HOME || "");
			if (existsSync(resolvedPath)) {
				content = readFileSync(resolvedPath, "utf-8");
			}
		} catch {
			// artifact may have been deleted
		}

		const group: SuggestionGroup = { artifact, entries: groupEntries, currentContent: content };

		if (groupEntries.length >= config.minEntriesForSuggestion) {
			// Skip if artifact was deleted
			if (content !== null) {
				actionable.push(group);
			}
		} else {
			emerging.push(group);
		}
	}

	return { actionable, emerging };
}

// ── Pending Count (lightweight — skips artifact file reads) ──────────────────

function countPendingSuggestions(config: Config): { count: number; artifacts: string[] } {
	const entries = readLog();
	const ignored = new Set(config.ignoredArtifacts);

	// Collect pending entries per artifact (same logic as groupSuggestions, but no file I/O)
	const pendingByArtifact = new Map<string, number>();
	for (const entry of entries) {
		if (ignored.has(entry.artifact)) continue;
		if (entry.status === "pending") {
			pendingByArtifact.set(entry.artifact, (pendingByArtifact.get(entry.artifact) || 0) + 1);
		}
	}

	// Also check for resurfaced dismissed entries
	for (const entry of entries) {
		if (ignored.has(entry.artifact)) continue;
		if (entry.status === "dismissed" && entry.dismissedAt) {
			const postDismissal = entries.filter(
				(e) => e.artifact === entry.artifact && e.status === "pending" && e.timestamp > entry.dismissedAt!
			).length;
			if (postDismissal >= config.minEntriesForResurface) {
				pendingByArtifact.set(entry.artifact, Math.max(pendingByArtifact.get(entry.artifact) || 0, postDismissal));
			}
		}
	}

	const actionableArtifacts = [...pendingByArtifact.entries()]
		.filter(([_, count]) => count >= config.minEntriesForSuggestion)
		.map(([artifact]) => artifact);

	return { count: actionableArtifacts.length, artifacts: actionableArtifacts };
}

// ── Status Update ────────────────────────────────────────────────────────────

function updateEntryStatuses(updates: { id: string; status: "applied" | "dismissed" | "skipped" }[]): number {
	const entries = readLog();
	const updateMap = new Map(updates.map((u) => [u.id, u.status]));
	const now = new Date().toISOString();
	let updated = 0;

	for (const entry of entries) {
		const newStatus = updateMap.get(entry.id);
		if (newStatus) {
			entry.status = newStatus;
			if (newStatus === "dismissed") {
				entry.dismissedAt = now;
			}
			updated++;
		}
	}

	if (updated > 0) writeLog(entries);
	return updated;
}

// ── Extension ────────────────────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
	let sessionFrictionCount = 0;
	const sessionArtifacts = new Set<string>();
	let sessionId = randomUUID();

	// ── Auto-prune on session start ─────────────────────────────────────

	pi.on("session_start", async () => {
		const config = loadConfig();
		if (!config.enabled) return;
		autoPrune();
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

Log the artifact path, the pattern, and your suggested fix. Do not interrupt the user's workflow — just log and continue with the task.`;

		// Check for pending suggestions
		const { count, artifacts } = countPendingSuggestions(config);
		if (count > 0) {
			const artifactList = artifacts.slice(0, 5).join(", ");
			injection += `

There are ${count} pending improvement suggestion${count > 1 ? "s" : ""} for: ${artifactList}.
IMPORTANT: Do NOT mention these during the conversation. Only after you have fully completed the user's request and delivered your final response, add a brief note: "I have ${count} improvement suggestion${count > 1 ? "s" : ""} for your AI config. Want to review them?" Never bring this up while work is in progress.`;
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
		}),
		async execute(_id, params) {
			const entry: FrictionEntry = {
				id: randomUUID(),
				timestamp: new Date().toISOString(),
				sessionId,
				artifact: params.artifact,
				pattern: params.pattern,
				suggestion: params.suggestion,
				severity: params.severity,
				status: "pending",
			};

			appendEntry(entry);
			sessionFrictionCount++;
			sessionArtifacts.add(params.artifact);

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
		parameters: Type.Object({}),
		async execute() {
			const config = loadConfig();
			const { actionable, emerging } = groupSuggestions(config);

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
						s.patterns.map((p) => `  - ${p.pattern}`).join("\n")
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
			const updated = updateEntryStatuses(params.updates);
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
