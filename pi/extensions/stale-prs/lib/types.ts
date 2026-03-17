export interface StalePrConfig {
	enabled: boolean;
	reviewOwedHours: number;
	ownPrStaleHours: number;
	pollIntervalMinutes: number;
	snoozeDurationHours: number;
}

export interface PrData {
	number: number;
	title: string;
	headRefName: string;
	url: string;
	createdAt: string;
	updatedAt: string;
	isDraft: boolean;
	reviewDecision: string | null;
	latestReviews: { author: { login: string }; state: string; submittedAt: string }[];
	reviewRequests: { login?: string; __typename: string }[];
	autoMergeRequest: unknown;
	mergeable: string;
	author: { login: string };
}

export interface StalePr {
	number: number;
	title: string;
	url: string;
	repo: string;
	author: string;
	staleDays: number;
	kind: "review-owed" | "own-stale";
	reviewers?: string[];
}
