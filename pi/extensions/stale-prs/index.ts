/**
 * Stale PR Nudger
 *
 * Background extension that detects stale PRs on an hourly timer and publishes
 * notifications. Two categories:
 *   - Reviews you owe (haven't reviewed yet, PR open > 24h)
 *   - Your own PRs waiting on reviewers (open > 48h)
 *
 * Config namespace: "stale-prs" in .pi/config.json
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { execFileSync } from "node:child_process";
import { notificationsState } from "../lib/notifications/index.ts";
import type { ExtensionAPI as _EA } from "@mariozechner/pi-coding-agent";
import { loadConfig } from "./lib/config.ts";
import { getUsername, getRepoSlug, fetchReviewRequested, fetchMyPrs } from "./lib/fetch.ts";
import { classifyReviewOwed, classifyOwnStale } from "./lib/classify.ts";
import { syncNotifications } from "./lib/notifications.ts";

export default function (pi: ExtensionAPI) {
	let timer: ReturnType<typeof setInterval> | null = null;
	let currentCwd: string = process.cwd();
	let activeFingerprints = new Set<string>();

	async function check(): Promise<void> {
		const config = loadConfig();
		if (!config.enabled) return;

		const myLogin = await getUsername();
		if (!myLogin) return;

		const repo = await getRepoSlug(currentCwd);

		const [reviewPrs, myPrs] = await Promise.all([
			fetchReviewRequested(currentCwd),
			fetchMyPrs(currentCwd),
		]);

		const reviewOwed = classifyReviewOwed(reviewPrs, myLogin, config);
		const ownStale = classifyOwnStale(myPrs, config);

		// Fill in repo slug
		for (const pr of [...reviewOwed, ...ownStale]) {
			pr.repo = repo ?? "";
		}

		activeFingerprints = await syncNotifications(
			[...reviewOwed, ...ownStale],
			config,
			activeFingerprints,
		);
	}

	// ── Lifecycle ───────────────────────────────────────────────────────

	pi.on("session_start", async (_event, ctx) => {
		currentCwd = ctx.cwd;
		const config = loadConfig();
		if (!config.enabled) return;

		// Ensure notifications singleton is running (panels may not start it if no UI)
		await notificationsState.start(pi, ctx.cwd);

		// First check immediately (async, won't block startup)
		check().catch((err) => { console.error("[stale-prs] check error:", err); });

		// Then on interval
		const intervalMs = config.pollIntervalMinutes * 60 * 1000;
		timer = setInterval(() => check().catch(() => {}), intervalMs);
	});

	pi.on("session_shutdown", async () => {
		if (timer) { clearInterval(timer); timer = null; }
	});

	// ── Action handlers ─────────────────────────────────────────────────

	notificationsState.registerHandler("stale-prs:review", async (params) => {
		const prNumber = params.prNumber as number;
		pi.sendUserMessage(`/review-pr ${prNumber}`);
	});

	notificationsState.registerHandler("stale-prs:ping-reviewers", async (params) => {
		const prNumber = params.prNumber as number;
		const repo = params.repo as string;
		const reviewers = params.reviewers as string[];

		if (!reviewers.length) throw new Error("No reviewers to ping");

		const mentions = reviewers.map(r => `@${r}`).join(" ");
		const body = `${mentions} friendly ping — this PR has been waiting for review`;

		const args = ["pr", "comment", String(prNumber), "--body", body];
		if (repo) args.push("--repo", repo);
		execFileSync("gh", args, { encoding: "utf-8", timeout: 15_000 });
	});
}
