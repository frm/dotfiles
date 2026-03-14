import { socketPath, lockPath } from "./lib/protocol.ts";
import { tryAcquireLock, releaseLock, isLockStale, startHeartbeat } from "./lib/leader.ts";
import { createServer, type SingletonServer } from "./lib/server.ts";
import { createClient, type SingletonClient } from "./lib/client.ts";

export { getSessionRoot } from "./lib/protocol.ts";
export { createSyncClient, type SyncClient } from "./lib/sync-client.ts";

// ── Types ────────────────────────────────────────────────────────────────────

export type PushFn = (event: string, data: unknown) => void;

export interface SingletonOptions<T extends Record<string, Function>> {
	name: string;
	sessionRoot: string;
	createService: (push: PushFn) => T | Promise<T>;
}

export interface Singleton<T extends Record<string, Function>> {
	start(): Promise<void>;
	stop(): void;
	call<M extends keyof T & string>(method: M, params?: Record<string, unknown>): Promise<unknown>;
	subscribe(event: string, cb: (data: unknown) => void): () => void;
	role(): "leader" | "client" | null;
	status(): SingletonStatus;
}

export interface SingletonStatus {
	role: "leader" | "client" | null;
	sessionRoot: string;
	socketPath: string;
	lockPath: string;
	uptime: number | null;
	clients?: number;
	subscribers?: number;
	connected?: boolean;
	leaderStats?: Record<string, unknown>;
}

// ── Factory ──────────────────────────────────────────────────────────────────

export function createSingleton<T extends Record<string, Function>>(opts: SingletonOptions<T>): Singleton<T> {
	const sessRoot = opts.sessionRoot;
	const sockPath = socketPath(opts.name, sessRoot);
	const lckPath = lockPath(opts.name, sessRoot);

	let role: "leader" | "client" | null = null;
	let service: T | null = null;
	let server: SingletonServer | null = null;
	let client: SingletonClient | null = null;
	let stopHeartbeat: (() => void) | null = null;
	let stalenessTimer: ReturnType<typeof setInterval> | null = null;
	let startedAt: number | null = null;

	type PushSubscriber = (event: string, data: unknown) => void;
	const pushSubscribers = new Set<PushSubscriber>();

	// ── Leader Setup ──────────────────────────────────────────────────────

	async function startAsLeader(): Promise<void> {
		role = "leader";

		const push: PushFn = (event, data) => {
			server?.pushToSubscribers(event, data);
			for (const cb of pushSubscribers) cb(event, data);
		};

		service = await opts.createService(push);
		server = createServer(sockPath, service as unknown as Record<string, Function>);
		await server.start();
		stopHeartbeat = startHeartbeat(lckPath, 30_000);
	}

	// ── Client Setup ──────────────────────────────────────────────────────

	async function startAsClient(): Promise<void> {
		role = "client";
		client = createClient(sockPath);
		try {
			await client.connect();
			client.onPush((event, data) => {
				for (const cb of pushSubscribers) cb(event, data);
			});
		} catch {
			client = null;
		}
	}

	// ── Takeover ──────────────────────────────────────────────────────────

	async function checkAndTakeover(): Promise<void> {
		if (role === "leader") return;
		if (client?.isConnected()) return;

		// Try reconnecting first
		try {
			client = createClient(sockPath);
			await client.connect();
			client.onPush((event, data) => {
				for (const cb of pushSubscribers) cb(event, data);
			});
			return;
		} catch {
			client = null;
		}

		// Socket gone — try to become leader
		try {
			if (isLockStale(lckPath, 90_000) && tryAcquireLock(lckPath)) {
				await startAsLeader();
			}
		} catch {
			if (lckPath) releaseLock(lckPath);
			role = "client";
		}
	}

	// ── Public Interface ──────────────────────────────────────────────────

	return {
		async start() {
			if (role) return;
			startedAt = Date.now();

			const isLeader = tryAcquireLock(lckPath);
			if (isLeader) {
				await startAsLeader();
			} else {
				await startAsClient();
			}

			stalenessTimer = setInterval(() => {
				checkAndTakeover().catch(() => {});
			}, 60_000);
		},

		stop() {
			if (stalenessTimer) { clearInterval(stalenessTimer); stalenessTimer = null; }

			if (role === "leader") {
				// Cleanup service
				if (service) {
					if (Symbol.dispose in service) (service as any)[Symbol.dispose]();
					else if ("stop" in service && typeof (service as any).stop === "function") (service as any).stop();
				}
				server?.stop();
				if (stopHeartbeat) { stopHeartbeat(); stopHeartbeat = null; }
				releaseLock(lckPath);
			} else if (role === "client") {
				client?.disconnect();
			}

			role = null;
			service = null;
			server = null;
			client = null;
			startedAt = null;
			pushSubscribers.clear();
		},

		async call(method, params) {
			if (role === "leader" && service) {
				const fn = service[method];
				if (typeof fn !== "function") throw new Error(`Unknown method: ${String(method)}`);
				return fn(params);
			}
			if (client?.isConnected()) {
				return client.request(String(method), params);
			}
			throw new Error("Not connected");
		},

		subscribe(event: string, cb: (data: unknown) => void) {
			const wrapper: PushSubscriber = (e, d) => { if (e === event) cb(d); };
			pushSubscribers.add(wrapper);

			// If client, register subscription with server
			if (role === "client" && client?.isConnected()) {
				client.request("subscribe", { events: [event] }).catch(() => {});
			}

			return () => { pushSubscribers.delete(wrapper); };
		},

		role() { return role; },

		status() {
			const base: SingletonStatus = {
				role,
				sessionRoot: sessRoot,
				socketPath: sockPath,
				lockPath: lckPath,
				uptime: startedAt ? Date.now() - startedAt : null,
			};

			if (role === "leader") {
				base.clients = server?.getClientCount() ?? 0;
				base.subscribers = server?.getSubscriberCount() ?? 0;
			} else if (role === "client") {
				base.connected = client?.isConnected() ?? false;
			}

			return base;
		},
	};
}
