// ── RPC Protocol ─────────────────────────────────────────────────────────────

export interface RpcRequest {
	id: number;
	method: string;
	params?: Record<string, unknown>;
}

export interface RpcResponse {
	id: number;
	data?: unknown;
	error?: string;
}

export interface RpcPush {
	event: string;
	data: unknown;
}

// ── Leader Election ──────────────────────────────────────────────────────────

export interface LockData {
	pid: number;
	ts: number;
}
