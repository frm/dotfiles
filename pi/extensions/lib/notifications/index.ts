import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { createSingleton, getSessionRoot, type Singleton, type PushFn } from "../singleton/index.ts";
import { createStore, type NotificationStore } from "./lib/store.ts";
import type { Notification, NotificationsService, PublishParams } from "./lib/types.ts";
import { join } from "node:path";
import { homedir } from "node:os";

export type { Notification, PublishParams } from "./lib/types.ts";

const PERSIST_PATH = join(homedir(), ".pi", "agent", "notifications.json");

// ── State ────────────────────────────────────────────────────────────────────

let singleton: Singleton<NotificationsService> | null = null;
let storeRef: NotificationStore | null = null;

type Handler = (params: Record<string, unknown>) => Promise<void>;
const handlers = new Map<string, Handler>();

// ── Public API ───────────────────────────────────────────────────────────────

export const notificationsState = {
	async start(pi: ExtensionAPI, cwd: string): Promise<void> {
		if (singleton) return;

		const sessionRoot = getSessionRoot(cwd);

		singleton = createSingleton<NotificationsService>({
			name: "notifications",
			sessionRoot,
			createService(push: PushFn): NotificationsService {
				const store = createStore(PERSIST_PATH);
				store.restore();
				storeRef = store;

				function pushList(): void {
					push("notifications", store.list());
				}

				return {
					publish(p) {
						const n = store.publish(p as unknown as PublishParams);
						pushList();
						return n;
					},
					list() {
						return store.list();
					},
					dismiss(p) {
						const ok = store.dismiss(p?.id as string);
						if (ok) pushList();
						return ok;
					},
					dismissByFingerprint(p) {
						const ok = store.dismissByFingerprint(
							p?.source as string,
							p?.fingerprint as string,
						);
						if (ok) pushList();
						return ok;
					},
					snooze(p) {
						const ok = store.snooze(p?.id as string);
						if (ok) pushList();
						return ok;
					},
					requestAction(p) {
						const id = p?.id as string;
						const targetPaneId = p?.targetPaneId as string | undefined;
						const notification = store.get(id);
						if (!notification?.suggestedAction) {
							return { ok: false, error: "No action on this notification" };
						}
						push("action-request", {
							id,
							handler: notification.suggestedAction.handler,
							params: notification.suggestedAction.params,
							targetPaneId,
						});
						return { ok: true, dispatched: true };
					},
				};
			},
		});

		await singleton.start();

		// Subscribe to action requests and handle claims
		singleton.subscribe("action-request", async (data: unknown) => {
			const { id, handler: handlerName, params, targetPaneId } = data as {
				id: string;
				handler: string;
				params: Record<string, unknown>;
				targetPaneId?: string;
			};

			// Only accept if targeted at this instance (or no target specified)
			if (targetPaneId && targetPaneId !== process.env.TMUX_PANE) return;

			const handler = handlers.get(handlerName);
			if (!handler) return; // not our handler

			// Try to claim
			let claimed = false;
			try {
				const result = (await singleton!.call("claimAction", { id })) as { ok: boolean };
				claimed = result?.ok ?? false;
			} catch {
				return; // couldn't claim
			}
			if (!claimed) return; // another instance claimed it

			// Execute handler
			try {
				await handler(params);
				await singleton!.call("completeAction", { id });
			} catch {
				// Handler failed — complete anyway to release claim and dismiss
				await singleton!.call("completeAction", { id }).catch(() => {});
			}
		});
	},

	stop(): void {
		singleton?.stop();
		singleton = null;
		storeRef = null;
	},

	registerHandler(name: string, handler: Handler): void {
		handlers.set(name, handler);
	},

	async publish(params: PublishParams): Promise<Notification | null> {
		if (!singleton) return null;
		try {
			return (await singleton.call("publish", params as unknown as Record<string, unknown>)) as Notification;
		} catch { return null; }
	},

	async dismiss(id: string): Promise<boolean> {
		if (!singleton) return false;
		try {
			return (await singleton.call("dismiss", { id })) as boolean;
		} catch { return false; }
	},

	async dismissByFingerprint(source: string, fingerprint: string): Promise<boolean> {
		if (!singleton) return false;
		try {
			return (await singleton.call("dismissByFingerprint", { source, fingerprint })) as boolean;
		} catch { return false; }
	},

	async list(): Promise<Notification[]> {
		if (!singleton) return [];
		try {
			return (await singleton.call("list")) as Notification[];
		} catch { return []; }
	},

	async snooze(id: string): Promise<boolean> {
		if (!singleton) return false;
		try {
			return (await singleton.call("snooze", { id })) as boolean;
		} catch { return false; }
	},

	async requestAction(id: string): Promise<{ ok: boolean; dispatched?: boolean; error?: string }> {
		if (!singleton) return { ok: false, error: "Not started" };
		try {
			return (await singleton.call("requestAction", { id })) as { ok: boolean; dispatched?: boolean; error?: string };
		} catch { return { ok: false, error: "IPC error" }; }
	},
};
