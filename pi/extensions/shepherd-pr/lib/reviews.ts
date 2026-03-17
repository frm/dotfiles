import { spawn } from "node:child_process";

import type { PrInfo } from "../../lib/gh/index.ts";

import type { ReviewCommentLike, RunContext } from "./types.ts";
import { tryParseJsonObject } from "./gh-helpers.ts";

export type { ReviewCommentLike };

export function getNewReviewComments(comments: ReviewCommentLike[], seen: Set<number>): ReviewCommentLike[] {
	const fresh: ReviewCommentLike[] = [];
	for (const comment of comments) {
		if (!Number.isFinite(comment.id)) continue;
		if (seen.has(comment.id)) continue;
		seen.add(comment.id);
		fresh.push(comment);
	}
	return fresh;
}

export function pendingReviewCount(pr: PrInfo): number {
	const latestByAuthor = new Map<string, string>();
	for (const review of pr.reviews ?? []) latestByAuthor.set(review.author.login, review.state);
	let pending = 0;
	for (const state of latestByAuthor.values()) {
		if (state === "COMMENTED" || state === "CHANGES_REQUESTED") pending++;
	}
	if (pending === 0 && pr.reviewDecision === "REVIEW_REQUIRED") return 1;
	return pending;
}

export async function classifyReviewComment(
	comment: ReviewCommentLike,
	runCtx: RunContext,
): Promise<{ classification: "actionable" | "ambiguous"; reason: string }> {
	const prompt = [
		'Classify this PR review comment. Return ONLY a JSON object: {"classification":"ACTIONABLE"|"AMBIGUOUS","reason":"short reason"}',
		"ACTIONABLE = clear concrete code change (fix bug, rename, add check, style fix).",
		"AMBIGUOUS = question, opinion, architectural concern, praise, or vague suggestion.",
		"",
		`${comment.path}:${comment.line ?? comment.original_line ?? "?"} — ${comment.body}`,
	].join("\n");

	const result = await new Promise<string>((resolve) => {
		const child = spawn("claude", [
			"-p",
			"--dangerously-skip-permissions",
			"--output-format", "json",
			"--max-turns", "1",
			"--tools", "",
			prompt,
		], {
			cwd: runCtx.cwd,
			stdio: ["ignore", "pipe", "pipe"],
		});

		const timeout = setTimeout(() => child.kill("SIGTERM"), 30000);
		let stdout = "";
		child.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
		child.on("close", () => { clearTimeout(timeout); resolve(stdout); });
		child.on("error", () => { clearTimeout(timeout); resolve(""); });
	});

	if (!result.trim()) {
		return { classification: "ambiguous", reason: "classifier failed" };
	}

	// Claude --output-format json wraps response in {"result": "..."}
	let text = result;
	try {
		const wrapper = JSON.parse(result);
		if (wrapper.result) text = wrapper.result;
	} catch {}

	const parsed = tryParseJsonObject(text);
	const cls = String(parsed?.classification ?? "").toUpperCase();
	if (cls === "ACTIONABLE") {
		return { classification: "actionable", reason: String(parsed?.reason ?? "clear requested change") };
	}
	if (cls === "AMBIGUOUS") {
		return { classification: "ambiguous", reason: String(parsed?.reason ?? "needs human review") };
	}

	// Fallback heuristic if classification parsing fails
	const heuristic = /\?$/.test(comment.body.trim()) || /\b(opinion|prefer|maybe|consider)\b/i.test(comment.body);
	return heuristic
		? { classification: "ambiguous", reason: "open-ended feedback" }
		: { classification: "actionable", reason: "appears concrete" };
}
