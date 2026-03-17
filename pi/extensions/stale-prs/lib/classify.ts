import type { PrData, StalePr, StalePrConfig } from "./types.ts";

function hoursSince(isoDate: string): number {
	return (Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60);
}

function latestActivityDate(pr: PrData): string {
	let latest = pr.createdAt;
	for (const review of pr.latestReviews ?? []) {
		if (review.submittedAt && review.submittedAt > latest) latest = review.submittedAt;
	}
	// Intentionally ignoring updatedAt — GitHub bumps it for CI reruns,
	// label changes, bot activity, etc. Only human review activity counts.
	return latest;
}

function isExcluded(pr: PrData): boolean {
	if (pr.isDraft) return true;
	if (pr.reviewDecision === "APPROVED") return true;
	if (pr.autoMergeRequest) return true;
	return false;
}

export function classifyReviewOwed(
	prs: PrData[],
	myLogin: string,
	config: StalePrConfig,
): StalePr[] {
	const stale: StalePr[] = [];
	for (const pr of prs) {
		if (isExcluded(pr)) continue;

		// Skip if I've already reviewed and am not still requested
		const myReview = pr.latestReviews?.find(r => r.author?.login === myLogin);
		const stillRequested = pr.reviewRequests?.some(r =>
			(r.__typename === "User" && r.login === myLogin) || r.__typename === "Team"
		);
		if (myReview && !stillRequested) continue;

		const age = hoursSince(latestActivityDate(pr));
		if (age < config.reviewOwedHours) continue;

		stale.push({
			number: pr.number,
			title: pr.title,
			url: pr.url,
			repo: "",
			author: pr.author?.login ?? "unknown",
			staleDays: Math.round(age / 24 * 10) / 10,
			kind: "review-owed",
		});
	}
	return stale;
}

export function classifyOwnStale(
	prs: PrData[],
	config: StalePrConfig,
): StalePr[] {
	const stale: StalePr[] = [];
	for (const pr of prs) {
		if (isExcluded(pr)) continue;

		const age = hoursSince(latestActivityDate(pr));
		if (age < config.ownPrStaleHours) continue;

		const requestedLogins = (pr.reviewRequests ?? [])
			.filter(r => r.__typename === "User" && r.login)
			.map(r => r.login!);

		stale.push({
			number: pr.number,
			title: pr.title,
			url: pr.url,
			repo: "",
			author: "",
			staleDays: Math.round(age / 24 * 10) / 10,
			kind: "own-stale",
			reviewers: requestedLogins,
		});
	}
	return stale;
}
