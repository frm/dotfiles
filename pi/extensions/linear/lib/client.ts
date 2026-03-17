import { GQL, FETCH_ISSUE, RESOLVE_TEAM, RESOLVE_STATES } from "./queries.js";

export async function gql(apiKey: string, query: string, variables: Record<string, any> = {}): Promise<any> {
	const res = await fetch(GQL, {
		method: "POST",
		headers: { "Content-Type": "application/json", Authorization: apiKey },
		body: JSON.stringify({ query, variables }),
	});
	if (!res.ok) throw new Error(`Linear API ${res.status}: ${await res.text()}`);
	const json = (await res.json()) as any;
	if (json.errors?.length) throw new Error(json.errors.map((e: any) => e.message).join("; "));
	return json.data;
}

export async function resolveTeamId(apiKey: string, teamKey: string): Promise<string> {
	const data = await gql(apiKey, RESOLVE_TEAM, { filter: { key: { eq: teamKey.toUpperCase() } } });
	const team = data.teams?.nodes?.[0];
	if (!team) throw new Error(`Team "${teamKey}" not found`);
	return team.id;
}

export async function resolveStateId(apiKey: string, teamId: string, stateName: string): Promise<string> {
	const data = await gql(apiKey, RESOLVE_STATES, { filter: { team: { id: { eq: teamId } } } });
	const states = data.workflowStates?.nodes ?? [];
	// Try exact match first, then case-insensitive
	const match = states.find((s: any) => s.name === stateName)
		?? states.find((s: any) => s.name.toLowerCase() === stateName.toLowerCase());
	if (!match) {
		const available = states.map((s: any) => s.name).join(", ");
		throw new Error(`State "${stateName}" not found. Available: ${available}`);
	}
	return match.id;
}

export async function fetchIssueByIdentifier(apiKey: string, identifier: string) {
	const [teamKey, numberStr] = identifier.toUpperCase().split("-");
	if (!teamKey || !numberStr) return null;
	const num = parseInt(numberStr, 10);
	if (isNaN(num)) return null;
	const data = await gql(apiKey, FETCH_ISSUE, {
		filter: { team: { key: { eq: teamKey } }, number: { eq: num } },
	});
	return data.issues?.nodes?.[0] ?? null;
}
