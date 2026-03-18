import type { StatusCheckLike } from "./types.ts";

export type { StatusCheckLike };

export const FAILURE_CONCLUSIONS = new Set([
	"FAILURE", "CANCELLED", "STARTUP_FAILURE", "TIMED_OUT", "ACTION_REQUIRED", "STALE",
]);

export function summarizeChecks(checks: StatusCheckLike[]): { passed: number; failed: number; pending: number } {
	let passed = 0;
	let failed = 0;
	let pending = 0;

	for (const check of checks) {
		if (check.conclusion === "SUCCESS" || check.conclusion === "NEUTRAL") {
			passed++;
			continue;
		}
		if (FAILURE_CONCLUSIONS.has(check.conclusion)) {
			failed++;
			continue;
		}
		if (check.status === "IN_PROGRESS" || check.status === "QUEUED" || check.status === "PENDING") {
			pending++;
		}
	}

	return { passed, failed, pending };
}

export function normalizePathForCompare(input: string): string {
	let path = input.trim().replaceAll("\\", "/");
	if (path.startsWith("./")) path = path.slice(2);
	path = path.replace(/:(\d+)(?::\d+)?$/, "");

	const src = path.indexOf("/src/");
	if (src > 0) return path.slice(src + 1);
	const tests = path.indexOf("/tests/");
	if (tests > 0) return path.slice(tests + 1);
	return path.replace(/^\/+/, "");
}

export function extractFailingTestFiles(log: string): string[] {
	const files = new Set<string>();
	const regex = /(?:^|\s)(\/?[\w./-]+\.(?:test|spec)\.[cm]?[jt]sx?)(?::\d+(?::\d+)?)?/gm;

	for (const line of log.split("\n")) {
		const failMatch = line.match(/^FAIL\s+(.+\.(?:test|spec)\.[cm]?[jt]sx?)/);
		if (failMatch?.[1]) {
			files.add(normalizePathForCompare(failMatch[1]));
		}

		let match: RegExpExecArray | null;
		while ((match = regex.exec(line)) !== null) {
			if (match[1]) files.add(normalizePathForCompare(match[1]));
		}
	}

	return [...files].filter(Boolean).sort();
}

export function isLikelyFlakyFailure(failingFiles: string[], changedFiles: string[]): boolean {
	if (failingFiles.length === 0) return false;

	const normalizedChanged = new Set(changedFiles.map((f) => normalizePathForCompare(f)));
	for (const failing of failingFiles.map((f) => normalizePathForCompare(f))) {
		for (const changed of normalizedChanged) {
			if (failing === changed || failing.endsWith(changed) || changed.endsWith(failing)) {
				return false;
			}
		}
	}
	return true;
}
