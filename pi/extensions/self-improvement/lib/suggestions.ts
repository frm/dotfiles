import { readFileSync, existsSync } from "node:fs";
import { readLog } from "./store.ts";
import { getSuggestionThreshold } from "./config.ts";
import type { Config, FrictionEntry, SuggestionGroup } from "./types.ts";

export function meetsThreshold(config: Config, entries: FrictionEntry[]): boolean {
	const bySeverity = { high: 0, medium: 0, low: 0 };
	for (const e of entries) bySeverity[e.severity]++;
	return (
		bySeverity.high >= getSuggestionThreshold(config, "high") ||
		bySeverity.medium >= getSuggestionThreshold(config, "medium") ||
		bySeverity.low >= getSuggestionThreshold(config, "low")
	);
}

export function groupSuggestions(config: Config, scope?: string): { actionable: SuggestionGroup[]; emerging: SuggestionGroup[] } {
	const entries = readLog();
	const ignored = new Set(config.ignoredArtifacts);
	const scopeFilter = scope ?? "user";

	// Filter active entries
	const active: FrictionEntry[] = [];
	for (const entry of entries) {
		if (ignored.has(entry.artifact)) continue;
		if ((entry.scope ?? "user") !== scopeFilter) continue;

		if (entry.status === "pending") {
			active.push(entry);
		} else if (entry.status === "dismissed" && entry.dismissedAt) {
			const postDismissal = entries.filter(
				(e) =>
					e.artifact === entry.artifact &&
					e.status === "pending" &&
					(e.scope ?? "user") === scopeFilter &&
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

		if (meetsThreshold(config, groupEntries)) {
			if (content !== null) {
				actionable.push(group);
			}
		} else {
			emerging.push(group);
		}
	}

	return { actionable, emerging };
}

export function countPendingSuggestions(config: Config, scope?: string): { count: number; artifacts: string[] } {
	const entries = readLog();
	const ignored = new Set(config.ignoredArtifacts);
	const scopeFilter = scope ?? "user";

	const pendingBySeverity = new Map<string, { high: number; medium: number; low: number }>();
	const dismissedArtifacts: { artifact: string; dismissedAt: string }[] = [];

	for (const entry of entries) {
		if (ignored.has(entry.artifact)) continue;
		if ((entry.scope ?? "user") !== scopeFilter) continue;
		if (entry.status === "pending") {
			if (!pendingBySeverity.has(entry.artifact)) {
				pendingBySeverity.set(entry.artifact, { high: 0, medium: 0, low: 0 });
			}
			pendingBySeverity.get(entry.artifact)![entry.severity]++;
		} else if (entry.status === "dismissed" && entry.dismissedAt) {
			dismissedArtifacts.push({ artifact: entry.artifact, dismissedAt: entry.dismissedAt });
		}
	}

	for (const { artifact, dismissedAt } of dismissedArtifacts) {
		if (pendingBySeverity.has(artifact)) continue;
		const postDismissal = entries.filter(
			(e) => e.artifact === artifact && e.status === "pending" && e.timestamp > dismissedAt
				&& (e.scope ?? "user") === scopeFilter
		).length;
		if (postDismissal >= config.minEntriesForResurface) {
			pendingBySeverity.set(artifact, { high: 0, medium: 0, low: 0 });
		}
	}

	const actionableArtifacts = [...pendingBySeverity.entries()]
		.filter(([_, counts]) =>
			counts.high >= getSuggestionThreshold(config, "high") ||
			counts.medium >= getSuggestionThreshold(config, "medium") ||
			counts.low >= getSuggestionThreshold(config, "low")
		)
		.map(([artifact]) => artifact);

	return { count: actionableArtifacts.length, artifacts: actionableArtifacts };
}
