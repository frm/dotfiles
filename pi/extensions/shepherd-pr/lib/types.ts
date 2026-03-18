// Shared types for the shepherd-pr extension

export type WidgetMode = "off" | "watching" | "fixing" | "needs-review" | "merged";
export type WorkItemKind = "ci_failure" | "review_actionable" | "merge_conflict";

export interface StatusCheckLike {
	name: string;
	status: string;
	conclusion: string;
}

export interface ReviewCommentLike {
	id: number;
	user: { login: string };
	body: string;
	path: string;
	line: number | null;
	original_line: number | null;
	created_at: string;
	diff_hunk: string;
}

export interface WorkItem {
	id: string;
	kind: WorkItemKind;
	label: string;
	checkName?: string;
	runId?: number;
	comment?: ReviewCommentLike;
	queuedAt: string;
}

export interface AmbiguousReview {
	comment: ReviewCommentLike;
	reason: string;
	handled: boolean;
}

export interface RunContext {
	cwd: string;
}

export interface ShepherdStats {
	fixed: number;
	rerun: number;
	skipped: number;
	failed: number;
}
