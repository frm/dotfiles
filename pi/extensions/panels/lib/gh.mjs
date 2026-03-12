import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const PIPE = { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] };

// ── Socket Path Resolution ───────────────────────────────────────────────────

let cachedSocketPath = null;

function getSocketPath() {
	if (cachedSocketPath) return cachedSocketPath;
	let sessionRoot;
	try {
		sessionRoot = execFileSync("tmux", ["display-message", "-p", "#{session_path}"], {
			...PIPE, timeout: 2000,
		}).trim();
	} catch {
		sessionRoot = process.cwd();
	}
	const id = createHash("sha256").update(sessionRoot).digest("hex").slice(0, 12);
	cachedSocketPath = `/tmp/gh-state-${id}.sock`;
	return cachedSocketPath;
}

// ── Sync IPC Helper ──────────────────────────────────────────────────────────

function ipcRequest(method, params) {
	const sockPath = getSocketPath();
	const request = JSON.stringify({ id: 1, method, params });
	const script = `
const net=require('net');
const s=net.connect(${JSON.stringify(sockPath)});
s.write(${JSON.stringify(request)}+'\\n');
let d='';
s.on('data',c=>{d+=c;const i=d.indexOf('\\n');if(i>=0){process.stdout.write(d.slice(0,i));s.destroy();}});
s.on('error',()=>process.exit(1));
setTimeout(()=>process.exit(1),700);
`.trim();

	try {
		const raw = execFileSync("node", ["-e", script], { ...PIPE, timeout: 800 }).trim();
		if (!raw) return null;
		const response = JSON.parse(raw);
		if (response.error) return null;
		return response.data;
	} catch {
		return null;
	}
}

// ── Exported API (same signatures as before) ─────────────────────────────────

let cachedUsername = null;

export function getUsername() {
	if (cachedUsername) return cachedUsername;

	// Try IPC
	const ipc = ipcRequest("username");
	if (ipc) { cachedUsername = ipc; return cachedUsername; }

	// Fallback: direct gh call
	try {
		cachedUsername = execFileSync("gh", ["api", "user", "--jq", ".login"], {
			...PIPE, timeout: 10_000,
		}).trim();
	} catch { cachedUsername = null; }
	return cachedUsername;
}

export function prList(opts, cwd) {
	// prList has complex params — try IPC for the common cases
	// For worktree lookups (opts.head), try worktreePr method
	if (opts.head && opts.state === "all" && opts.limit === 1) {
		const ipc = ipcRequest("worktreePr", { branch: opts.head, cwd });
		if (ipc !== null) return ipc ? [ipc] : [];
	}

	// For PR lists (search/author), try prLists method
	if ((opts.search && opts.search.includes("review-requested")) || opts.author === "@me") {
		const ipc = ipcRequest("prLists");
		if (ipc) {
			if (opts.search && opts.search.includes("review-requested")) return ipc.reviewPrs ?? [];
			if (opts.author === "@me") return ipc.myPrs ?? [];
		}
	}

	// Fallback: direct gh call
	const args = ["pr", "list"];
	if (opts.search) args.push("--search", opts.search);
	if (opts.author) args.push("--author", opts.author);
	if (opts.state) args.push("--state", opts.state);
	if (opts.head) args.push("--head", opts.head);
	if (opts.json) args.push("--json", opts.json);
	if (opts.limit) args.push("--limit", String(opts.limit));
	try {
		return JSON.parse(execFileSync("gh", args, { ...PIPE, cwd, timeout: 15_000 }).trim());
	} catch { return []; }
}

export function prView(json, cwd) {
	// Try IPC
	const ipc = ipcRequest("prView", { fields: json });
	if (ipc !== null) return ipc;

	// Fallback: direct gh call
	try {
		const raw = execFileSync("gh", ["pr", "view", "--json", json], {
			...PIPE, cwd, timeout: 15_000,
		}).trim();
		return raw ? JSON.parse(raw) : null;
	} catch { return null; }
}

