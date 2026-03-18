import type { PrInfo } from "../../lib/gh/index.ts";
import type { WorkItem, ShepherdStats } from "./types.ts";
import { findFailedRun, getFailedRunLogs, getPrChangedFiles, rerunFailedJobs, readContextLines, runExec } from "./exec.ts";
import { ensurePushed } from "./git.ts";
import { buildCiFixPrompt, buildReviewFixPrompt, buildConflictFixPrompt } from "./prompts.ts";
import { runPi } from "./pi-runner.ts";
import { extractFailingTestFiles, isLikelyFlakyFailure } from "./checks.ts";

export interface ExecutorContext {
	cwd: string;
	pr: PrInfo;
	notify: (msg: string, type: "info" | "error" | "warning") => void;
	onProgress: (line: string) => void;
	stats: ShepherdStats;
	onCheckHandled?: (checkName: string) => void;
	onCommentHandled?: (commentId: number) => void;
}

export async function executeCiItem(item: WorkItem, ctx: ExecutorContext): Promise<boolean> {
	if (!item.checkName) return false;
	ctx.onCheckHandled?.(item.checkName);

	const runInfo = await findFailedRun(ctx.cwd, ctx.pr.headRefName, item.checkName);
	const changedFiles = await getPrChangedFiles(ctx.cwd, ctx.pr.number, ctx.pr.baseRefName);
	const failedLogs = runInfo?.id ? await getFailedRunLogs(ctx.cwd, runInfo.id) : "";
	const failingFiles = extractFailingTestFiles(failedLogs);

	if (runInfo?.id && isLikelyFlakyFailure(failingFiles, changedFiles)) {
		const rerunOk = await rerunFailedJobs(ctx.cwd, runInfo.id);
		if (rerunOk) {
			ctx.stats.rerun++;
			ctx.onProgress("reran failed jobs");
			return true;
		}
	}

	const run = await runPi(
		buildCiFixPrompt(item.checkName, ctx.pr.number, ctx.pr.title, changedFiles, failedLogs),
		ctx.cwd,
		ctx.onProgress,
	);
	if (run.exitCode !== 0) {
		ctx.notify(`Claude failed for ${item.checkName}`, "error");
		return false;
	}

	await ensurePushed(ctx.cwd, `fix: address CI failure (${item.checkName})`);

	if (runInfo?.id) {
		await rerunFailedJobs(ctx.cwd, runInfo.id);
	}
	return true;
}

export async function executeReviewItem(item: WorkItem, ctx: ExecutorContext): Promise<boolean> {
	if (!item.comment) return false;
	const comment = item.comment;

	const fileContext = await readContextLines(ctx.cwd, comment.path, comment.line ?? comment.original_line ?? 1, 30);

	const run = await runPi(
		buildReviewFixPrompt(ctx.pr.number, ctx.pr.title, comment, fileContext),
		ctx.cwd,
		ctx.onProgress,
	);
	if (run.exitCode !== 0) {
		ctx.notify(`Claude failed for review comment #${comment.id}`, "error");
		return false;
	}

	await ensurePushed(ctx.cwd, `fix: address review feedback on ${comment.path}`);
	ctx.onCommentHandled?.(comment.id);
	return true;
}

export async function executeConflictItem(item: WorkItem, ctx: ExecutorContext): Promise<boolean> {
	ctx.onProgress("fetching base…");
	await runExec(ctx.cwd, "git", ["fetch", "origin", ctx.pr.baseRefName], 30000);

	ctx.onProgress("rebasing…");
	const rebase = await runExec(ctx.cwd, "git", ["rebase", `origin/${ctx.pr.baseRefName}`], 60000);

	if (rebase.code === 0) {
		ctx.onProgress("pushing…");
		const push = await runExec(ctx.cwd, "git", ["push", "--force-with-lease", "origin", "HEAD"], 45000);
		if (push.code === 0) {
			ctx.stats.rerun++;
			return true;
		}
		ctx.notify("Rebase succeeded but push failed", "error");
		return false;
	}

	const run = await runPi(
		buildConflictFixPrompt(ctx.pr.number, ctx.pr.title, ctx.pr.baseRefName),
		ctx.cwd,
		ctx.onProgress,
	);
	if (run.exitCode !== 0) {
		ctx.notify(`Claude failed while resolving ${item.label}`, "error");
		return false;
	}

	return true;
}
