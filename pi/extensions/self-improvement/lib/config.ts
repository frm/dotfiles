import { join } from "node:path";
import { readConfig } from "../../lib/config.ts";
import type { Config } from "./types.ts";

export const LOG_PATH = join(process.env.HOME || "", ".pi", "logs", "friction.jsonl");
export const AUTO_PRUNE_DAYS = 30;

export function loadConfig(): Config {
	const raw = readConfig("self-improvement");
	return {
		enabled: raw.enabled ?? true,
		showEndOfSessionSummary: raw.showEndOfSessionSummary ?? true,
		showEmergingPatterns: raw.showEmergingPatterns ?? false,
		minEntriesForSummary: raw.minEntriesForSummary ?? 0,
		minEntriesForSuggestion: (typeof raw.minEntriesForSuggestion === "object" && raw.minEntriesForSuggestion)
			? raw.minEntriesForSuggestion
			: { high: 1, medium: 2, low: 3 },
		minEntriesForResurface: raw.minEntriesForResurface ?? 3,
		ignoredArtifacts: raw.ignoredArtifacts ?? [],
	};
}

export function getSuggestionThreshold(config: Config, severity: "low" | "medium" | "high"): number {
	return config.minEntriesForSuggestion[severity];
}
