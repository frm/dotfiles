import { createClient } from "../../lib/notifications/sync.ts";

const client = createClient(process.cwd());

export function listNotifications() {
	return client.request("list") ?? [];
}

export function dismissNotification(id: string) {
	return client.request("dismiss", { id });
}

export function dismissAll(notifications: { id: string }[]) {
	for (const n of notifications) {
		client.request("dismiss", { id: n.id });
	}
}

export function snoozeNotification(id: string) {
	return client.request("snooze", { id });
}

export function requestAction(id: string, targetPaneId?: string) {
	return client.request("requestAction", { id, targetPaneId });
}
