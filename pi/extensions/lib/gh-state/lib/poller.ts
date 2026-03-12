import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import type { PrInfo, ReviewComment, CacheEntry } from "./types.ts";

const PR_FIELDS = "number,title,body,state,baseRefName,headRefName,additions,deletions,statusCheckRollup,reviews,reviewDecision,mergeable,mergedAt,mergedBy,url,comments";
const PR_LIST_FIELDS = "number,title,headRefName,url,reviewDecision,latestReviews,reviewRequests,statusCheckRollup,mergeStateStatus,autoMergeRequest,mergeable";

const PR_VIEW_INTERVAL = 60_000;
const PR_LISTS_INTERVAL = 60_000;
const REVIEW_COMMENTS_INTERVAL = 60_000;
const ON_DEMAND_CACHE_TTL = 30_000;

export type OnChange = (key: string, data: unknown) => void;

export interface PollerStatus {
	branch: string | null;
	gitRoot: string | null;
	pollCounts: { prView: number; prLists: number; reviewComments: number };
	lastFetchAt: { prView: number | null; prLists: number | null; reviewComments: number | null };
	onDemandCacheSizes: { worktreePr: number; prChecks: number };
}

export interface Poller {
	start(): void;
	stop(): void;
	getPrView(): PrInfo | null;
	getPrLists(): { reviewPrs: unknown[]; myPrs: unknown[] };
	getReviewComments(): Promise<ReviewComment[]>;
	getWorktreePr(branch: string, cwd: string): Promise<unknown>;
	getUsername(): Promise<string | null>;
	getPrChecks(prNumber: number): Promise<unknown>;
	refresh(): Promise<PrInfo | null>;
	getStatus(): PollerStatus;
}

