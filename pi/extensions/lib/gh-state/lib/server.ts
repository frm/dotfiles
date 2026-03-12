import { createServer as netCreateServer, type Server, type Socket } from "node:net";
import { unlinkSync } from "node:fs";
import type { Poller } from "./poller.ts";
import type { RpcRequest } from "./types.ts";
import { encodeMessage, createLineParser } from "./protocol.ts";

interface Subscriber {
	socket: Socket;
	events: Set<string>;
}

export interface GhStateServer {
	start(): Promise<void>;
	stop(): void;
	pushToSubscribers(event: string, data: unknown): void;
	getClientCount(): number;
	getSubscriberCount(): number;
}

export function createServer(sockPath: string, poller: Poller): GhStateServer {
	let server: Server | null = null;
	const connections = new Set<Socket>();
	const subscribers: Subscriber[] = [];

	function removeConnection(socket: Socket) {
		connections.delete(socket);
		const idx = subscribers.findIndex((s) => s.socket === socket);
		if (idx >= 0) subscribers.splice(idx, 1);
	}

	async function dispatch(method: string, params?: Record<string, unknown>): Promise<unknown> {
		switch (method) {
			case "prView":
				return poller.getPrView();
			case "prLists":
				return poller.getPrLists();
			case "reviewComments":
				return poller.getReviewComments();
			case "worktreePr":
				return poller.getWorktreePr(params?.branch as string, params?.cwd as string);
			case "username":
				return poller.getUsername();
			case "prChecks":
				return poller.getPrChecks(params?.prNumber as number);
			case "leaderStatus":
				return { clients: connections.size, subscribers: subscribers.length, poller: poller.getStatus() };
			default:
				throw new Error(`Unknown method: ${method}`);
		}
	}

	async function handleMessage(socket: Socket, msg: RpcRequest) {
		if (!("id" in msg) || !msg.method) return;

		try {
			let data: unknown;
			if (msg.method === "subscribe") {
				const events = (msg.params?.events as string[]) ?? [];
				const existing = subscribers.find((s) => s.socket === socket);
				if (existing) {
					for (const e of events) existing.events.add(e);
				} else {
					subscribers.push({ socket, events: new Set(events) });
				}
				data = { ok: true };
			} else {
				data = await dispatch(msg.method, msg.params);
			}
			socket.write(encodeMessage({ id: msg.id, data }));
		} catch (err: any) {
			socket.write(encodeMessage({ id: msg.id, error: err?.message ?? String(err) }));
		}
	}

	return {
		start() {
			return new Promise<void>((resolve, reject) => {
				// Clean up stale socket
				try { unlinkSync(sockPath); } catch {}

				server = netCreateServer((socket) => {
					connections.add(socket);
					const parser = createLineParser((msg) => handleMessage(socket, msg as RpcRequest));
					socket.on("data", parser);
					socket.on("close", () => removeConnection(socket));
					socket.on("error", () => removeConnection(socket));
				});

				server.on("error", (err) => {
					if (!server?.listening) reject(err);
				});

				server.listen(sockPath, () => resolve());
			});
		},

		stop() {
			for (const socket of connections) {
				try { socket.destroy(); } catch {}
			}
			connections.clear();
			subscribers.length = 0;
			if (server) {
				server.close();
				server = null;
				try { unlinkSync(sockPath); } catch {}
			}
		},

		getClientCount() { return connections.size; },
		getSubscriberCount() { return subscribers.length; },

		pushToSubscribers(event: string, data: unknown) {
			const msg = encodeMessage({ event, data });
			for (let i = subscribers.length - 1; i >= 0; i--) {
				const sub = subscribers[i];
				if (!sub.events.has(event)) continue;
				try {
					sub.socket.write(msg);
				} catch {
					subscribers.splice(i, 1);
				}
			}
		},
	};
}
