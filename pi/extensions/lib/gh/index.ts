import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import type { PrInfo, ReviewComment } from "./lib/types.ts";
import { createSingleton, getSessionRoot, type Singleton, type PushFn } from "../singleton/index.ts";
import { createPoller, type Poller, type PollerStatus } from "./lib/poller.ts";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

export type { PrInfo, PrComment, ReviewComment } from "./lib/types.ts";

// ── State ────────────────────────────────────────────────────────────────────

interface GhService {
	prView(params?: Record<string, unknown>): PrInfo | null;
	prLists(params?: Record<string, unknown>): { reviewPrs: unknown[]; myPrs: unknown[] };
	prMergeQueuePositions(params?: Record<string, unknown>): Record<number, number>;
	reviewComments(params?: Record<string, unknown>): Promise<ReviewComment[]>;
	worktreePr(params?: Record<string, unknown>): Promise<unknown>;
	username(params?: Record<string, unknown>): Promise<string | null>;
	prChecks(params?: Record<string, unknown>): Promise<unknown>;
	refresh(params?: Record<string, unknown>): Promise<PrInfo | null>;
	leaderStatus(params?: Record<string, unknown>): Record<string, unknown>;
}

let singleton: Singleton<GhService> | null = null;
let pollerRef: Poller | null = null;

type Subscriber = (pr: PrInfo | null) => void;
const subscribers = new Set<Subscriber>();

// Client-only cached state (populated via push events)
let clientCachedPr: PrInfo | null = null;

// ── Public API ───────────────────────────────────────────────────────────────

export const ghState = {
	async start(pi: ExtensionAPI, cwd: string): Promise<void> {
		if (singleton) return;

		const sessionRoot = getSessionRoot(cwd);

		singleton = createSingleton<GhService>({
			name: "gh",
			sessionRoot,
			createService(push: PushFn): GhService {
				const poller = createPoller(pi, sessionRoot, (event, data) => {
					push(event, data);
				});
				poller.start();
				pollerRef = poller;

				return {
					prView: () => poller.getPrView(),
					prLists: () => poller.getPrLists(),
					prMergeQueuePositions: () => poller.getMergeQueuePositions(),
					reviewComments: () => poller.getReviewComments(),
					worktreePr: (p) => poller.getWorktreePr(p?.branch as string, p?.cwd as string),
					username: () => poller.getUsername(),
					prChecks: (p) => poller.getPrChecks(p?.prNumber as number),
					refresh: () => poller.refresh(),
					leaderStatus: () => ({ poller: poller.getStatus() }),
					[Symbol.dispose]: () => poller.stop(),
				} as GhService;
			},
		});

		// Subscribe to push events for local notification
		singleton.subscribe("prView", (data) => {
			if (singleton?.role() === "client") {
				clientCachedPr = data as PrInfo | null;
			}
			notify();
		});

		registerCommands(pi);
		await singleton.start();

		// Deliver initial state for clients
		if (singleton.role() === "client") {
			try {
				clientCachedPr = (await singleton.call("prView")) as PrInfo | null;
				notify();
			} catch {}
		} else {
			notify();
		}
	},

	stop(): void {
		singleton?.stop();
		singleton = null;
		pollerRef = null;
		subscribers.clear();
		clientCachedPr = null;
	},

	get(): PrInfo | null {
		if (singleton?.role() === "leader") return pollerRef?.getPrView() ?? null;
		return clientCachedPr;
	},

	subscribe(cb: Subscriber): () => void {
		subscribers.add(cb);
		// Deliver current state immediately
		cb(ghState.get());
		return () => subscribers.delete(cb);
	},

	async fetchReviewComments(): Promise<ReviewComment[]> {
		if (!singleton) return [];
		try {
			return (await singleton.call("reviewComments")) as ReviewComment[];
		} catch {
			return [];
		}
	},

	async refresh(): Promise<PrInfo | null> {
		if (!singleton) return null;
		try {
			const pr = (await singleton.call("refresh")) as PrInfo | null;
			if (singleton.role() === "client") {
				clientCachedPr = pr;
				notify();
			}
			return pr;
		} catch {
			return ghState.get();
		}
	},

	async status(): Promise<GhStatus> {
		const base = singleton?.status() ?? {
			role: null as "leader" | "client" | null,
			sessionRoot: null as string | null,
			socketPath: null as string | null,
			lockPath: null as string | null,
			uptime: null as number | null,
		};

		const pr = ghState.get();
		const result: GhStatus = {
			...base,
			leaderWindow: resolveLeaderTmuxWindow(base.lockPath),
			cachedPr: pr ? { number: pr.number, title: pr.title } : null,
		};

		if (base.role === "leader") {
			result.poller = pollerRef?.getStatus() ?? null;
		} else if (base.role === "client") {
			if (singleton) {
				try {
					result.leaderStats = (await singleton.call("leaderStatus")) as Record<string, unknown>;
				} catch {}
			}
		}

		return result;
	},
};

export interface GhStatus {
	role: "leader" | "client" | null;
	sessionRoot: string | null;
	socketPath: string | null;
	lockPath: string | null;
	uptime: number | null;
	leaderWindow: string | null;
	cachedPr: { number: number; title: string } | null;
	clients?: number;
	subscribers?: number;
	connected?: boolean;
	poller?: PollerStatus | null;
	leaderStats?: Record<string, unknown>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function notify(): void {
	const pr = ghState.get();
	for (const cb of subscribers) cb(pr);
}

// ── Command Registration ─────────────────────────────────────────────────────

let commandsRegistered = false;

function registerCommands(pi: ExtensionAPI): void {
	if (commandsRegistered) return;
	commandsRegistered = true;

	pi.registerCommand("gh", {
		description: "Show gh status (role, clients, cache ages, poll stats)",
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

function resolveLeaderTmuxWindow(lockPathStr: string | null): string | null {
	if (!lockPathStr) return null;

	let leaderPid: number;
	try {
		const lock = JSON.parse(readFileSync(lockPathStr, "utf-8"));
		leaderPid = lock.pid;
	} catch {
		return null;
	}

	if (singleton?.role() === "leader") {
		try {
			return execFileSync("tmux", ["display-message", "-p", "#{window_name}"], { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim() || null;
		} catch {
			return null;
		}
	}

	try {
		const panes = execFileSync("tmux", ["list-panes", "-a", "-F", "#{pane_pid} #{window_name}"], { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
		for (const line of panes.split("\n")) {
			const [pidStr, ...rest] = line.split(" ");
			const panePid = parseInt(pidStr);
			if (!panePid) continue;
			if (panePid === leaderPid || isDescendant(leaderPid, panePid)) {
				return rest.join(" ") || null;
			}
		}
	} catch {}
	return null;
}

function isDescendant(pid: number, ancestorPid: number): boolean {
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
