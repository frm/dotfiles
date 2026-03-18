/**
 * Monitor logic: given PR state, determine what work items to queue,
 * run them through the executor, and update state accordingly.
 *
 * Pure in the sense that it doesn't close over extension state — all
 * data flows through MonitorState (read/write) and MonitorCallbacks
 * (side effects like rendering and notifications).
 */

import type { PrInfo } from "../../lib/gh/index.ts";

import type {
	WidgetMode,
	WorkItem,
	AmbiguousReview,
	ShepherdStats,
} from "./types.ts";
import type { StatusCheckLike } from "./checks.ts";
import type { ReviewCommentLike } from "./reviews.ts";
import type { ExecutorContext } from "./executor.ts";
import { summarizeChecks, FAILURE_CONCLUSIONS } from "./checks.ts";
import { getNewReviewComments, pendingReviewCount, classifyReviewComment } from "./reviews.ts";
import { executeCiItem, executeReviewItem, executeConflictItem } from "./executor.ts";
import { isWorktreeClean } from "./git.ts";

// ---- Interfaces ----

export interface MonitorState {
	enabled: boolean;
	pr: PrInfo | null;
	cwd: string | null;

	widgetMode: WidgetMode;
	widgetFixLabel: string;
	widgetFixProgress: string;

	executorRunning: boolean;

	queue: WorkItem[];
	queuedIds: Set<string>;
	handledCheckNames: Set<string>;
	seenReviewCommentIds: Set<number>;
	handledReviewCommentIds: Set<number>;
	conflictQueued: boolean;

	ambiguousReviews: AmbiguousReview[];
	stats: ShepherdStats;
	failureLog: Array<{ label: string; reason: string; item: WorkItem }>;
}

export interface MonitorCallbacks {
	renderWidget(): void;
	stopAfterMerged(): void;
	notify(msg: string, type: "info" | "error" | "warning"): void;
	fetchReviewComments(): Promise<ReviewCommentLike[]>;
	requestLoop(): void;
}

// ---- Public API ----

export function enqueue(state: MonitorState, item: WorkItem): void {
	if (state.queuedIds.has(item.id)) return;
	state.queuedIds.add(item.id);
	state.queue.push(item);
}

export async function monitorOnce(state: MonitorState, cb: MonitorCallbacks): Promise<void> {
	if (!state.enabled) {
		state.widgetMode = "off";
		cb.renderWidget();
		return;
	}

	if (!state.pr) {
		state.widgetMode = "watching";
		cb.renderWidget();
		return;
	}

	if (state.pr.mergedAt) {
		state.widgetMode = "merged";
		cb.renderWidget();
		cb.stopAfterMerged();
		return;
	}

	const checks = summarizeChecks(state.pr.statusCheckRollup as StatusCheckLike[]);
	const failedChecks = (state.pr.statusCheckRollup ?? []).filter((c: any) =>
		FAILURE_CONCLUSIONS.has(c.conclusion)
	);

	for (const check of failedChecks) {
		if (state.handledCheckNames.has(check.name)) continue;
		enqueue(state, {
			id: `ci:${check.name}`,
			kind: "ci_failure",
			label: `CI: ${check.name}`,
			checkName: check.name,
			queuedAt: new Date().toISOString(),
		});
	}

	if (state.pr.mergeable === "CONFLICTING") {
		if (!state.conflictQueued) {
			state.conflictQueued = true;
			enqueue(state, {
				id: `conflict:${state.pr.number}`,
				kind: "merge_conflict",
				label: "merge conflict",
				queuedAt: new Date().toISOString(),
			});
		}
	} else {
		state.conflictQueued = false;
	}

	// Run queue processing and review inspection concurrently so that
	// CI fixes aren't blocked by serial review-comment classification.
	await Promise.all([
		maybeRunQueue(state, cb),
		inspectNewReviewComments(state, cb),
	]);

	if (!state.executorRunning) {
		const pendingAmbiguous = state.ambiguousReviews.filter((a) => !a.handled).length;
		state.widgetMode = pendingAmbiguous > 0 ? "needs-review" : "watching";
		if (state.widgetMode === "watching") {
			const reviewCount = pendingReviewCount(state.pr);
			state.widgetFixProgress = `✓ ${checks.passed} · ✗ ${checks.failed} · ⟡  ${reviewCount}`;
		}
	}
	cb.renderWidget();
}

