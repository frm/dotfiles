import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import type { PrInfo, ReviewComment } from "./lib/types.ts";
import { getSessionRoot, socketPath, lockPath } from "./lib/protocol.ts";
import { tryAcquireLock, releaseLock, isLockStale, startHeartbeat } from "./lib/leader.ts";
import { createPoller, type Poller, type PollerStatus } from "./lib/poller.ts";
import { createServer, type GhStateServer } from "./lib/server.ts";
import { createClient, type GhStateClient } from "./lib/client.ts";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

export type { PrInfo, PrComment, ReviewComment } from "./lib/types.ts";

// ── State ────────────────────────────────────────────────────────────────────

let role: "leader" | "client" | null = null;
let sessionRoot: string | null = null;
let sockPath: string | null = null;
let lckPath: string | null = null;

let poller: Poller | null = null;
let server: GhStateServer | null = null;
let client: GhStateClient | null = null;
let stopHeartbeat: (() => void) | null = null;
let stalenessTimer: ReturnType<typeof setInterval> | null = null;

let piRef: ExtensionAPI | null = null;
let startedAt: number | null = null;

type Subscriber = (pr: PrInfo | null) => void;
const subscribers = new Set<Subscriber>();

// Client-only cached state (populated via push events)
let clientCachedPr: PrInfo | null = null;

// ── Public API ───────────────────────────────────────────────────────────────

export const ghState = {
	async start(pi: ExtensionAPI, cwd: string): Promise<void> {
		if (role) return; // Already started
		piRef = pi;
		startedAt = Date.now();

		sessionRoot = getSessionRoot(cwd);
		sockPath = socketPath(sessionRoot);
		lckPath = lockPath(sessionRoot);

		registerCommands(pi);

		const isLeader = tryAcquireLock(lckPath);
		if (isLeader) {
			await startAsLeader(pi);
		} else {
			await startAsClient();
		}

		// Periodically check if leader is still alive
		stalenessTimer = setInterval(() => {
			checkAndTakeover(pi).catch(() => {});
		}, 60_000);
	},

	stop(): void {
		if (stalenessTimer) { clearInterval(stalenessTimer); stalenessTimer = null; }

		if (role === "leader") {
			poller?.stop();
			server?.stop();
			if (stopHeartbeat) { stopHeartbeat(); stopHeartbeat = null; }
			if (lckPath) releaseLock(lckPath);
		} else if (role === "client") {
			client?.disconnect();
		}

		role = null;
		poller = null;
		server = null;
		client = null;
		piRef = null;
		startedAt = null;
		subscribers.clear();
	},

	get(): PrInfo | null {
		if (role === "leader") return poller?.getPrView() ?? null;
		return clientCachedPr;
	},

	subscribe(cb: Subscriber): () => void {
		subscribers.add(cb);
		// Deliver current state immediately
		cb(ghState.get());
		return () => subscribers.delete(cb);
	},

	async fetchReviewComments(): Promise<ReviewComment[]> {
		if (role === "leader") return poller?.getReviewComments() ?? [];
		if (client) {
			try {
				return (await client.request("reviewComments")) as ReviewComment[];
			} catch {
				return [];
			}
		}
		return [];
	},

	async refresh(): Promise<PrInfo | null> {
		if (role === "leader") return poller?.refresh() ?? null;
		if (client) {
			try {
				clientCachedPr = (await client.request("prView")) as PrInfo | null;
				notify();
				return clientCachedPr;
			} catch {
				return clientCachedPr;
			}
		}
		return null;
	},

	async status(): Promise<GhStateStatus> {
		const pr = ghState.get();
		const base: GhStateStatus = {
			role: role ?? "stopped",
			sessionRoot,
			socketPath: sockPath,
			lockPath: lckPath,
			uptime: startedAt ? Date.now() - startedAt : null,
			leaderWindow: resolveLeaderTmuxWindow(),
			cachedPr: pr ? { number: pr.number, title: pr.title } : null,
		};

		if (role === "leader") {
			base.clients = server?.getClientCount() ?? 0;
			base.subscribers = server?.getSubscriberCount() ?? 0;
			base.poller = poller?.getStatus() ?? null;
		} else if (role === "client") {
			base.connected = client?.isConnected() ?? false;
			// Ask leader for its stats
			if (client?.isConnected()) {
				try {
					base.leaderStats = (await client.request("leaderStatus")) as Record<string, unknown>;
				} catch {}
			}
		}

		return base;
	},
};

