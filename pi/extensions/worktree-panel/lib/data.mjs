import { execFileSync } from "node:child_process";

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
		const raw = execFileSync("tmux", ["show-option", "-wv", "-t", sessionWindow, "@pi_state"], {
			encoding: "utf-8", timeout: 3000, stdio: ["pipe", "pipe", "pipe"],
		}).trim();
		return raw || null;
	} catch {
		return null;
	}
}
