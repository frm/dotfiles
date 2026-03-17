import { notificationsState } from "../../lib/notifications/index.ts";
import type { StalePr, StalePrConfig } from "./types.ts";

function formatDays(days: number): string {
	if (days < 1) return `${Math.round(days * 24)}h`;
	const rounded = Math.round(days);
	return `${rounded} day${rounded !== 1 ? "s" : ""}`;
}

export async function syncNotifications(
	stalePrs: StalePr[],
	config: StalePrConfig,
	previousFingerprints: Set<string>,
): Promise<Set<string>> {
	const snoozeDuration = config.snoozeDurationHours * 60 * 60 * 1000;
	const currentFingerprints = new Set<string>();

	for (const pr of stalePrs) {
		const fp = pr.kind === "review-owed"
			? `review-owed-${pr.number}`
			: `own-stale-${pr.number}`;
		currentFingerprints.add(fp);

		if (pr.kind === "review-owed") {
			const result = await notificationsState.publish({
				source: "stale-prs",
				fingerprint: fp,
				title: `PR #${pr.number} by ${pr.author} needs your review (open ${formatDays(pr.staleDays)})`,
				summary: pr.title,
				priority: "suggestion",
				snoozeDuration,
				suggestedAction: {
					label: "Review PR",
					handler: "stale-prs:review",
					params: { prNumber: pr.number },
				},
			});
		} else {
			const summaryParts = [`PR: ${pr.title}`];
			if (pr.reviewers?.length) {
				summaryParts.push(`Reviewers: ${pr.reviewers.join(", ")}`);
			}
			await notificationsState.publish({
				source: "stale-prs",
				fingerprint: fp,
				title: `Your PR #${pr.number} has been waiting ${formatDays(pr.staleDays)} for review`,
				summary: summaryParts.join("\n"),
				priority: "suggestion",
				snoozeDuration,
				suggestedAction: {
					label: "Ping reviewers",
					handler: "stale-prs:ping-reviewers",
					params: { prNumber: pr.number, repo: pr.repo, reviewers: pr.reviewers ?? [] },
				},
			});
		}
	}

	// Dismiss notifications for PRs that are no longer stale
	for (const fp of previousFingerprints) {
		if (!currentFingerprints.has(fp)) {
			await notificationsState.dismissByFingerprint("stale-prs", fp);
		}
	}

	return currentFingerprints;
}
