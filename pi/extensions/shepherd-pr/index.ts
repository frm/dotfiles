/**
 * Shepherd PR Extension
 *
 * Three layers:
 * 1) Widget (lib/widget.ts): compact one-line status above editor
 * 2) Monitor (lib/monitor.ts): watches ghState changes and queues actionable work
 * 3) Executor (lib/executor.ts): runs pi subprocesses, then commits/pushes fixes
 *
 * This file wires them together: lifecycle events, commands, and the
 * monitor loop are initialized here with shared state and callbacks.
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";

import { ghState, type PrInfo } from "../lib/gh/index.ts";

import type { AmbiguousReview } from "./lib/types.ts";
import { renderWidget as renderWidgetImpl } from "./lib/widget.ts";
import { summarizeChecks, extractFailingTestFiles, isLikelyFlakyFailure } from "./lib/checks.ts";
import type { StatusCheckLike } from "./lib/checks.ts";
import { getNewReviewComments } from "./lib/reviews.ts";
import type { ReviewCommentLike } from "./lib/reviews.ts";
import { postReply, execStdout, runExec } from "./lib/exec.ts";
import { enqueue, createMonitorLoop } from "./lib/monitor.ts";
import type { MonitorState } from "./lib/monitor.ts";
import { pickCommentFromOverlay } from "./lib/review-overlay.ts";

export { summarizeChecks, extractFailingTestFiles, isLikelyFlakyFailure, getNewReviewComments };
export type { StatusCheckLike, ReviewCommentLike };

// ---- Internal extension state ----

export default function shepherdPr(pi: ExtensionAPI) {
	let latestCtx: ExtensionContext | null = null;
	let dismissMergedTimer: ReturnType<typeof setTimeout> | null = null;
	let unsubscribePr: (() => void) | null = null;
	let selfPollTimer: ReturnType<typeof setInterval> | null = null;

	const state: MonitorState = {
		enabled: false,
		pr: null,
		cwd: null,
		widgetMode: "off",
		widgetFixLabel: "",
		widgetFixProgress: "",
		executorRunning: false,
		queue: [],
		queuedIds: new Set(),
		handledCheckNames: new Set(),
		seenReviewCommentIds: new Set(),
		handledReviewCommentIds: new Set(),
		conflictQueued: false,
		ambiguousReviews: [],
		stats: { fixed: 0, rerun: 0, skipped: 0, failed: 0 },
		failureLog: [],
	};

	const loop = createMonitorLoop(state, {
		renderWidget: () => renderWidget(),
		stopAfterMerged: () => stopAfterMerged(),
		notify: (msg, type) => latestCtx?.ui.notify(msg, type),
		fetchReviewComments: () => fetchReviewCommentsForPr(),
	});

	pi.on("session_start", (_event, ctx) => {
		latestCtx = ctx;
		state.cwd = ctx.cwd;
		void reconnectMonitor(ctx);
	});
	pi.on("session_switch", (_event, ctx) => {
		latestCtx = ctx;
		state.cwd = ctx.cwd;
		void reconnectMonitor(ctx);
	});
	pi.on("session_shutdown", () => {
		stopMonitor();
		latestCtx = null;
		state.cwd = null;
	});

	pi.registerCommand("shepherd", {
		description: "Toggle PR shepherding, show status, or review ambiguous comments",
		getArgumentCompletions: (prefix: string) => {
			const options = ["status", "review", "retry"];
			const filtered = options.filter((o) => o.startsWith(prefix)).map((o) => ({ value: o, label: o }));
			return filtered.length > 0 ? filtered : null;
		},
		handler: async (args, ctx) => {
			latestCtx = ctx;
			state.cwd = ctx.cwd;
			const sub = (args ?? "").trim().toLowerCase();

			if (sub === "status") {
				showStatus(ctx);
				return;
			}
			if (sub === "review") {
				await runReviewTriage(ctx);
				return;
			}
			if (sub === "retry") {
				if (state.failureLog.length === 0) {
					ctx.ui.notify("Nothing to retry", "info");
					return;
				}
				const items = state.failureLog.splice(0);
				state.stats.failed -= items.length;
				for (const f of items) {
					// Clear from handled sets so they can be re-processed
					if (f.item.kind === "ci_failure" && f.item.checkName) {
						state.handledCheckNames.delete(f.item.checkName);
					}
					if (f.item.kind === "review_actionable" && f.item.comment) {
						state.seenReviewCommentIds.delete(f.item.comment.id);
						state.handledReviewCommentIds.delete(f.item.comment.id);
					}
					if (f.item.kind === "merge_conflict") {
						state.conflictQueued = false;
					}
					state.queuedIds.delete(f.item.id);
				}
				ctx.ui.notify(`Cleared ${items.length} failed item(s) — will re-process on next poll`, "info");
				loop.request();
				return;
			}

			state.enabled = !state.enabled;
			if (state.enabled) {
				await reconnectMonitor(ctx);
				await maybeEnableAutoMerge(ctx);
				ctx.ui.notify("Shepherd enabled", "success");
			} else {
				stopMonitor();
				renderWidget();
				ctx.ui.notify("Shepherd paused", "info");
			}
		},
	});

	async function maybeEnableAutoMerge(ctx: ExtensionContext) {
		if (!state.pr || state.pr.mergedAt) return;

		const autoMerge = await execStdout(ctx.cwd, "gh", [
			"pr", "view", String(state.pr.number), "--json", "autoMergeRequest", "-q", ".autoMergeRequest",
		]);
		if (autoMerge.trim()) return; // already enabled

		const answer = await ctx.ui.select("Auto-merge is not enabled. Turn it on?", ["Yes", "No"]);
		if (!answer || answer === "No") return;

		// Bare merge — works with merge queues (no strategy needed)
		const bare = await runExec(ctx.cwd, "gh", ["pr", "merge", String(state.pr.number), "--auto"], 30000);
		if (bare.code === 0) {
			ctx.ui.notify("Auto-merge enabled", "success");
			return;
		}

		// Fall back to explicit strategy for repos without merge queues
		const strategy = await ctx.ui.select("Pick merge strategy", ["Squash and merge", "Rebase and merge", "Merge commit", "Cancel"]);
		if (!strategy || strategy === "Cancel") return;

		const strategyFlag = strategy === "Squash and merge" ? "--squash"
			: strategy === "Rebase and merge" ? "--rebase"
			: "--merge";

		const result = await runExec(ctx.cwd, "gh", ["pr", "merge", String(state.pr.number), "--auto", strategyFlag], 30000);
		if (result.code === 0) {
			ctx.ui.notify("Auto-merge enabled", "success");
		} else {
			ctx.ui.notify(`Failed to enable auto-merge: ${result.stderr.trim()}`, "error");
		}
	}

	const SHEPHERD_PR_FIELDS = "number,title,body,state,baseRefName,headRefName,additions,deletions,statusCheckRollup,reviews,reviewDecision,mergeable,mergedAt,mergedBy,url,comments";
	const SELF_POLL_INTERVAL = 60_000;

	async function reconnectMonitor(ctx: ExtensionContext) {
		if (!state.enabled) {
			renderWidget();
			return;
		}

		stopMonitor();
		await ghState.start(pi, ctx.cwd);

		// Check if ghState is watching our branch. In worktrees, ghState's
		// singleton uses the tmux session root, which may be on a different
		// branch (often the default branch). If so, shepherd polls directly.
		const ghPr = ghState.get();
		const worktreeBranch = (await runExec(ctx.cwd, "git", ["rev-parse", "--abbrev-ref", "HEAD"], 5000)).stdout.trim();

		if (ghPr && ghPr.headRefName === worktreeBranch) {
			// ghState is watching our branch — use it
			unsubscribePr = ghState.subscribe((pr) => {
				state.pr = pr;
				loop.request();
			});
			state.pr = ghState.get();
		} else {
			// ghState is watching a different branch — self-poll
			await selfPollPr(ctx.cwd, worktreeBranch);
			selfPollTimer = setInterval(() => {
				void selfPollPr(ctx.cwd, worktreeBranch);
			}, SELF_POLL_INTERVAL);
		}

		renderWidget();
		loop.request();
	}

	async function selfPollPr(cwd: string, branch: string): Promise<void> {
		const raw = await execStdout(cwd, "gh", ["pr", "view", branch, "--json", SHEPHERD_PR_FIELDS]);
		if (!raw.trim()) {
			state.pr = null;
			return;
		}
		try {
			state.pr = JSON.parse(raw) as PrInfo;
			loop.request();
		} catch {
			state.pr = null;
		}
	}

	function stopMonitor() {
		if (unsubscribePr) {
			unsubscribePr();
			unsubscribePr = null;
		}
		if (selfPollTimer) {
			clearInterval(selfPollTimer);
			selfPollTimer = null;
		}
		// Don't call ghState.stop() — it's shared with panels.
		// Just unsubscribe and let the lifecycle owner (dashboard) manage start/stop.
		state.executorRunning = false;
		if (dismissMergedTimer) {
			clearTimeout(dismissMergedTimer);
			dismissMergedTimer = null;
		}
	}

	function showStatus(ctx: ExtensionContext) {
		const pendingAmbiguous = state.ambiguousReviews.filter((a) => !a.handled).length;
		const pendingQueue = state.queue.length + (state.executorRunning ? 1 : 0);
		const lines = [
			`mode: ${state.enabled ? state.widgetMode : "off"}`,
			`fixed: ${state.stats.fixed}`,
			`rerun: ${state.stats.rerun}`,
			`failed: ${state.stats.failed}`,
			`skipped: ${state.stats.skipped}`,
			`queued: ${pendingQueue}`,
			`needs-review: ${pendingAmbiguous}`,
		];
		if (state.failureLog.length > 0) {
			lines.push("", "failures:");
			for (const f of state.failureLog) {
				lines.push(`  ${f.label}: ${f.reason}`);
			}
			lines.push("", "use /shepherd retry to re-attempt failed items");
		}
		ctx.ui.notify(lines.join("\n"), "info");
	}

	async function fetchReviewCommentsForPr(): Promise<ReviewCommentLike[]> {
		if (!state.pr || !latestCtx) return [];

		// If we're self-polling (worktree mode), fetch directly instead of
		// going through ghState which may be watching a different branch.
		if (selfPollTimer) {
			const raw = await execStdout(latestCtx.cwd, "gh", [
				"api", `/repos/{owner}/{repo}/pulls/${state.pr.number}/comments`, "--paginate",
			]);
			if (!raw.trim()) return [];
			try {
				return JSON.parse(raw) as ReviewCommentLike[];
			} catch {
				return [];
			}
		}

		return (await ghState.fetchReviewComments()) as ReviewCommentLike[];
	}

	async function runReviewTriage(ctx: ExtensionContext) {
		while (true) {
			const pending = state.ambiguousReviews.filter((a) => !a.handled);
			if (pending.length === 0) {
				ctx.ui.notify("No ambiguous review comments", "info");
				break;
			}

			const selected = await pickCommentFromOverlay(ctx, pending);
			if (selected === null) break;

			const current = pending[selected];
			if (!current) break;

			const action = await ctx.ui.select("Review comment action:", ["Fix", "Skip", "Reply", "Back"]);
			if (!action || action === "Back") continue;

			if (action === "Fix") {
				enqueue(state, {
					id: `comment:${current.comment.id}`,
					kind: "review_actionable",
					label: `${current.comment.path}:${current.comment.line ?? current.comment.original_line ?? "?"}`,
					comment: current.comment,
					queuedAt: new Date().toISOString(),
				});
				current.handled = true;
				ctx.ui.notify(`Queued fix for comment #${current.comment.id}`, "info");
			}

			if (action === "Skip") {
				current.handled = true;
				ctx.ui.notify(`Skipped comment #${current.comment.id}`, "info");
			}

			if (action === "Reply") {
				if (!state.pr) {
					ctx.ui.notify("No active PR", "warning");
					continue;
				}
				const body = await ctx.ui.input("Reply body:", "");
				if (!body?.trim()) continue;
				const ok = await postReply(ctx.cwd, state.pr.number, current.comment.id, body.trim());
				if (ok) {
					current.handled = true;
					ctx.ui.notify(`Replied to comment #${current.comment.id}`, "success");
				} else {
					ctx.ui.notify(`Failed to reply to comment #${current.comment.id}`, "error");
				}
			}
		}

		loop.request();
	}

	function stopAfterMerged() {
		if (!latestCtx) return;
		if (dismissMergedTimer) clearTimeout(dismissMergedTimer);
		dismissMergedTimer = setTimeout(() => {
			state.enabled = false;
			stopMonitor();
			renderWidget();
			latestCtx?.ui.notify("PR merged. Shepherd auto-closed.", "success");
		}, 5000);
	}

	function renderWidget() {
		if (!latestCtx) return;
		renderWidgetImpl(latestCtx, {
			enabled: state.enabled,
			widgetMode: state.widgetMode,
			latestPr: state.pr,
			widgetFixLabel: state.widgetFixLabel,
			widgetFixProgress: state.widgetFixProgress,
			ambiguousReviewCount: state.ambiguousReviews.filter((a) => !a.handled).length,
		});
	}
}
