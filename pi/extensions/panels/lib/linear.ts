import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const HOME = process.env.HOME ?? "";
const cache = new Map();
const CACHE_TTL = 120_000;

function loadAuth() {
	try {
		const raw = readFileSync(join(HOME, ".pi", "agent", "auth.json"), "utf-8");
		const data = JSON.parse(raw);
		return {
			apiKey: data?.linear?.["api-key"] ?? null,
			defaultTeam: data?.linear?.["default-team"] ?? null,
		};
	} catch {
		return { apiKey: null, defaultTeam: null };
	}
}

export function linearIssueUrl(identifier: string): string {
	return `https://linear.app/issue/${identifier}`;
}

export function lookupIssue(identifier) {
	const cached = cache.get(identifier);
	if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.result;

	const auth = loadAuth();
	if (!auth.apiKey) return null;

	const [teamKey, numStr] = identifier.split("-");
	const num = parseInt(numStr);
	if (!teamKey || isNaN(num)) return null;

	const body = JSON.stringify({
		query: `query($filter: IssueFilter) { issues(filter: $filter, first: 1) { nodes { identifier title url state { name } } } }`,
		variables: { filter: { team: { key: { eq: teamKey } }, number: { eq: num } } },
	});

	try {
		const raw = execFileSync(
			"curl",
			["-s", "-X", "POST", "-H", "Content-Type: application/json", "-H", `Authorization: ${auth.apiKey}`, "-d", body, "https://api.linear.app/graphql"],
			{ timeout: 10_000, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
		);
		const issue = JSON.parse(raw).data?.issues?.nodes?.[0] ?? null;
		cache.set(identifier, { result: issue, ts: Date.now() });
		return issue;
	} catch {
		cache.set(identifier, { result: null, ts: Date.now() });
		return null;
	}
}