export interface GhStateStatus {
	role: "leader" | "client" | "stopped";
	sessionRoot: string | null;
	socketPath: string | null;
	lockPath: string | null;
	uptime: number | null;
	leaderWindow: string | null;
	cachedPr: { number: number; title: string } | null;
	// Leader fields
	clients?: number;
	subscribers?: number;
	poller?: PollerStatus | null;
	// Client fields
	connected?: boolean;
	leaderStats?: Record<string, unknown>;
}

// ── Command Registration ─────────────────────────────────────────────────────

let commandsRegistered = false;

function registerCommands(pi: ExtensionAPI): void {
	if (commandsRegistered) return;
	commandsRegistered = true;

	pi.registerCommand("gh-state", {
		description: "Show gh-state status (role, clients, cache ages, poll stats)",
		handler: async (_args, ctx) => {
			const status = await ghState.status();
			const lines: string[] = [];

			const uptime = status.uptime ? formatDuration(status.uptime) : "n/a";
			lines.push(`Role: ${status.role}${status.leaderWindow ? ` (leader window: ${status.leaderWindow})` : ""}`);
			lines.push(`Uptime: ${uptime}`);
			lines.push(`Session root: ${status.sessionRoot ?? "n/a"}`);
			lines.push(`Socket: ${status.socketPath ?? "n/a"}`);

			if (status.cachedPr) {
				lines.push(`Cached PR: #${status.cachedPr.number} ${status.cachedPr.title}`);
			} else {
				lines.push("Cached PR: none");
			}

			if (status.role === "leader") {
				lines.push("");
				lines.push(`Connected clients: ${status.clients ?? 0}`);
				lines.push(`Push subscribers: ${status.subscribers ?? 0}`);
				if (status.poller) {
					const p = status.poller;
					lines.push(`Branch: ${p.branch ?? "n/a"}`);
					lines.push(`Git root: ${p.gitRoot ?? "n/a"}`);
					lines.push("");
					lines.push("Poll counts:");
					lines.push(`  prView: ${p.pollCounts.prView}  prLists: ${p.pollCounts.prLists}  reviewComments: ${p.pollCounts.reviewComments}`);
					lines.push("Cache ages:");
					lines.push(`  prView: ${formatAge(p.lastFetchAt.prView)}  prLists: ${formatAge(p.lastFetchAt.prLists)}  reviewComments: ${formatAge(p.lastFetchAt.reviewComments)}`);
					lines.push(`On-demand caches: worktreePr=${p.onDemandCacheSizes.worktreePr} entries, prChecks=${p.onDemandCacheSizes.prChecks} entries`);
				}
			} else if (status.role === "client") {
				lines.push("");
				lines.push(`Connected to leader: ${status.connected ? "yes" : "no"}`);
				if (status.leaderStats) {
					const ls = status.leaderStats as any;
					lines.push(`Leader clients: ${ls.clients ?? "?"}, subscribers: ${ls.subscribers ?? "?"}`);
					if (ls.poller) {
						lines.push(`Leader branch: ${ls.poller.branch ?? "n/a"}`);
						lines.push("Leader poll counts:");
						lines.push(`  prView: ${ls.poller.pollCounts?.prView}  prLists: ${ls.poller.pollCounts?.prLists}  reviewComments: ${ls.poller.pollCounts?.reviewComments}`);
						lines.push("Leader cache ages:");
						lines.push(`  prView: ${formatAge(ls.poller.lastFetchAt?.prView)}  prLists: ${formatAge(ls.poller.lastFetchAt?.prLists)}  reviewComments: ${formatAge(ls.poller.lastFetchAt?.reviewComments)}`);
					}
				}
			}

			ctx.ui.notify(lines.join("\n"), "info");
		},
	});
}

function formatDuration(ms: number): string {
	const s = Math.floor(ms / 1000);
	if (s < 60) return `${s}s`;
	const m = Math.floor(s / 60);
	if (m < 60) return `${m}m ${s % 60}s`;
	const h = Math.floor(m / 60);
	return `${h}h ${m % 60}m`;
}

