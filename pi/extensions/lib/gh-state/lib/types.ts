// ── PR Data Types ────────────────────────────────────────────────────────────

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

// ── RPC Protocol ─────────────────────────────────────────────────────────────

export interface RpcRequest {
	id: number;
	method: string;
	params?: Record<string, unknown>;
}

export interface RpcResponse {
	id: number;
	data?: unknown;
	error?: string;
}

export interface RpcPush {
	event: string;
	data: unknown;
}

// ── Leader Election ──────────────────────────────────────────────────────────

export interface LockData {
	pid: number;
	ts: number;
}

// ── Cache ────────────────────────────────────────────────────────────────────

export interface CacheEntry<T> {
	data: T;
	fetchedAt: number;
}
