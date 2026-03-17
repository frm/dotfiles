import { notificationsState } from "../../lib/notifications/index.ts";
import { countPendingSuggestions } from "./suggestions.ts";
import type { Config } from "./types.ts";

function notificationFingerprint(scope: string): string {
	return `friction-${scope}`;
}

export async function syncNotification(config: Config, scope: string): Promise<void> {
	const { count, artifacts } = countPendingSuggestions(config, scope);
	const fp = notificationFingerprint(scope);

	if (count > 0) {
		const label = scope === "user" ? "user config" : "project config";
		const artifactList = artifacts.slice(0, 3).map(a => a.split("/").pop()).join(", ");
		await notificationsState.publish({
			source: "self-improvement",
			fingerprint: fp,
			title: `${count} improvement suggestion${count > 1 ? "s" : ""} for ${label}`,
			summary: `Patterns detected in: ${artifactList}`,
			priority: "suggestion",
			suggestedAction: {
				label: "Review suggestions",
				handler: "self-improvement:review",
				params: { scope },
			},
		});
	} else {
		await notificationsState.dismissByFingerprint("self-improvement", fp);
	}
}
