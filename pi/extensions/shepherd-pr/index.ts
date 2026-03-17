/**
 * Shepherd PR Extension
 *
 * Single-file architecture with three layers:
 * 1) Widget: compact one-line status above editor
 * 2) Monitor: watches ghState changes and queues actionable work
 * 3) Executor: runs codex subprocesses, then commits/pushes fixes
 */

import { spawn } from "node:child_process";

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Key, matchesKey, truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";

import { ghState, type PrInfo } from "../lib/gh/index.ts";

import type {
	WidgetMode,
	WorkItem,
	AmbiguousReview,
	ShepherdStats,
	CodexRunResult,
} from "./lib/types.ts";
import { summarizeChecks, extractFailingTestFiles, isLikelyFlakyFailure } from "./lib/checks.ts";
import type { StatusCheckLike } from "./lib/checks.ts";
import { getNewReviewComments, classifyReviewComment, pendingReviewCount } from "./lib/reviews.ts";
import type { ReviewCommentLike } from "./lib/reviews.ts";
import {
	findFailedRun,
	getFailedRunLogs,
	getPrChangedFiles,
	rerunFailedJobs,
	readContextLines,
	postReply,
	isWorktreeClean,
	execStdout,
	runExec,
} from "./lib/gh-helpers.ts";

export { summarizeChecks, extractFailingTestFiles, isLikelyFlakyFailure, getNewReviewComments };
export type { StatusCheckLike, ReviewCommentLike };

type Theme = ExtensionContext["ui"]["theme"];

const WIDGET_ID = "shepherd-pr";
const REVIEW_OVERLAY_WIDTH = 95;

// ---- Internal extension state ----

