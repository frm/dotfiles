import { tmuxQuery } from "./tmux.ts";

// ─── Branch Parsing ──────────────────────────────────────────────────────────

export function extractIssueId(branch) {
	for (const part of branch.split("/")) {
		if (/^[A-Za-z]+-\d+$/.test(part)) return part.toUpperCase();
	}
	return null;
}

export function extractDescription(branch) {
	const parts = branch.split("/");
	return parts[parts.length - 1];
}

// ─── Pi State (tmux window options) ──────────────────────────────────────────

export function readPiState(sessionWindow) {
	if (!sessionWindow) return null;
	try {
		return tmuxQuery("show-option", "-wv", "-t", sessionWindow, "@pi_state") || null;
	} catch {
		return null;
	}
}
