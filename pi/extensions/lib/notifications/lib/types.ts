export type Priority = "info" | "suggestion" | "needs-decision" | "blocked";

export interface SuggestedAction {
	label: string;
	handler: string;           // namespaced: "source:action-name"
	params: Record<string, unknown>;
}

export interface Notification {
	id: string;
	title: string;
	summary?: string;
	source: string;
	fingerprint: string;
	priority: Priority;
	count: number;
	createdAt: number;
	updatedAt: number;
	expiresAt?: number;
	snoozeDuration?: number;   // ms — set by publisher
	snoozedUntil?: number;     // epoch ms — set when user snoozes
	suggestedAction?: SuggestedAction;
}

export interface PublishParams {
	title: string;
	summary?: string;
	source: string;
	fingerprint: string;
	priority: Priority;
	expiresAt?: number;
	snoozeDuration?: number;
	suggestedAction?: SuggestedAction;
}

export interface NotificationsService {
	publish(params?: Record<string, unknown>): Notification;
	list(params?: Record<string, unknown>): Notification[];
	dismiss(params?: Record<string, unknown>): boolean;
	dismissByFingerprint(params?: Record<string, unknown>): boolean;
	snooze(params?: Record<string, unknown>): boolean;
	executeAction(params?: Record<string, unknown>): Promise<{ ok: boolean; error?: string }>;
}