const FIX_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export default function shepherdPr(pi: ExtensionAPI) {
	let enabled = false;
	let latestCtx: ExtensionContext | null = null;
	let latestPr: PrInfo | null = null;

	let widgetMode: WidgetMode = "off";
	let widgetFixLabel = "";
	let widgetFixProgress = "";
	let dismissMergedTimer: ReturnType<typeof setTimeout> | null = null;

	let unsubscribePr: (() => void) | null = null;
	let monitorLoopRunning = false;
	let monitorLoopRequested = false;
	let executorRunning = false;

	const queue: WorkItem[] = [];
	const queuedIds = new Set<string>();
	const handledCheckNames = new Set<string>();
	const seenReviewCommentIds = new Set<number>();
	const handledReviewCommentIds = new Set<number>();
	const ambiguousReviews: AmbiguousReview[] = [];

	let conflictQueued = false;

	const stats: ShepherdStats = {
		fixed: 0,
		rerun: 0,
		skipped: 0,
		failed: 0,
	};

	const failureLog: Array<{ label: string; reason: string; item: WorkItem }> = [];

	pi.on("session_start", (_event, ctx) => {
		latestCtx = ctx;
		void reconnectMonitor(ctx);
	});
	pi.on("session_switch", (_event, ctx) => {
		latestCtx = ctx;
		void reconnectMonitor(ctx);
	});
	pi.on("session_shutdown", () => {
		stopMonitor();
		latestCtx = null;
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
				if (failureLog.length === 0) {
					ctx.ui.notify("Nothing to retry", "info");
					return;
				}
				const items = failureLog.splice(0);
				stats.failed -= items.length;
				for (const f of items) {
					// Clear from handled sets so they can be re-processed
					if (f.item.kind === "ci_failure" && f.item.checkName) {
						handledCheckNames.delete(f.item.checkName);
					}
					if (f.item.kind === "review_actionable" && f.item.comment) {
						seenReviewCommentIds.delete(f.item.comment.id);
						handledReviewCommentIds.delete(f.item.comment.id);
					}
					if (f.item.kind === "merge_conflict") {
						conflictQueued = false;
					}
					queuedIds.delete(f.item.id);
				}
				ctx.ui.notify(`Cleared ${items.length} failed item(s) — will re-process on next poll`, "info");
				// Trigger immediate re-evaluation
				requestMonitorLoop();
				return;
			}

			enabled = !enabled;
			if (enabled) {
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
		if (!latestPr || latestPr.mergedAt) return;

		const autoMerge = await execStdout(ctx.cwd, "gh", [
			"pr", "view", String(latestPr.number), "--json", "autoMergeRequest", "-q", ".autoMergeRequest",
		]);
		if (autoMerge.trim()) return; // already enabled

		const answer = await ctx.ui.select("Auto-merge is not enabled. Turn it on?", ["Yes", "No"]);
		if (!answer || answer === "No") return;

		// Bare merge — works with merge queues (no strategy needed)
		const bare = await runExec(ctx.cwd, "gh", ["pr", "merge", String(latestPr.number), "--auto"], 30000);
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

		const result = await runExec(ctx.cwd, "gh", ["pr", "merge", String(latestPr.number), "--auto", strategyFlag], 30000);
		if (result.code === 0) {
			ctx.ui.notify("Auto-merge enabled", "success");
		} else {
			ctx.ui.notify(`Failed to enable auto-merge: ${result.stderr.trim()}`, "error");
		}
	}

	async function reconnectMonitor(ctx: ExtensionContext) {
		if (!enabled) {
			renderWidget();
			return;
		}

		stopMonitor();
		await ghState.start(pi, ctx.cwd);
		unsubscribePr = ghState.subscribe((pr) => {
			latestPr = pr;
			requestMonitorLoop();
		});
		latestPr = ghState.get();
		renderWidget();
		requestMonitorLoop();
	}

	function stopMonitor() {
		if (unsubscribePr) {
			unsubscribePr();
			unsubscribePr = null;
		}
		// Don't call ghState.stop() — it's shared with panels.
		// Just unsubscribe and let the lifecycle owner (dashboard) manage start/stop.
		executorRunning = false;
		if (dismissMergedTimer) {
			clearTimeout(dismissMergedTimer);
			dismissMergedTimer = null;
		}
	}

	function showStatus(ctx: ExtensionContext) {
		const pendingAmbiguous = ambiguousReviews.filter((a) => !a.handled).length;
		const pendingQueue = queue.length + (executorRunning ? 1 : 0);
		const lines = [
			`mode: ${enabled ? widgetMode : "off"}`,
			`fixed: ${stats.fixed}`,
			`rerun: ${stats.rerun}`,
			`failed: ${stats.failed}`,
			`skipped: ${stats.skipped}`,
			`queued: ${pendingQueue}`,
			`needs-review: ${pendingAmbiguous}`,
		];
		if (failureLog.length > 0) {
			lines.push("", "failures:");
			for (const f of failureLog) {
				lines.push(`  ${f.label}: ${f.reason}`);
			}
			lines.push("", "use /shepherd retry to re-attempt failed items");
		}
		ctx.ui.notify(lines.join("\n"), "info");
	}

	function requestMonitorLoop() {
		monitorLoopRequested = true;
		if (monitorLoopRunning) return;
		void runMonitorLoop();
	}

	async function runMonitorLoop() {
		monitorLoopRunning = true;
		try {
			while (monitorLoopRequested) {
				monitorLoopRequested = false;
				await monitorOnce();
			}
		} finally {
			monitorLoopRunning = false;
		}
	}

	async function monitorOnce() {
		if (!enabled) {
			widgetMode = "off";
			renderWidget();
			return;
		}

		if (!latestPr) {
			widgetMode = "watching";
			renderWidget();
			return;
		}

		if (latestPr.mergedAt) {
			widgetMode = "merged";
			renderWidget();
			stopAfterMerged();
			return;
		}

		const checks = summarizeChecks(latestPr.statusCheckRollup as StatusCheckLike[]);
		const failedChecks = (latestPr.statusCheckRollup ?? []).filter((c) =>
			c.conclusion === "FAILURE" || c.conclusion === "CANCELLED"
		);

		for (const check of failedChecks) {
			if (handledCheckNames.has(check.name)) continue;
			enqueue({
				id: `ci:${check.name}`,
				kind: "ci_failure",
				label: `CI: ${check.name}`,
				checkName: check.name,
				queuedAt: new Date().toISOString(),
			});
		}

		if (latestPr.mergeable === "CONFLICTING") {
			if (!conflictQueued) {
				conflictQueued = true;
				enqueue({
					id: `conflict:${latestPr.number}`,
					kind: "merge_conflict",
					label: "merge conflict",
					queuedAt: new Date().toISOString(),
				});
			}
		} else {
			conflictQueued = false;
		}

		await inspectNewReviewComments();

		if (!executorRunning) {
			const pendingAmbiguous = ambiguousReviews.filter((a) => !a.handled).length;
			widgetMode = pendingAmbiguous > 0 ? "needs-review" : "watching";
			if (widgetMode === "watching") {
				const reviewCount = pendingAmbiguous > 0 ? pendingAmbiguous : pendingReviewCount(latestPr);
				widgetFixProgress = `✓ ${checks.passed} · ✗ ${checks.failed} · ⟡  ${reviewCount}`;
			}
		}
		renderWidget();

		await maybeRunQueue();
	}

	async function inspectNewReviewComments() {
		if (!latestPr || !latestCtx) return;

		const comments = (await ghState.fetchReviewComments()) as ReviewCommentLike[];
		const fresh = getNewReviewComments(comments, seenReviewCommentIds);
		if (fresh.length === 0) return;

		for (const comment of fresh) {
			const classification = await classifyReviewComment(comment, {
				cwd: latestCtx.cwd,
			});

			if (classification.classification === "actionable") {
				enqueue({
					id: `comment:${comment.id}`,
					kind: "review_actionable",
					label: `${comment.path}:${comment.line ?? comment.original_line ?? "?"}`,
					comment,
					queuedAt: new Date().toISOString(),
				});
			} else {
				ambiguousReviews.push({ comment, reason: classification.reason, handled: false });
			}
		}
	}

	function enqueue(item: WorkItem) {
		if (queuedIds.has(item.id)) return;
		queuedIds.add(item.id);
		queue.push(item);
	}

	async function maybeRunQueue() {
		if (!enabled || executorRunning || queue.length === 0 || !latestCtx || !latestPr) return;

		const item = queue.shift()!;
		executorRunning = true;
		widgetMode = "fixing";
		widgetFixLabel = item.label;
		widgetFixProgress = "";
		renderWidget();

		try {
			const clean = await isWorktreeClean(latestCtx.cwd);
			if (!clean) {
				stats.skipped++;
				widgetMode = "needs-review";
				latestCtx.ui.notify("Shepherd skipped auto-fix because git worktree is not clean", "warning");
				return;
			}

			let ok = false;
			if (item.kind === "ci_failure") ok = await executeCiItem(item, latestCtx, latestPr);
			if (item.kind === "review_actionable") ok = await executeReviewItem(item, latestCtx, latestPr);
			if (item.kind === "merge_conflict") ok = await executeConflictItem(item, latestCtx, latestPr);

			if (ok) {
				stats.fixed++;
			} else {
				stats.failed++;
				failureLog.push({ label: item.label, reason: "codex fix or commit/push failed", item });
			}
		} catch (err: any) {
			stats.failed++;
			const reason = err?.message ?? String(err);
			failureLog.push({ label: item.label, reason, item });
			latestCtx.ui.notify(`Shepherd error: ${reason}`, "error");
		} finally {
			executorRunning = false;
			queuedIds.delete(item.id);
			widgetFixLabel = "";
			widgetFixProgress = "";
			requestMonitorLoop();
		}
	}

	async function executeCiItem(item: WorkItem, ctx: ExtensionContext, pr: PrInfo): Promise<boolean> {
		if (!item.checkName) return false;
		handledCheckNames.add(item.checkName);

		const runInfo = await findFailedRun(ctx.cwd, pr.headRefName, item.checkName);
		const changedFiles = await getPrChangedFiles(ctx.cwd, pr.number, pr.baseRefName);
		const failedLogs = runInfo?.id ? await getFailedRunLogs(ctx.cwd, runInfo.id) : "";
		const failingFiles = extractFailingTestFiles(failedLogs);

		if (runInfo?.id && isLikelyFlakyFailure(failingFiles, changedFiles)) {
			const rerunOk = await rerunFailedJobs(ctx.cwd, runInfo.id);
			if (rerunOk) {
				stats.rerun++;
				widgetFixProgress = "reran failed jobs";
				renderWidget();
				return true;
			}
		}

		const prompt = [
			"You are fixing a PR CI failure in-place for the current repository.",
			"Goal: make CI pass with minimal, safe edits.",
			"",
			`Check: ${item.checkName}`,
			`PR #${pr.number}: ${pr.title}`,
			"",
			"Changed files in this PR:",
			changedFiles.length > 0 ? changedFiles.map((f) => `- ${f}`).join("\n") : "(unknown)",
			"",
			"Failed log excerpt:",
			"```",
			failedLogs.slice(0, 12000) || "(no failed logs available)",
			"```",
			"",
			"Do the following:",
			"1) Identify root cause from the logs",
			"2) Apply minimal code fix",
			"3) Run focused verification commands to confirm the fix",
			"4) Stage ONLY the files you changed, commit with message: fix: address CI failure (${item.checkName})",
			"5) Run: git push origin HEAD — this is critical, the fix is not done until pushed",
		].join("\n");

		const run = await runCodex(
			prompt,
			ctx.cwd,
			(line) => {
				widgetFixProgress = truncatePlain(line, 42);
				renderWidget();
			},
		);
		if (run.exitCode !== 0) {
			ctx.ui.notify(`Claude failed for ${item.checkName}`, "error");
			return false;
		}

		await ensurePushed(ctx.cwd);

		if (runInfo?.id) {
			await rerunFailedJobs(ctx.cwd, runInfo.id);
		}
		return true;
	}

	async function executeReviewItem(item: WorkItem, ctx: ExtensionContext, pr: PrInfo): Promise<boolean> {
		if (!item.comment) return false;
		const comment = item.comment;

		const fileContext = await readContextLines(ctx.cwd, comment.path, comment.line ?? comment.original_line ?? 1, 30);
		const prompt = [
			"You are addressing a PR review comment for the current repository.",
			"Goal: address the reviewer's feedback with minimal correct edits.",
			"",
			`PR #${pr.number}: ${pr.title}`,
			`Reviewer: ${comment.user.login}`,
			`Location: ${comment.path}:${comment.line ?? comment.original_line ?? "?"}`,
			"",
			"Review comment:",
			"```",
			comment.body,
			"```",
			"",
			"Diff hunk for context:",
			"```diff",
			comment.diff_hunk || "",
			"```",
			"",
			"Local file context around the line:",
			"```",
			fileContext || "(no local file context found)",
			"```",
			"",
			"Do the following:",
			"1) Read the file and understand the reviewer's concern",
			"2) Implement the requested change — keep it narrowly scoped",
			"3) Run any relevant verification (lint, type-check, test) to confirm",
			"4) Stage ONLY the files you changed, commit with message: fix: address review feedback on " + comment.path,
			"5) Run: git push origin HEAD — this is critical, the fix is not done until pushed",
		].join("\n");

		const run = await runCodex(
			prompt,
			ctx.cwd,
			(line) => {
				widgetFixProgress = truncatePlain(line, 42);
				renderWidget();
			},
		);
		if (run.exitCode !== 0) {
			ctx.ui.notify(`Claude failed for review comment #${comment.id}`, "error");
			return false;
		}

		await ensurePushed(ctx.cwd);
		handledReviewCommentIds.add(comment.id);
		markAmbiguousHandled(comment.id);
		return true;
	}

	async function executeConflictItem(item: WorkItem, ctx: ExtensionContext, pr: PrInfo): Promise<boolean> {
		// Try a clean rebase first — avoids spawning Claude when conflicts resolve trivially
		widgetFixProgress = "fetching base…";
		renderWidget();
		await runExec(ctx.cwd, "git", ["fetch", "origin", pr.baseRefName], 30000);

		widgetFixProgress = "rebasing…";
		renderWidget();
		const rebase = await runExec(ctx.cwd, "git", ["rebase", `origin/${pr.baseRefName}`], 60000);

		if (rebase.code === 0) {
			widgetFixProgress = "pushing…";
			renderWidget();
			const push = await runExec(ctx.cwd, "git", ["push", "--force-with-lease", "origin", "HEAD"], 45000);
			if (push.code === 0) {
				stats.rerun++;
				return true;
			}
			ctx.ui.notify("Rebase succeeded but push failed", "error");
			return false;
		}

		// Rebase produced conflicts — let Claude resolve them in-place and continue the rebase
		const prompt = [
			"A git rebase is in progress and has hit conflicts.",
			"Use the solve-conflicts skill to resolve them. Auto-accept the plan — do not ask for approval.",
			"After resolving each step, run `git rebase --continue` and repeat until the rebase completes.",
			"Then force-push with: git push --force-with-lease origin HEAD",
			"",
			`PR #${pr.number}: ${pr.title}`,
			`Base: ${pr.baseRefName}`,
		].join("\n");

		const run = await runCodex(
			prompt,
			ctx.cwd,
			(line) => {
				widgetFixProgress = truncatePlain(line, 42);
				renderWidget();
			},
		);
		if (run.exitCode !== 0) {
			ctx.ui.notify(`Claude failed while resolving ${item.label}`, "error");
			return false;
		}

		return true;
	}

	async function runReviewTriage(ctx: ExtensionContext) {
		while (true) {
			const pending = ambiguousReviews.filter((a) => !a.handled);
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
				enqueue({
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
				if (!latestPr) {
					ctx.ui.notify("No active PR", "warning");
					continue;
				}
				const body = await ctx.ui.input("Reply body:", "");
				if (!body?.trim()) continue;
				const ok = await postReply(ctx.cwd, latestPr.number, current.comment.id, body.trim());
				if (ok) {
					current.handled = true;
					ctx.ui.notify(`Replied to comment #${current.comment.id}`, "success");
				} else {
					ctx.ui.notify(`Failed to reply to comment #${current.comment.id}`, "error");
				}
			}
		}

		requestMonitorLoop();
	}

	async function pickCommentFromOverlay(ctx: ExtensionContext, comments: AmbiguousReview[]): Promise<number | null> {
		return await ctx.ui.custom<number | null>(
			(tui, theme, _kb, done) => {
				let scrollOffset = 0;
				let selected = 0;
				let blockLineOffsets: number[] = [];

				function wrap(raw: string, width: number): string[] {
					if (width <= 0) return [raw];
					const out: string[] = [];
					for (const piece of raw.split("\n")) {
						if (piece.length <= width) {
							out.push(piece);
							continue;
						}
						let left = piece;
						while (left.length > width) {
							let split = left.lastIndexOf(" ", width);
							if (split <= 0) split = width;
							out.push(left.slice(0, split));
							left = left.slice(split).trimStart();
						}
						if (left) out.push(left);
					}
					return out.length > 0 ? out : [""];
				}

				function renderLines(innerWidth: number): string[] {
					const lines: string[] = [];
					blockLineOffsets = [];

					lines.push(theme.fg("accent", theme.bold("Ambiguous Review Comments")));
					lines.push(theme.fg("muted", "Enter: actions   j/k: scroll   n/p: select   q: close"));
					lines.push("");

					for (let i = 0; i < comments.length; i++) {
						const item = comments[i];
						const isSelected = i === selected;
						blockLineOffsets.push(lines.length);

						const marker = isSelected ? theme.fg("warning", "▶") : " ";
						const lineNo = item.comment.line ?? item.comment.original_line ?? "?";
						const header = `${marker} #${item.comment.id} ${item.comment.path}:${lineNo}  @${item.comment.user.login}`;
						lines.push(theme.fg(isSelected ? "warning" : "accent", header));
						lines.push(theme.fg("dim", "  reason: ") + theme.fg("muted", item.reason));
						lines.push(theme.fg("dim", "  comment:"));
						for (const line of wrap(item.comment.body.trim(), Math.max(20, innerWidth - 4))) {
							lines.push("    " + line);
						}
						if (item.comment.diff_hunk?.trim()) {
							lines.push(theme.fg("dim", "  diff hunk:"));
							for (const hunkLine of wrap(item.comment.diff_hunk.trim(), Math.max(20, innerWidth - 4)).slice(0, 10)) {
								lines.push(theme.fg("muted", "    " + hunkLine));
							}
						}
						lines.push("");
					}

					return lines;
				}

				return {
					render(width: number) {
						const maxHeight = Math.max(12, Math.floor((tui as any).height * 0.88));
						const boxWidth = Math.max(80, Math.floor((width * REVIEW_OVERLAY_WIDTH) / 100));
						const innerWidth = boxWidth - 4;
						const all = renderLines(innerWidth);
						const contentHeight = maxHeight - 2;
						const maxScroll = Math.max(0, all.length - contentHeight);
						scrollOffset = Math.min(scrollOffset, maxScroll);

						const out: string[] = [];
						const topTitle = ` shepherd review (${comments.length}) `;
						const topFill = "─".repeat(Math.max(0, innerWidth - visibleWidth(topTitle)));
						out.push(theme.fg("dim", "╭─") + theme.fg("accent", theme.bold(topTitle)) + theme.fg("dim", topFill + "─╮"));

						const window = all.slice(scrollOffset, scrollOffset + contentHeight);
						for (const line of window) {
							const truncated = truncateToWidth(line, innerWidth);
							const pad = " ".repeat(Math.max(0, innerWidth - visibleWidth(truncated)));
							out.push(theme.fg("dim", "│ ") + truncated + pad + theme.fg("dim", " │"));
						}
						for (let i = window.length; i < contentHeight; i++) {
							out.push(theme.fg("dim", "│ ") + " ".repeat(innerWidth) + theme.fg("dim", " │"));
						}

						const end = Math.min(scrollOffset + contentHeight, all.length);
						const pos = `${scrollOffset + 1}-${end}/${all.length}`;
						const footer = " q close  Enter actions  n/p select ";
						const fill = "─".repeat(Math.max(0, innerWidth - visibleWidth(footer) - visibleWidth(pos) - 1));
						out.push(theme.fg("dim", "╰─") + theme.fg("muted", footer) + theme.fg("dim", fill) + theme.fg("muted", ` ${pos} `) + theme.fg("dim", "─╯"));

						return out.map((line) => truncateToWidth(line, width));
					},
					handleInput(data: string) {
						const termHeight = (tui as any).height ?? 30;
						const contentHeight = Math.max(5, Math.floor(termHeight * 0.88) - 2);
						const allLineCount = renderLines(80).length;
						const maxScroll = Math.max(0, allLineCount - contentHeight);

						if (matchesKey(data, Key.escape) || data === "q") {
							done(null);
							return;
						}
						if (data === "j" || matchesKey(data, Key.down)) {
							scrollOffset = Math.min(maxScroll, scrollOffset + 1);
						} else if (data === "k" || matchesKey(data, Key.up)) {
							scrollOffset = Math.max(0, scrollOffset - 1);
						} else if (data === "n" || matchesKey(data, Key.tab)) {
							selected = (selected + 1) % comments.length;
						} else if (data === "p") {
							selected = (selected - 1 + comments.length) % comments.length;
						} else if (matchesKey(data, Key.enter)) {
							done(selected);
							return;
						}

						const selectedLine = blockLineOffsets[selected] ?? 0;
						if (selectedLine < scrollOffset + 2) scrollOffset = Math.max(0, selectedLine - 2);
						if (selectedLine > scrollOffset + contentHeight - 4) {
							scrollOffset = Math.min(maxScroll, selectedLine - Math.floor(contentHeight / 2));
						}
						tui.requestRender();
					},
					invalidate() {},
				};
			},
			{ overlay: true, overlayOptions: { width: `${REVIEW_OVERLAY_WIDTH}%`, minWidth: 90 } },
		);
	}

	function markAmbiguousHandled(commentId: number) {
		for (const item of ambiguousReviews) {
			if (item.comment.id === commentId) {
				item.handled = true;
			}
		}
	}

	function stopAfterMerged() {
		if (!latestCtx) return;
		if (dismissMergedTimer) clearTimeout(dismissMergedTimer);
		dismissMergedTimer = setTimeout(() => {
			enabled = false;
			stopMonitor();
			renderWidget();
			latestCtx?.ui.notify("PR merged. Shepherd auto-closed.", "success");
		}, 5000);
	}

	function renderWidget() {
		if (!latestCtx?.hasUI) return;

		latestCtx.ui.setWidget(
			WIDGET_ID,
			(_tui, theme) => ({
				render(width: number): string[] {
					const line = widgetLine(theme);
					return [truncateToWidth(line, width)];
				},
				invalidate() {},
			}),
			{ placement: "aboveEditor" },
		);
	}

	function widgetLine(theme: Theme): string {
		if (!enabled) {
			widgetMode = "off";
			return theme.fg("muted", "not shepherding");
		}
		if (widgetMode === "merged") {
			return theme.fg("success", "⟐  ✓ merged!");
		}
		if (widgetMode === "fixing") {
			const right = widgetFixProgress ? theme.fg("dim", ` · ${widgetFixProgress}`) : "";
			return theme.fg("accent", `⟐  fixing ${widgetFixLabel} …`) + right;
		}
		const pendingAmbiguous = ambiguousReviews.filter((a) => !a.handled).length;
		if (pendingAmbiguous > 0) {
			return theme.fg("warning", `⟐  ⚠ ${pendingAmbiguous} needs review`);
		}
		const checks = summarizeChecks((latestPr?.statusCheckRollup ?? []) as StatusCheckLike[]);
		const reviewCount = latestPr ? pendingReviewCount(latestPr) : 0;
		return theme.fg("accent", "⟐  watching") + theme.fg("dim", ` · ✓ ${checks.passed} · ✗ ${checks.failed} · ⟡  ${reviewCount}`);
	}
}

// ---- Private helpers (stay in index) ----

function truncatePlain(msg: string, max: number): string {
	return msg.length <= max ? msg : `${msg.slice(0, max - 1)}…`;
}

async function ensurePushed(cwd: string): Promise<void> {
	const unpushed = await execStdout(cwd, "git", ["log", "@{u}..HEAD", "--oneline"]);
	if (unpushed.trim()) {
		await runExec(cwd, "git", ["push", "origin", "HEAD"], 45000);
	}
}

async function runCodex(
	prompt: string,
	cwd: string,
	onProgress?: (line: string) => void,
): Promise<CodexRunResult> {
	return await new Promise((resolve, reject) => {
		const child = spawn("claude", [
			"-p",
			"--dangerously-skip-permissions",
			"--output-format", "stream-json",
			"--verbose",
			"--max-turns", "20",
			prompt,
		], {
			cwd,
			stdio: ["ignore", "pipe", "pipe"],
		});

		const timeout = setTimeout(() => {
			child.kill("SIGTERM");
			setTimeout(() => child.kill("SIGKILL"), 5000);
		}, FIX_TIMEOUT_MS);

		let stderr = "";
		let buffer = "";
		const messages: string[] = [];

		child.stdout.on("data", (data: Buffer) => {
			buffer += data.toString();
			const lines = buffer.split("\n");
			buffer = lines.pop() ?? "";

			for (const line of lines) {
				const trimmed = line.trim();
				if (!trimmed) continue;
				let event: Record<string, any>;
				try {
					event = JSON.parse(trimmed);
				} catch {
					continue;
				}

				if (event.type === "assistant" && event.message?.content) {
					for (const block of event.message.content) {
						if (block.type === "text" && block.text) {
							messages.push(block.text);
							onProgress?.(`💬 ${block.text.split("\n")[0]}`);
						}
						if (block.type === "tool_use") {
							const name = block.name ?? "tool";
							const input = block.input;
							if (name === "Bash" && input?.command) {
								onProgress?.(`▶ ${input.command.split("\n")[0]}`);
							} else if (name === "Edit" && input?.file_path) {
								onProgress?.(`✎ ${input.file_path}`);
							} else if (name === "Write" && input?.file_path) {
								onProgress?.(`✎ ${input.file_path}`);
							} else if (name === "Read" && input?.file_path) {
								onProgress?.(`📖 ${input.file_path}`);
							} else {
								onProgress?.(`🔧 ${name}`);
							}
						}
					}
				}

				if (event.type === "result") {
					const ok = event.subtype === "success" && !event.is_error;
					if (!ok) {
						onProgress?.(`✗ ${event.result ?? "failed"}`);
					}
				}
			}
		});

		child.stderr.on("data", (data: Buffer) => {
			stderr += data.toString();
		});

		child.on("error", (err) => {
			clearTimeout(timeout);
			reject(err);
		});
		child.on("close", (code) => {
			clearTimeout(timeout);
			resolve({
				exitCode: code ?? 1,
				stderr,
				messages,
			});
		});
	});
}