export function createPoller(pi: ExtensionAPI, sessionRoot: string, onChange: OnChange): Poller {
	let gitRoot: string | null = null;
	let branch: string | null = null;
	let defaultBranch = "main";

	let cachedPr: PrInfo | null = null;
	let cachedPrLists: { reviewPrs: unknown[]; myPrs: unknown[] } = { reviewPrs: [], myPrs: [] };
	let cachedReviewComments: ReviewComment[] = [];
	let cachedUsername: string | null = null;
	const worktreePrCache = new Map<string, CacheEntry<unknown>>();
	const prChecksCache = new Map<number, CacheEntry<unknown>>();

	const pollCounts = { prView: 0, prLists: 0, reviewComments: 0 };
	const lastFetchAt: { prView: number | null; prLists: number | null; reviewComments: number | null } = { prView: null, prLists: null, reviewComments: null };

	let prViewTimer: ReturnType<typeof setInterval> | null = null;
	let prListsTimer: ReturnType<typeof setInterval> | null = null;
	let reviewCommentsTimer: ReturnType<typeof setInterval> | null = null;

	async function resolveGitRoot(): Promise<string | null> {
		const result = await pi.exec("git", ["-C", sessionRoot, "rev-parse", "--show-toplevel"], { cwd: sessionRoot, timeout: 5000 });
		return result.code === 0 ? result.stdout.trim() : null;
	}

	async function detectBranch(): Promise<string | null> {
		if (!gitRoot) return null;
		const branchResult = await pi.exec("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: gitRoot, timeout: 5000 });
		if (branchResult.code !== 0) return null;
		const current = branchResult.stdout.trim();

		const defaultResult = await pi.exec("gh", ["repo", "view", "--json", "defaultBranchRef", "--jq", ".defaultBranchRef.name"], { cwd: gitRoot, timeout: 5000 });
		if (defaultResult.code === 0) defaultBranch = defaultResult.stdout.trim() || "main";

		return current === defaultBranch ? null : current;
	}

	async function pollPrView(): Promise<void> {
		if (!gitRoot || !branch) return;
		pollCounts.prView++;
		const result = await pi.exec("gh", ["pr", "view", branch, "--json", PR_FIELDS], { cwd: gitRoot, timeout: 15000 });
		lastFetchAt.prView = Date.now();
		if (result.code !== 0) {
			cachedPr = null;
			onChange("prView", null);
			return;
		}
		try {
			cachedPr = JSON.parse(result.stdout);
			onChange("prView", cachedPr);
		} catch {
			cachedPr = null;
		}
	}

	async function pollPrLists(): Promise<void> {
		if (!gitRoot) return;
		pollCounts.prLists++;
		const [reviewResult, myResult] = await Promise.all([
			pi.exec("gh", ["pr", "list", "--search", "review-requested:@me is:open", "--json", PR_LIST_FIELDS, "--limit", "50"], { cwd: gitRoot, timeout: 15000 }),
			pi.exec("gh", ["pr", "list", "--author", "@me", "--state", "open", "--json", PR_LIST_FIELDS, "--limit", "50"], { cwd: gitRoot, timeout: 15000 }),
		]);

		lastFetchAt.prLists = Date.now();
		const reviewPrs = reviewResult.code === 0 ? tryParse(reviewResult.stdout, []) : [];
		const myPrs = myResult.code === 0 ? tryParse(myResult.stdout, []) : [];
		cachedPrLists = { reviewPrs, myPrs };
		onChange("prLists", cachedPrLists);
	}

	async function pollReviewComments(): Promise<void> {
		if (!gitRoot || !cachedPr) return;
		pollCounts.reviewComments++;
		const result = await pi.exec("gh", ["api", `/repos/{owner}/{repo}/pulls/${cachedPr.number}/comments`, "--paginate"], { cwd: gitRoot, timeout: 15000 });
		lastFetchAt.reviewComments = Date.now();
		if (result.code !== 0) return;
		try {
			cachedReviewComments = JSON.parse(result.stdout);
			onChange("reviewComments", cachedReviewComments);
		} catch {}
	}

	async function fetchWorktreePr(branch: string, cwd: string): Promise<unknown> {
		const key = `${cwd}:${branch}`;
		const cached = worktreePrCache.get(key);
		if (cached && Date.now() - cached.fetchedAt < ON_DEMAND_CACHE_TTL) return cached.data;

		const listResult = await pi.exec("gh", ["pr", "list", "--state", "all", "--head", branch, "--json", "number,state,mergedAt,url,mergeable", "--limit", "1"], { cwd, timeout: 15000 });
		if (listResult.code !== 0) return null;

		const prs = tryParse(listResult.stdout, []);
		if (prs.length === 0) {
			worktreePrCache.set(key, { data: null, fetchedAt: Date.now() });
			return null;
		}

		const pr = prs[0];
		let checks = { status: null, passing: 0, total: 0 };
		if (pr.state === "OPEN") {
			const checksResult = await pi.exec("gh", ["pr", "checks", String(pr.number)], { cwd, timeout: 10000 });
			const raw = (checksResult.code === 0 ? checksResult.stdout : checksResult.stderr ?? "").trim();
			checks = parseChecksOutput(raw);
		}

		const data = { number: pr.number, state: pr.state, checks, url: pr.url ?? null, mergeable: pr.mergeable ?? null };
		worktreePrCache.set(key, { data, fetchedAt: Date.now() });
		return data;
	}

	async function fetchUsername(): Promise<string | null> {
		if (cachedUsername) return cachedUsername;
		const result = await pi.exec("gh", ["api", "user", "--jq", ".login"], { cwd: gitRoot ?? sessionRoot, timeout: 10000 });
		if (result.code === 0) cachedUsername = result.stdout.trim() || null;
		return cachedUsername;
	}

	async function fetchPrChecks(prNumber: number): Promise<unknown> {
		const cached = prChecksCache.get(prNumber);
		if (cached && Date.now() - cached.fetchedAt < ON_DEMAND_CACHE_TTL) return cached.data;

		const result = await pi.exec("gh", ["pr", "checks", String(prNumber)], { cwd: gitRoot ?? sessionRoot, timeout: 10000 });
		const raw = (result.code === 0 ? result.stdout : "").trim();
		const data = parseChecksOutput(raw);
		prChecksCache.set(prNumber, { data, fetchedAt: Date.now() });
		return data;
	}

	function parseChecksOutput(raw: string): { status: string | null; passing: number; total: number } {
		if (!raw) return { status: null, passing: 0, total: 0 };
		const statuses: string[] = [];
		for (const line of raw.split("\n")) {
			const parts = line.split("\t");
			if (parts[1]) statuses.push(parts[1].trim());
		}
		const total = statuses.length;
		const passing = statuses.filter((s) => s === "pass" || s === "skipping").length;
		if (total === 0) return { status: null, passing: 0, total: 0 };
		let status: string | null = null;
		if (statuses.some((s) => s === "fail")) status = "fail";
		else if (statuses.some((s) => s === "pending")) status = "pending";
		else if (passing === total) status = "pass";
		return { status, passing, total };
	}

	function tryParse<T>(json: string, fallback: T): T {
		try { return JSON.parse(json); } catch { return fallback; }
	}

	return {
		async start() {
			gitRoot = await resolveGitRoot();
			branch = await detectBranch();

			await pollPrView();
			await pollPrLists();
			if (cachedPr) await pollReviewComments();

			prViewTimer = setInterval(async () => {
				branch = await detectBranch();
				await pollPrView();
			}, PR_VIEW_INTERVAL);
			prListsTimer = setInterval(() => pollPrLists(), PR_LISTS_INTERVAL);
			reviewCommentsTimer = setInterval(() => pollReviewComments(), REVIEW_COMMENTS_INTERVAL);
		},

		stop() {
			if (prViewTimer) { clearInterval(prViewTimer); prViewTimer = null; }
			if (prListsTimer) { clearInterval(prListsTimer); prListsTimer = null; }
			if (reviewCommentsTimer) { clearInterval(reviewCommentsTimer); reviewCommentsTimer = null; }
		},

		getPrView() { return cachedPr; },
		getPrLists() { return cachedPrLists; },
		async getReviewComments() { return cachedReviewComments; },
		async getWorktreePr(branch: string, cwd: string) { return fetchWorktreePr(branch, cwd); },
		async getUsername() { return fetchUsername(); },
		async getPrChecks(prNumber: number) { return fetchPrChecks(prNumber); },

		async refresh() {
			branch = await detectBranch();
			await pollPrView();
			return cachedPr;
		},

		getStatus(): PollerStatus {
			return {
				branch,
				gitRoot,
				pollCounts: { ...pollCounts },
				lastFetchAt: { ...lastFetchAt },
				onDemandCacheSizes: { worktreePr: worktreePrCache.size, prChecks: prChecksCache.size },
			};
		},
	};
}
