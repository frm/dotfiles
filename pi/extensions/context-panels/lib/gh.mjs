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
