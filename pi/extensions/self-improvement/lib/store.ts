import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { LOG_PATH, AUTO_PRUNE_DAYS } from "./config.ts";
import type { FrictionEntry } from "./types.ts";

function ensureLogDir(): void {
	const dir = dirname(LOG_PATH);
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export function readLog(): FrictionEntry[] {
	if (!existsSync(LOG_PATH)) return [];
	const lines = readFileSync(LOG_PATH, "utf-8").trim().split("\n").filter(Boolean);
	const entries: FrictionEntry[] = [];
	for (const line of lines) {
		try {
			entries.push(JSON.parse(line));
		} catch {
			// skip malformed lines
		}
	}
	return entries;
}

export function writeLog(entries: FrictionEntry[]): void {
	ensureLogDir();
	const content = entries.map((e) => JSON.stringify(e)).join("\n") + (entries.length ? "\n" : "");
	writeFileSync(LOG_PATH, content);
}

export function appendEntry(entry: FrictionEntry): void {
	ensureLogDir();
	appendFileSync(LOG_PATH, JSON.stringify(entry) + "\n");
}

export function autoPrune(): number {
	const entries = readLog();
	const cutoff = new Date(Date.now() - AUTO_PRUNE_DAYS * 24 * 60 * 60 * 1000).toISOString();
	const kept = entries.filter((e) => {
		if (e.status === "applied" && e.timestamp < cutoff) return false;
		return true;
	});
	const pruned = entries.length - kept.length;
	if (pruned > 0) writeLog(kept);
	return pruned;
}

export function updateEntryStatuses(updates: { id: string; status: "applied" | "dismissed" | "skipped" }[]): { updated: number; affectedScopes: Set<string> } {
	const entries = readLog();
	const updateMap = new Map(updates.map((u) => [u.id, u.status]));
	const now = new Date().toISOString();
	let updated = 0;
	const affectedScopes = new Set<string>();

	for (const entry of entries) {
		const newStatus = updateMap.get(entry.id);
		if (newStatus) {
			entry.status = newStatus;
			if (newStatus === "dismissed") {
				entry.dismissedAt = now;
			}
			affectedScopes.add(entry.scope ?? "user");
			updated++;
		}
	}

	if (updated > 0) writeLog(entries);
	return { updated, affectedScopes };
}
