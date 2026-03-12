/**
 * Shared PR State Module
 *
 * Single source of truth for PR data. Polls every 60s, notifies subscribers
 * on changes. Consumed by the dashboard widget, /gh pr-info overlay, and
 * future extensions (e.g. pr-babysit).
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

// ── Types ──

export interface PrInfo {
	number: number;
	title: string;
	body: string;
	state: string;
	baseRefName: string;
	headRefName: string;
	additions: number;
	deletions: number;
	mergeable: string;
	reviewDecision: string;
	url: string;
	mergedAt: string | null;
	mergedBy: { login: string } | null;
	statusCheckRollup: Array<{ name: string; status: string; conclusion: string }>;
	reviews: Array<{ author: { login: string }; state: string }>;
	comments: PrComment[];
}

export interface PrComment {
	author: { login: string };
	body: string;
	createdAt: string;
}

export interface ReviewComment {
	id: number;
	user: { login: string };
	body: string;
	path: string;
	line: number | null;
	original_line: number | null;
	created_at: string;
	diff_hunk: string;
}

// ── State ──

const PR_FIELDS = "number,title,body,state,baseRefName,headRefName,additions,deletions,statusCheckRollup,reviews,reviewDecision,mergeable,mergedAt,mergedBy,url,comments";
const POLL_INTERVAL = 60_000;

type Subscriber = (pr: PrInfo | null) => void;

let pi: ExtensionAPI | null = null;
let cwd: string | null = null;
let branch: string | null = null;
let cached: PrInfo | null = null;
let pollHandle: ReturnType<typeof setInterval> | null = null;
const subscribers: Set<Subscriber> = new Set();

function notify() {
	for (const cb of subscribers) cb(cached);
}

async function detectBranch(): Promise<string | null> {
	if (!pi || !cwd) return null;

	const branchResult = await pi.exec("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd, timeout: 5000 });
	if (branchResult.code !== 0) return null;
	const currentBranch = branchResult.stdout.trim();

	const defaultResult = await pi.exec(
		"gh", ["repo", "view", "--json", "defaultBranchRef", "--jq", ".defaultBranchRef.name"],
		{ cwd, timeout: 5000 },
	);
	const defaultBranch = defaultResult.code === 0 ? defaultResult.stdout.trim() : "main";

	if (currentBranch === defaultBranch) return null;

	const remoteResult = await pi.exec("git", ["remote", "get-url", "origin"], { cwd, timeout: 5000 });
	if (remoteResult.code !== 0) return null;

	return currentBranch;
}

async function fetchPr(): Promise<PrInfo | null> {
	if (!pi || !cwd || !branch) return null;
	const result = await pi.exec("gh", ["pr", "view", branch, "--json", PR_FIELDS], { cwd, timeout: 15000 });
	if (result.code !== 0) return null;
	try {
		return JSON.parse(result.stdout);
	} catch {
		return null;
	}
}

async function poll() {
	cached = await fetchPr();
	notify();
}

// ── Public API ──

export const prState = {
	async start(extApi: ExtensionAPI, workDir: string): Promise<void> {
		pi = extApi;
		cwd = workDir;

		// If already polling, don't re-fetch or reset the interval
		if (pollHandle) return;

		branch = await detectBranch();
		cached = await fetchPr();
		notify();

		pollHandle = setInterval(poll, POLL_INTERVAL);
	},

	stop(): void {
		if (pollHandle) {
			clearInterval(pollHandle);
			pollHandle = null;
		}
	},

	get(): PrInfo | null {
		return cached;
	},

	async refresh(): Promise<PrInfo | null> {
		if (!pi || !cwd) return null;
		branch = await detectBranch();
		cached = await fetchPr();
		notify();
		return cached;
	},

	async fetchReviewComments(): Promise<ReviewComment[]> {
		if (!pi || !cwd || !cached) return [];
		const result = await pi.exec(
			"gh", ["api", `/repos/{owner}/{repo}/pulls/${cached.number}/comments`, "--paginate"],
			{ cwd, timeout: 15000 },
		);
		if (result.code !== 0) return [];
		try {
			return JSON.parse(result.stdout);
		} catch {
			return [];
		}
	},

	subscribe(callback: Subscriber): () => void {
		subscribers.add(callback);
		// Immediately deliver current state
		callback(cached);
		return () => subscribers.delete(callback);
	},
};