export function repoMergeMethod(cwd) {
	try {
		const raw = execFileSync("gh", ["api", "repos/{owner}/{repo}", "--jq",
			'if .allow_squash_merge then "squash" elif .allow_rebase_merge then "rebase" elif .allow_merge_commit then "merge" else "squash" end',
		], { ...PIPE, cwd, timeout: 10_000 }).trim();
		return raw || "squash";
	} catch { return "squash"; }
}

/**
 * Merge a PR. Tries bare merge first (merge queues), falls back to explicit strategy.
 * Returns { ok, method } where method is "queue" | "squash" | "rebase" | "merge".
 */
export function prMerge(number, { auto = false } = {}, cwd) {
	// Bare merge — works with merge queues, no strategy needed
	const args = ["pr", "merge", String(number)];
	if (auto) args.push("--auto");
	try {
		execFileSync("gh", args, { ...PIPE, cwd, timeout: 30_000 });
		return { ok: true, method: "queue" };
	} catch {}

	// Fall back to explicit strategy + --delete-branch
	const method = repoMergeMethod(cwd);
	const flag = method === "merge" ? "--merge" : method === "rebase" ? "--rebase" : "--squash";
	const fallbackArgs = ["pr", "merge", String(number), flag, "--delete-branch"];
	if (auto) fallbackArgs.push("--auto");
	try {
		execFileSync("gh", fallbackArgs, { ...PIPE, cwd, timeout: 30_000 });
		return { ok: true, method };
	} catch (e) {
		return { ok: false, method, error: e.stderr?.trim() || e.message || "merge failed" };
	}
}

/**
 * Batch-fetch merge queue positions for multiple PR numbers.
 * Returns a Map<number, number> of prNumber -> queue position.
 */
export function prMergeQueuePositions(numbers, cwd) {
	if (numbers.length === 0) return new Map();
	const aliases = numbers.map((n, i) => `pr${i}: pullRequest(number: ${n}) { number mergeQueueEntry { position } }`).join("\n");
	const query = `query($owner: String!, $repo: String!) { repository(owner: $owner, name: $repo) { ${aliases} } }`;
	try {
		const raw = execFileSync("gh", ["api", "graphql",
			"-F", "owner={owner}", "-F", "repo={repo}",
			"-f", `query=${query}`,
		], { ...PIPE, cwd, timeout: 15_000 }).trim();
		const data = JSON.parse(raw);
		const repo = data?.data?.repository;
		if (!repo) return new Map();
		const result = new Map();
		for (let i = 0; i < numbers.length; i++) {
			const entry = repo[`pr${i}`];
			const pos = entry?.mergeQueueEntry?.position;
			if (pos != null) result.set(entry.number, pos);
		}
		return result;
	} catch { return new Map(); }
}

export function prChecks(prNumber, cwd) {
	// Try IPC
	const ipc = ipcRequest("prChecks", { prNumber });
	if (ipc !== null) return ipc;

	// Fallback: direct gh call
	try {
		let raw;
		try {
			raw = execFileSync("gh", ["pr", "checks", String(prNumber)], {
				...PIPE, cwd, timeout: 10_000,
			});
		} catch (err) { raw = err.stdout ?? ""; }
		raw = (raw ?? "").toString().trim();
		if (!raw) return { status: null, passing: 0, total: 0 };

		const statuses = [];
		for (const line of raw.split("\n")) {
			const parts = line.split("\t");
			if (parts[1]) statuses.push(parts[1].trim());
		}
		const total = statuses.length;
		const passing = statuses.filter((s) => s === "pass" || s === "skipping").length;
		if (total === 0) return { status: null, passing: 0, total: 0 };

		let status = null;
		if (statuses.some((s) => s === "fail")) status = "fail";
		else if (statuses.some((s) => s === "pending")) status = "pending";
		else if (passing === total) status = "pass";
		return { status, passing, total };
	} catch {
		return { status: null, passing: 0, total: 0 };
	}
}
