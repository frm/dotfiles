import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, renameSync } from "node:fs";
import { dirname } from "node:path";
import type { Notification, PublishParams, Priority } from "./types.ts";

const PRIORITY_ORDER: Record<Priority, number> = {
	"blocked": 0,
	"needs-decision": 1,
	"suggestion": 2,
	"info": 3,
};

const RATE_LIMIT_MS = 60_000;

export interface NotificationStore {
	publish(params: PublishParams): Notification;
	list(): Notification[];
	dismiss(id: string): boolean;
	dismissByFingerprint(source: string, fingerprint: string): boolean;
	snooze(id: string): boolean;
	get(id: string): Notification | undefined;
	restore(): void;
}

export function createStore(persistPath: string): NotificationStore {
	let notifications: Notification[] = [];
	const lastWriteByKey = new Map<string, number>();

	function dedupKey(source: string, fingerprint: string): string {
		return `${source}::${fingerprint}`;
	}

	function persist(): void {
		const dir = dirname(persistPath);
		mkdirSync(dir, { recursive: true });
		const tmp = persistPath + ".tmp." + process.pid;
		writeFileSync(tmp, JSON.stringify(notifications, null, 2));
		renameSync(tmp, persistPath);
	}

	function filterExpired(): void {
		const now = Date.now();
		notifications = notifications.filter(n => !n.expiresAt || n.expiresAt > now);
	}

	function sorted(): Notification[] {
		return [...notifications].sort((a, b) => {
			const pd = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
			if (pd !== 0) return pd;
			return b.updatedAt - a.updatedAt;
		});
	}

	return {
		publish(params: PublishParams): Notification {
			const now = Date.now();
			const key = dedupKey(params.source, params.fingerprint);
			const existing = notifications.find(
				n => n.source === params.source && n.fingerprint === params.fingerprint,
			);

			if (existing) {
				// Skip update if snoozed
				if (existing.snoozedUntil && existing.snoozedUntil > now) {
					return existing;
				}

				existing.count++;
				existing.updatedAt = now;
				existing.title = params.title;
				if (params.summary !== undefined) existing.summary = params.summary;
				existing.priority = params.priority;
				if (params.expiresAt !== undefined) existing.expiresAt = params.expiresAt;
				if (params.snoozeDuration !== undefined) existing.snoozeDuration = params.snoozeDuration;
				if (params.suggestedAction !== undefined) existing.suggestedAction = params.suggestedAction;

				const lastWrite = lastWriteByKey.get(key) ?? 0;
				if (now - lastWrite >= RATE_LIMIT_MS) {
					persist();
					lastWriteByKey.set(key, now);
				}
				return existing;
			}

			const notification: Notification = {
				id: randomUUID(),
				title: params.title,
				summary: params.summary,
				source: params.source,
				fingerprint: params.fingerprint,
				priority: params.priority,
				count: 1,
				createdAt: now,
				updatedAt: now,
				expiresAt: params.expiresAt,
				snoozeDuration: params.snoozeDuration,
				suggestedAction: params.suggestedAction,
			};
			notifications.push(notification);
			persist();
			lastWriteByKey.set(key, now);
			return notification;
		},

		list(): Notification[] {
			filterExpired();
			const now = Date.now();
			const visible = notifications.filter(n => !n.snoozedUntil || n.snoozedUntil <= now);
			return [...visible].sort((a, b) => {
				const pd = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
				if (pd !== 0) return pd;
				return b.updatedAt - a.updatedAt;
			});
		},

		dismiss(id: string): boolean {
			const before = notifications.length;
			notifications = notifications.filter(n => n.id !== id);
			if (notifications.length !== before) { persist(); return true; }
			return false;
		},

		dismissByFingerprint(source: string, fingerprint: string): boolean {
			const before = notifications.length;
			notifications = notifications.filter(
				n => !(n.source === source && n.fingerprint === fingerprint),
			);
			if (notifications.length !== before) { persist(); return true; }
			return false;
		},

		snooze(id: string): boolean {
			const n = notifications.find(n => n.id === id);
			if (!n) return false;
			const duration = n.snoozeDuration ?? 4 * 60 * 60 * 1000; // default 4h
			n.snoozedUntil = Date.now() + duration;
			persist();
			return true;
		},

		get(id: string): Notification | undefined {
			return notifications.find(n => n.id === id);
		},

		restore(): void {
			try {
				const raw = readFileSync(persistPath, "utf-8");
				notifications = JSON.parse(raw);
			} catch {
				notifications = [];
			}
		},
	};
}
