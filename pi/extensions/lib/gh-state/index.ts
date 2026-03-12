import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import type { PrInfo, ReviewComment } from "./lib/types.ts";
import { getSessionRoot, socketPath, lockPath } from "./lib/protocol.ts";
import { tryAcquireLock, releaseLock, isLockStale, startHeartbeat } from "./lib/leader.ts";
import { createPoller, type Poller } from "./lib/poller.ts";
import { createServer, type GhStateServer } from "./lib/server.ts";
import { createClient, type GhStateClient } from "./lib/client.ts";

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

type Subscriber = (pr: PrInfo | null) => void;
const subscribers = new Set<Subscriber>();

// Client-only cached state (populated via push events)
let clientCachedPr: PrInfo | null = null;

// ── Public API ───────────────────────────────────────────────────────────────

export const ghState = {
	async start(pi: ExtensionAPI, cwd: string): Promise<void> {
		const { appendFileSync } = await import("node:fs");
		const dbg = (msg: string) => appendFileSync("/tmp/gh-state-debug.log", `${new Date().toISOString()} [${process.pid}] START: ${msg}\n`);
		dbg(`role=${role} cwd=${cwd}`);

		if (role) return; // Already started
		piRef = pi;

		sessionRoot = getSessionRoot(cwd);
		sockPath = socketPath(sessionRoot);
		lckPath = lockPath(sessionRoot);

		const isLeader = tryAcquireLock(lckPath);
		dbg(`sessionRoot=${sessionRoot} sockPath=${sockPath} lckPath=${lckPath} isLeader=${isLeader}`);
		try {
			if (isLeader) {
				await startAsLeader(pi);
				dbg(`leader started`);
			} else {
				await startAsClient();
				dbg(`client started`);
			}
		} catch (err: any) {
			dbg(`start error: ${err?.message ?? err}\n${err?.stack ?? ""}`);
			throw err;
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
};

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
	const { appendFileSync } = await import("node:fs");
	const dbg = (msg: string) => appendFileSync("/tmp/gh-state-debug.log", `${new Date().toISOString()} [${process.pid}] ${msg}\n`);
	dbg(`checkAndTakeover: role=${role} lckPath=${lckPath} sockPath=${sockPath} client=${!!client} connected=${client?.isConnected()}`);

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
		const stale = isLockStale(lckPath, 90_000);
		dbg(`lock stale=${stale}`);
		if (stale) {
			const acquired = tryAcquireLock(lckPath);
			dbg(`lock acquired=${acquired}`);
			if (acquired) {
				dbg(`starting as leader...`);
				await startAsLeader(pi);
				dbg(`leader started successfully`);
			}
		}
	} catch (err: any) {
		dbg(`takeover error: ${err?.message ?? err}`);
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
