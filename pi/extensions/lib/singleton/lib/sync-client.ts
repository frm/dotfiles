import { execFileSync } from "node:child_process";
import { getSessionRoot, socketPath } from "./protocol.ts";

const PIPE = { encoding: "utf-8" as const, stdio: ["pipe", "pipe", "pipe"] as const };

export interface SyncClient {
	request(method: string, params?: Record<string, unknown>): unknown | null;
}

export function createSyncClient(name: string, fallbackCwd: string): SyncClient {
	let cachedSocketPath: string | null = null;

	function getSockPath(): string {
		if (cachedSocketPath) return cachedSocketPath;
		const root = getSessionRoot(fallbackCwd);
		cachedSocketPath = socketPath(name, root);
		return cachedSocketPath;
	}

	return {
		request(method: string, params?: Record<string, unknown>): unknown | null {
			const sockPath = getSockPath();
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

			let raw: string;
			try {
				raw = execFileSync("node", ["-e", script], { ...PIPE, timeout: 800 }).trim();
			} catch (err: any) {
				// Child may exit non-zero (timeout) but still have valid stdout
				raw = (typeof err?.stdout === "string" ? err.stdout : "").trim();
				if (!raw) return null;
			}
			try {
				const response = JSON.parse(raw);
				if (response.error) return null;
				return response.data;
			} catch {
				return null;
			}
		},
	};
}
