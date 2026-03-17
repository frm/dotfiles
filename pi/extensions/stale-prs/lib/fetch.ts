import { execFile } from "node:child_process";
import type { PrData } from "./types.ts";

const JSON_FIELDS = "number,title,headRefName,url,createdAt,updatedAt,isDraft,reviewDecision,latestReviews,reviewRequests,autoMergeRequest,mergeable,author";

function exec(cmd: string, args: string[], cwd?: string): Promise<string> {
	return new Promise((resolve, reject) => {
		execFile(cmd, args, { encoding: "utf-8", cwd, timeout: 15_000 }, (err, stdout) => {
			if (err) reject(err);
			else resolve(stdout.trim());
		});
	});
}

export async function getUsername(): Promise<string | null> {
	try {
		const out = await exec("gh", ["api", "user", "--jq", ".login"]);
		return out || null;
	} catch { return null; }
}

export async function getRepoSlug(cwd: string): Promise<string | null> {
	try {
		const out = await exec("gh", ["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"], cwd);
		return out || null;
	} catch { return null; }
}

export async function fetchReviewRequested(cwd: string): Promise<PrData[]> {
	try {
		const out = await exec("gh", [
			"pr", "list", "--search", "review-requested:@me is:open",
			"--json", JSON_FIELDS, "--limit", "50",
		], cwd);
		return JSON.parse(out);
	} catch { return []; }
}

export async function fetchMyPrs(cwd: string): Promise<PrData[]> {
	try {
		const out = await exec("gh", [
			"pr", "list", "--author", "@me", "--state", "open",
			"--json", JSON_FIELDS, "--limit", "50",
		], cwd);
		return JSON.parse(out);
	} catch { return []; }
}
