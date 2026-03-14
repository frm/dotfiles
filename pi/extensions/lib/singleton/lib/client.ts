import { connect, type Socket } from "node:net";
import type { RpcResponse, RpcPush } from "./types.ts";
import { encodeMessage, createLineParser } from "./protocol.ts";

export interface SingletonClient {
	connect(): Promise<void>;
	disconnect(): void;
	isConnected(): boolean;
	request(method: string, params?: Record<string, unknown>): Promise<unknown>;
	onPush(handler: (event: string, data: unknown) => void): void;
}

export function createClient(sockPath: string): SingletonClient {
	let socket: Socket | null = null;
	let nextId = 1;
	const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
	let pushHandler: ((event: string, data: unknown) => void) | null = null;

	function handleIncoming(msg: RpcResponse | RpcPush) {
		// Push event (no id)
		if ("event" in msg && !("id" in msg)) {
			pushHandler?.(msg.event, msg.data);
			return;
		}
		// Response
		if ("id" in msg) {
			const p = pending.get(msg.id);
			if (!p) return;
			pending.delete(msg.id);
			if (msg.error) p.reject(new Error(msg.error));
			else p.resolve(msg.data);
		}
	}

	return {
		connect() {
			return new Promise<void>((resolve, reject) => {
				let settled = false;
				socket = connect(sockPath);
				const parser = createLineParser(handleIncoming);

				socket.on("connect", () => {
					if (!settled) { settled = true; resolve(); }
				});
				socket.on("data", parser);
				socket.on("error", (err) => {
					for (const p of pending.values()) p.reject(err);
					pending.clear();
					if (!settled) { settled = true; reject(err); }
				});
				socket.on("close", () => {
					for (const p of pending.values()) p.reject(new Error("Connection closed"));
					pending.clear();
					if (!settled) { settled = true; reject(new Error("Connection closed")); }
					socket = null;
				});
			});
		},

		disconnect() {
			if (socket) {
				socket.destroy();
				socket = null;
			}
			for (const p of pending.values()) p.reject(new Error("Disconnected"));
			pending.clear();
		},

		isConnected() {
			return socket !== null && !socket.destroyed;
		},

		request(method: string, params?: Record<string, unknown>): Promise<unknown> {
			if (!socket || socket.destroyed) return Promise.reject(new Error("Not connected"));
			const id = nextId++;
			return new Promise((resolve, reject) => {
				const timeout = setTimeout(() => {
					pending.delete(id);
					reject(new Error("Request timeout"));
				}, 5000);

				pending.set(id, {
					resolve: (v) => { clearTimeout(timeout); resolve(v); },
					reject: (e) => { clearTimeout(timeout); reject(e); },
				});
				socket!.write(encodeMessage({ id, method, params }));
			});
		},

		onPush(handler: (event: string, data: unknown) => void) {
			pushHandler = handler;
		},
	};
}
