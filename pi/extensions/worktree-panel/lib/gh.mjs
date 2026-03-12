import { execFileSync } from "node:child_process";

const PIPE = { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] };

let cachedUsername = null;

export function getUsername() {
	if (cachedUsername) return cachedUsername;
	try {
		cachedUsername = execFileSync("gh", ["api", "user", "--jq", ".login"], {
			...PIPE, timeout: 10_000,
		}).trim();
	} catch { cachedUsername = null; }
	return cachedUsername;
}

export function prList(opts, cwd) {
	const args = ["pr", "list"];
	if (opts.search) args.push("--search", opts.search);
	if (opts.author) args.push("--author", opts.author);
	if (opts.state) args.push("--state", opts.state);
	if (opts.head) args.push("--head", opts.head);
	if (opts.json) args.push("--json", opts.json);
	if (opts.limit) args.push("--limit", String(opts.limit));
	try {
		return JSON.parse(execFileSync("gh", args, { ...PIPE, cwd, timeout: 15_000 }).trim());
	} catch { return []; }
}

export function prChecks(prNumber, cwd) {
	try {
		let raw;
		try {
			raw = execFileSync("gh", ["pr", "checks", String(prNumber)], {
				...PIPE, cwd, timeout: 10_000,
			});
		} catch (err) { raw = err.stdout ?? ""; }
		raw = (raw ?? "").toString().trim();
		if (!raw) return { status: null, passing: 0, total: 0 };

		const statuses = [];
		for (const line of raw.split("\n")) {
			const parts = line.split("\t");
			if (parts[1]) statuses.push(parts[1].trim());
		}
		const total = statuses.length;
		const passing = statuses.filter((s) => s === "pass" || s === "skipping").length;
		if (total === 0) return { status: null, passing: 0, total: 0 };

		let status = null;
		if (statuses.some((s) => s === "fail")) status = "fail";
		else if (statuses.some((s) => s === "pending")) status = "pending";
		else if (passing === total) status = "pass";
		return { status, passing, total };
	} catch {
		return { status: null, passing: 0, total: 0 };
	}
}