function formatAge(ts: number | null | undefined): string {
	if (ts == null) return "never";
	return `${formatDuration(Date.now() - ts)} ago`;
}

// ── Leader Window Resolution ─────────────────────────────────────────────────

function resolveLeaderTmuxWindow(): string | null {
	if (!lckPath) return null;

	// Read the lock file to get leader PID
	let leaderPid: number;
	try {
		const lock = JSON.parse(readFileSync(lckPath, "utf-8"));
		leaderPid = lock.pid;
	} catch {
		return null;
	}

	// If we're the leader, just get our own window name
	if (role === "leader") {
		try {
			return execFileSync("tmux", ["display-message", "-p", "#{window_name}"], { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim() || null;
		} catch {
			return null;
		}
	}

	// For clients: find which tmux pane holds the leader PID (or its children)
	try {
		const panes = execFileSync("tmux", ["list-panes", "-a", "-F", "#{pane_pid} #{window_name}"], { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
		for (const line of panes.split("\n")) {
			const [pidStr, ...rest] = line.split(" ");
			const panePid = parseInt(pidStr);
			if (!panePid) continue;
			// Check if leader PID is the pane PID or a descendant
			if (panePid === leaderPid || isDescendant(leaderPid, panePid)) {
				return rest.join(" ") || null;
			}
		}
	} catch {}
	return null;
}

function isDescendant(pid: number, ancestorPid: number): boolean {
	// Walk up the process tree from pid to see if ancestorPid is an ancestor
	try {
		let current = pid;
		for (let i = 0; i < 10; i++) {
			const ppid = parseInt(execFileSync("ps", ["-o", "ppid=", "-p", String(current)], { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim());
			if (!ppid || ppid <= 1) return false;
			if (ppid === ancestorPid) return true;
			current = ppid;
		}
	} catch {}
	return false;
}

// ── Leader Setup ─────────────────────────────────────────────────────────────

async function startAsLeader(pi: ExtensionAPI): Promise<void> {
	role = "leader";

	poller = createPoller(pi, sessionRoot!, (event, data) => {
		if (event === "prView") {
			notify();
		}
		server?.pushToSubscribers(event, data);
	});

	server = createServer(sockPath!, poller);
	await server.start();
	await poller.start();
	stopHeartbeat = startHeartbeat(lckPath!, 30_000);
}

// ── Client Setup ─────────────────────────────────────────────────────────────

async function startAsClient(): Promise<void> {
	role = "client";

	client = createClient(sockPath!);
	try {
		await client.connect();
		// Subscribe to push events
		await client.request("subscribe", { events: ["prView", "reviewComments"] });
		client.onPush((event, data) => {
			if (event === "prView") {
				clientCachedPr = data as PrInfo | null;
				notify();
			}
		});
		// Fetch initial state
		clientCachedPr = (await client.request("prView")) as PrInfo | null;
		notify();
	} catch {
		// Server not ready — will retry via staleness checker
		client = null;
	}
}

// ── Leader Takeover ──────────────────────────────────────────────────────────

async function checkAndTakeover(pi: ExtensionAPI): Promise<void> {
	if (role === "leader" || !lckPath || !sockPath) return;

	// If we're a client and connection is healthy, no need to check
	if (client?.isConnected()) return;

	// Try to reconnect first
	try {
		client = createClient(sockPath);
		await client.connect();
		await client.request("subscribe", { events: ["prView", "reviewComments"] });
		client.onPush((event, data) => {
			if (event === "prView") {
				clientCachedPr = data as PrInfo | null;
				notify();
			}
		});
		return;
	} catch {
		client = null;
	}

	// Socket gone — try to become leader
	try {
		if (isLockStale(lckPath, 90_000) && tryAcquireLock(lckPath)) {
			await startAsLeader(pi);
		}
	} catch {
		// Takeover failed — release lock if we claimed it, retry next cycle
		if (lckPath) releaseLock(lckPath);
		role = "client";
	}
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function notify(): void {
	const pr = ghState.get();
	for (const cb of subscribers) cb(pr);
}
