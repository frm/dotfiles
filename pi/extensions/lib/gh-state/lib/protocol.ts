import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import type { RpcRequest, RpcResponse, RpcPush } from "./types.ts";

const PIPE = { encoding: "utf-8" as const, stdio: ["pipe", "pipe", "pipe"] as const };

export function getSessionRoot(fallbackCwd: string): string {
	try {
		const result = execFileSync("tmux", ["display-message", "-p", "#{session_path}"], {
			...PIPE,
			timeout: 2000,
		}).trim();
		if (result) return result;
	} catch {
		// No tmux or command failed
	}
	return fallbackCwd;
}

export function computeId(sessionRoot: string): string {
	return createHash("sha256").update(sessionRoot).digest("hex").slice(0, 12);
}

export function socketPath(sessionRoot: string): string {
	return `/tmp/gh-state-${computeId(sessionRoot)}.sock`;
}

export function lockPath(sessionRoot: string): string {
	return `/tmp/gh-state-${computeId(sessionRoot)}.lock`;
}

export function encodeMessage(msg: object): string {
	return JSON.stringify(msg) + "\n";
}

export function createLineParser(onMessage: (msg: RpcRequest | RpcResponse | RpcPush) => void) {
	let buffer = "";
	return (chunk: Buffer) => {
		buffer += chunk.toString();
		const lines = buffer.split("\n");
		buffer = lines.pop() ?? "";
		for (const line of lines) {
			if (!line.trim()) continue;
			try {
				onMessage(JSON.parse(line));
			} catch {}
		}
	};
}
