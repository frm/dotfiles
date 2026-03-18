import { execFileSync } from "node:child_process";
import { readAuth } from "../../lib/config.ts";

const cache = new Map();
const CACHE_TTL = 120_000;

function loadLinearAuth() {
	const s = readAuth("linear");
	return {
		apiKey: s?.["api-key"] ?? null,
		defaultTeam: s?.["default-team"] ?? null,
	};
}

export function linearIssueUrl(identifier: string): string {
	return `https://linear.app/issue/${identifier}`;
}

export function lookupIssue(identifier) {
	const cached = cache.get(identifier);
	if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.result;

	const auth = loadLinearAuth();
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
