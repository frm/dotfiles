export interface FrictionEntry {
	id: string;
	timestamp: string;
	sessionId: string;
	scope: string;          // "user" or "project:<cwd>"
	artifact: string;
	pattern: string;
	suggestion: string;
	severity: "low" | "medium" | "high";
	status: "pending" | "applied" | "dismissed" | "skipped";
	dismissedAt?: string;
}

export interface SeverityThresholds {
	high: number;
	medium: number;
	low: number;
}

export interface Config {
	enabled: boolean;
	showEndOfSessionSummary: boolean;
	showEmergingPatterns: boolean;
	minEntriesForSummary: number;
	minEntriesForSuggestion: SeverityThresholds;
	minEntriesForResurface: number;
	ignoredArtifacts: string[];
}

export interface SuggestionGroup {
	artifact: string;
	entries: FrictionEntry[];
	currentContent: string | null;
}