export function createMonitorLoop(
	state: MonitorState,
	callbacks: Omit<MonitorCallbacks, "requestLoop">,
): { request(): void; isRunning(): boolean } {
	let running = false;
	let requested = false;

	function request() {
		requested = true;
		if (running) return;
		void run();
	}

	const cb: MonitorCallbacks = { ...callbacks, requestLoop: request };

	async function run() {
		running = true;
		try {
			while (requested) {
				requested = false;
				try {
					await monitorOnce(state, cb);
				} catch (err: any) {
					callbacks.notify(`Shepherd monitor error: ${err?.message ?? err}`, "error");
				}
			}
		} finally {
			running = false;
		}
	}

	return { request, isRunning: () => running };
}

// ---- Internal helpers ----

async function inspectNewReviewComments(state: MonitorState, cb: MonitorCallbacks): Promise<void> {
	if (!state.pr || !state.cwd) return;

	const comments = await cb.fetchReviewComments();
	const fresh = getNewReviewComments(comments, state.seenReviewCommentIds);
	if (fresh.length === 0) return;

	for (const comment of fresh) {
		const classification = await classifyReviewComment(comment, { cwd: state.cwd });

		if (classification.classification === "actionable") {
			enqueue(state, {
				id: `comment:${comment.id}`,
				kind: "review_actionable",
				label: `${comment.path}:${comment.line ?? comment.original_line ?? "?"}`,
				comment,
				queuedAt: new Date().toISOString(),
			});
		} else {
			state.ambiguousReviews.push({ comment, reason: classification.reason, handled: false });
		}
	}
}

async function maybeRunQueue(state: MonitorState, cb: MonitorCallbacks): Promise<void> {
	if (!state.enabled || state.executorRunning || state.queue.length === 0 || !state.cwd || !state.pr) return;

	const item = state.queue.shift()!;
	state.executorRunning = true;
	state.widgetMode = "fixing";
	state.widgetFixLabel = item.label;
	state.widgetFixProgress = "";
	cb.renderWidget();

	try {
		const clean = await isWorktreeClean(state.cwd);
		if (!clean) {
			state.stats.skipped++;
			state.widgetMode = "needs-review";
			cb.notify("Shepherd skipped auto-fix because git worktree is not clean", "warning");
			return;
		}

		const executorCtx: ExecutorContext = {
			cwd: state.cwd,
			pr: state.pr,
			notify: cb.notify,
			onProgress: (line) => {
				state.widgetFixProgress = truncatePlain(line, 42);
				cb.renderWidget();
			},
			stats: state.stats,
			onCheckHandled: (checkName) => state.handledCheckNames.add(checkName),
			onCommentHandled: (commentId) => {
				state.handledReviewCommentIds.add(commentId);
				markAmbiguousHandled(state, commentId);
			},
		};

		let ok = false;
		if (item.kind === "ci_failure") ok = await executeCiItem(item, executorCtx);
		if (item.kind === "review_actionable") ok = await executeReviewItem(item, executorCtx);
		if (item.kind === "merge_conflict") ok = await executeConflictItem(item, executorCtx);

		if (ok) {
			state.stats.fixed++;
		} else {
			state.stats.failed++;
			state.failureLog.push({ label: item.label, reason: "pi fix or commit/push failed", item });
		}
	} catch (err: any) {
		state.stats.failed++;
		const reason = err?.message ?? String(err);
		state.failureLog.push({ label: item.label, reason, item });
		cb.notify(`Shepherd error: ${reason}`, "error");
	} finally {
		state.executorRunning = false;
		state.queuedIds.delete(item.id);
		state.widgetFixLabel = "";
		state.widgetFixProgress = "";
		cb.requestLoop();
	}
}

function markAmbiguousHandled(state: MonitorState, commentId: number): void {
	for (const item of state.ambiguousReviews) {
		if (item.comment.id === commentId) {
			item.handled = true;
		}
	}
}

function truncatePlain(msg: string, max: number): string {
	return msg.length <= max ? msg : `${msg.slice(0, max - 1)}…`;
}
