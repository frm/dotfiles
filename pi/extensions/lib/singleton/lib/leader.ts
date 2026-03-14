import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import type { LockData } from "./types.ts";

function readLock(path: string): LockData | null {
	try {
		return JSON.parse(readFileSync(path, "utf-8"));
	} catch {
		return null;
	}
}

function isPidAlive(pid: number): boolean {
	try {
		process.kill(pid, 0);
		return true;
	} catch {
		return false;
	}
}

export function tryAcquireLock(path: string): boolean {
	const existing = readLock(path);
	if (existing && isPidAlive(existing.pid)) return false;

	// Remove stale lock, then use exclusive create to avoid TOCTOU races
	try { unlinkSync(path); } catch {}
	try {
		writeFileSync(path, JSON.stringify({ pid: process.pid, ts: Date.now() }), { flag: "wx" });
		return true;
	} catch {
		// Another process won the race
		return false;
	}
}

export function releaseLock(path: string): void {
	try {
		unlinkSync(path);
	} catch {}
}

export function updateHeartbeat(path: string): void {
	writeFileSync(path, JSON.stringify({ pid: process.pid, ts: Date.now() }));
}

export function isLockStale(path: string, maxAgeMs: number): boolean {
	const lock = readLock(path);
	if (!lock) return true;
	if (!isPidAlive(lock.pid)) return true;
	return Date.now() - lock.ts > maxAgeMs;
}

export function startHeartbeat(path: string, intervalMs: number): () => void {
	const handle = setInterval(() => updateHeartbeat(path), intervalMs);
	return () => clearInterval(handle);
}
