/**
 * Linear Extension
 *
 * Command: /linear <issue-id> [notes] — fetch issue and send to agent
 *
 * Tools (LLM-callable):
 *   linear_fetch_issue  — fetch a single issue by identifier
 *   linear_create_issue — create an issue (or sub-issue via parentId)
 *   linear_update_issue — update issue attributes (state, assignee, description, etc.)
 *   linear_list_issues  — list issues with filters (assignee, state, team)
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type, type Static } from "@sinclair/typebox";
import { StringEnum } from "@mariozechner/pi-ai";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const GQL = "https://api.linear.app/graphql";

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

interface LinearSettings {
	apiKey: string | null;
	defaultTeamKey: string | null;
}

function loadSettings(): LinearSettings {
	try {
		const p = join(process.env.HOME || "", ".pi", "agent", "auth.json");
		const s = JSON.parse(readFileSync(p, "utf-8"));
		return {
			apiKey: s?.linear?.["api-key"] ?? null,
			defaultTeamKey: s?.linear?.["default-team"] ?? null,
		};
	} catch {
		return { apiKey: null, defaultTeamKey: null };
	}
}

// ---------------------------------------------------------------------------
// GQL helpers
// ---------------------------------------------------------------------------

async function gql(apiKey: string, query: string, variables: Record<string, any> = {}): Promise<any> {
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

// ---------------------------------------------------------------------------
// Queries & Mutations
// ---------------------------------------------------------------------------

const ISSUE_FIELDS = `
  id identifier title description url priority priorityLabel
  createdAt updatedAt
  state { id name type }
  assignee { id name displayName }
  team { id key name }
  parent { id identifier title }
  labels { nodes { id name } }
`;

const FETCH_ISSUE = `
  query($filter: IssueFilter) {
    issues(filter: $filter, first: 1) { nodes { ${ISSUE_FIELDS} } }
  }
`;

const LIST_ISSUES = `
  query($filter: IssueFilter, $first: Int) {
    issues(filter: $filter, first: $first) {
      nodes { ${ISSUE_FIELDS} }
    }
  }
`;

const CREATE_ISSUE = `
  mutation($input: IssueCreateInput!) {
    issueCreate(input: $input) {
      success
      issue { ${ISSUE_FIELDS} }
    }
  }
`;

const UPDATE_ISSUE = `
  mutation($id: String!, $input: IssueUpdateInput!) {
    issueUpdate(id: $id, input: $input) {
      success
      issue { ${ISSUE_FIELDS} }
    }
  }
`;

const RESOLVE_TEAM = `
  query($filter: TeamFilter) {
    teams(filter: $filter, first: 1) { nodes { id key name } }
  }
`;

const RESOLVE_STATES = `
  query($filter: WorkflowStateFilter) {
    workflowStates(filter: $filter) {
      nodes { id name type }
    }
  }
`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function resolveTeamId(apiKey: string, teamKey: string): Promise<string> {
	const data = await gql(apiKey, RESOLVE_TEAM, { filter: { key: { eq: teamKey.toUpperCase() } } });
	const team = data.teams?.nodes?.[0];
	if (!team) throw new Error(`Team "${teamKey}" not found`);
	return team.id;
}

async function resolveStateId(apiKey: string, teamId: string, stateName: string): Promise<string> {
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

async function fetchIssueByIdentifier(apiKey: string, identifier: string) {
	const [teamKey, numberStr] = identifier.toUpperCase().split("-");
	if (!teamKey || !numberStr) return null;
	const num = parseInt(numberStr, 10);
	if (isNaN(num)) return null;
	const data = await gql(apiKey, FETCH_ISSUE, {
		filter: { team: { key: { eq: teamKey } }, number: { eq: num } },
	});
	return data.issues?.nodes?.[0] ?? null;
}

function formatIssue(issue: any): string {
	const lines = [
		`**${issue.identifier}** — ${issue.title}`,
		`State: ${issue.state?.name ?? "?"}  |  Priority: ${issue.priorityLabel ?? "None"}  |  Assignee: ${issue.assignee?.displayName ?? "Unassigned"}`,
		`Team: ${issue.team?.key ?? "?"}  |  URL: ${issue.url}`,
	];
	if (issue.parent) lines.push(`Parent: ${issue.parent.identifier} — ${issue.parent.title}`);
	if (issue.labels?.nodes?.length) lines.push(`Labels: ${issue.labels.nodes.map((l: any) => l.name).join(", ")}`);
	if (issue.description) lines.push("", issue.description);
	return lines.join("\n");
}

function formatIssueCompact(issue: any): string {
	const assignee = issue.assignee?.displayName ?? "Unassigned";
	const state = issue.state?.name ?? "?";
	return `${issue.identifier}  ${state}  ${assignee}  ${issue.title}`;
}

function requireApiKey(): string {
	const { apiKey } = loadSettings();
	if (!apiKey) throw new Error('No Linear API key. Add to ~/.pi/agent/auth.json: "linear": { "api-key": "lin_api_..." }');
	return apiKey;
}

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------

export default function linearExtension(pi: ExtensionAPI) {
	// ── /linear command (existing) ──────────────────────────────────────
	pi.registerCommand("linear", {
		description: "Fetch a Linear issue and send to agent — /linear <issue-id> [notes]",
		handler: async (args, ctx) => {
			const trimmed = args?.trim() ?? "";
			if (!trimmed) {
				ctx.ui.notify("Usage: /linear <issue-id> [notes]\nExample: /linear RVR-123 check edge cases", "warning");
				return;
			}

			let apiKey: string;
			try { apiKey = requireApiKey(); } catch (e: any) { ctx.ui.notify(e.message, "error"); return; }

			const parts = trimmed.split(/\s+/);
			const issueId = parts[0];
			const notes = parts.slice(1).join(" ");

			ctx.ui.notify(`Fetching ${issueId.toUpperCase()}...`, "info");
			const issue = await fetchIssueByIdentifier(apiKey, issueId);
			if (!issue) { ctx.ui.notify(`Issue ${issueId.toUpperCase()} not found`, "error"); return; }

			let msg = `## Linear Issue: ${issue.identifier}\n**${issue.title}**\n${issue.url}\n\n`;
			if (issue.description) msg += `${issue.description}\n`;
			if (notes) msg += `\n---\n**Additional context:** ${notes}\n`;
			msg += `\n---\nWork on this issue.`;

			pi.sendUserMessage(msg);
		},
	});

	// ── linear_fetch_issue tool ─────────────────────────────────────────
	pi.registerTool({
		name: "linear_fetch_issue",
		label: "Linear: Fetch Issue",
		description: "Fetch a Linear issue by its identifier (e.g. ENG-123). Returns full details including description.",
		parameters: Type.Object({
			identifier: Type.String({ description: "Issue identifier, e.g. ENG-123" }),
		}),
		async execute(_id, params) {
			const apiKey = requireApiKey();
			const issue = await fetchIssueByIdentifier(apiKey, params.identifier);
			if (!issue) throw new Error(`Issue ${params.identifier} not found`);
			return {
				content: [{ type: "text", text: formatIssue(issue) }],
				details: { issue },
			};
		},
	});

	// ── linear_create_issue tool ────────────────────────────────────────
	pi.registerTool({
		name: "linear_create_issue",
		label: "Linear: Create Issue",
		description:
			"Create a Linear issue. Set parentIdentifier to create a sub-issue. " +
			"Team defaults to the configured default team if omitted.",
		parameters: Type.Object({
			title: Type.String({ description: "Issue title" }),
			description: Type.Optional(Type.String({ description: "Issue description (markdown)" })),
			teamKey: Type.Optional(Type.String({ description: "Team key, e.g. ENG. Uses default team if omitted." })),
			parentIdentifier: Type.Optional(Type.String({ description: "Parent issue identifier for sub-issues, e.g. ENG-123" })),
			stateName: Type.Optional(Type.String({ description: "Workflow state name, e.g. 'In Progress', 'Backlog'" })),
			assigneeId: Type.Optional(Type.String({ description: "Assignee user ID" })),
			priority: Type.Optional(Type.Number({ description: "Priority: 0=None, 1=Urgent, 2=High, 3=Medium, 4=Low" })),
		}),
		async execute(_id, params) {
			const apiKey = requireApiKey();
			const settings = loadSettings();

			const teamKey = params.teamKey || settings.defaultTeamKey;
			if (!teamKey) throw new Error("No team specified and no default team configured in settings.json");

			const teamId = await resolveTeamId(apiKey, teamKey);

			const input: Record<string, any> = {
				teamId,
				title: params.title,
			};
			if (params.description) input.description = params.description;
			if (params.assigneeId) input.assigneeId = params.assigneeId;
			if (params.priority !== undefined) input.priority = params.priority;

			if (params.parentIdentifier) {
				const parent = await fetchIssueByIdentifier(apiKey, params.parentIdentifier);
				if (!parent) throw new Error(`Parent issue ${params.parentIdentifier} not found`);
				input.parentId = parent.id;
			}

			if (params.stateName) {
				input.stateId = await resolveStateId(apiKey, teamId, params.stateName);
			}

			const data = await gql(apiKey, CREATE_ISSUE, { input });
			if (!data.issueCreate?.success) throw new Error("Issue creation failed");

			const issue = data.issueCreate.issue;
			return {
				content: [{ type: "text", text: `Created ${issue.identifier}: ${issue.title}\n${issue.url}\n\n${formatIssue(issue)}` }],
				details: { issue },
			};
		},
	});

	// ── linear_update_issue tool ────────────────────────────────────────
	pi.registerTool({
		name: "linear_update_issue",
		label: "Linear: Update Issue",
		description:
			"Update a Linear issue's attributes. Only include fields you want to change. " +
			"Use stateName to change workflow state (e.g. 'In Progress', 'Done').",
		parameters: Type.Object({
			identifier: Type.String({ description: "Issue identifier, e.g. ENG-123" }),
			title: Type.Optional(Type.String({ description: "New title" })),
			description: Type.Optional(Type.String({ description: "New description (markdown). Replaces the entire description." })),
			stateName: Type.Optional(Type.String({ description: "Workflow state name, e.g. 'In Progress', 'Done'" })),
			assigneeId: Type.Optional(Type.String({ description: "New assignee user ID" })),
			priority: Type.Optional(Type.Number({ description: "Priority: 0=None, 1=Urgent, 2=High, 3=Medium, 4=Low" })),
		}),
		async execute(_id, params) {
			const apiKey = requireApiKey();

			const issue = await fetchIssueByIdentifier(apiKey, params.identifier);
			if (!issue) throw new Error(`Issue ${params.identifier} not found`);

			const input: Record<string, any> = {};
			if (params.title) input.title = params.title;
			if (params.description !== undefined) input.description = params.description;
			if (params.assigneeId) input.assigneeId = params.assigneeId;
			if (params.priority !== undefined) input.priority = params.priority;

			if (params.stateName) {
				input.stateId = await resolveStateId(apiKey, issue.team.id, params.stateName);
			}

			if (Object.keys(input).length === 0) throw new Error("No fields to update");

			const data = await gql(apiKey, UPDATE_ISSUE, { id: issue.id, input });
			if (!data.issueUpdate?.success) throw new Error("Issue update failed");

			const updated = data.issueUpdate.issue;
			return {
				content: [{ type: "text", text: `Updated ${updated.identifier}\n\n${formatIssue(updated)}` }],
				details: { issue: updated },
			};
		},
	});

	// ── linear_list_issues tool ─────────────────────────────────────────
	pi.registerTool({
		name: "linear_list_issues",
		label: "Linear: List Issues",
		description:
			"List Linear issues with filters. Defaults to issues assigned to the current user. " +
			"Combine filters with AND logic.",
		parameters: Type.Object({
			assignedToMe: Type.Optional(Type.Boolean({ description: "Filter to issues assigned to the current user. Defaults to true." })),
			stateName: Type.Optional(Type.String({ description: "Filter by workflow state name, e.g. 'In Progress'" })),
			stateType: Type.Optional(StringEnum(["triage", "backlog", "unstarted", "started", "completed", "cancelled"] as const)),
			teamKey: Type.Optional(Type.String({ description: "Filter by team key, e.g. ENG" })),
			limit: Type.Optional(Type.Number({ description: "Max results (default 25, max 50)" })),
		}),
		async execute(_id, params) {
			const apiKey = requireApiKey();

			const filters: any[] = [];

			// Default to assigned-to-me unless explicitly false
			if (params.assignedToMe !== false) {
				filters.push({ assignee: { isMe: { eq: true } } });
			}
			if (params.stateName) {
				filters.push({ state: { name: { eqCaseInsensitive: params.stateName } } });
			}
			if (params.stateType) {
				filters.push({ state: { type: { eq: params.stateType } } });
			}
			if (params.teamKey) {
				filters.push({ team: { key: { eq: params.teamKey.toUpperCase() } } });
			}

			const filter = filters.length > 1 ? { and: filters } : filters[0] ?? {};
			const limit = Math.min(params.limit ?? 25, 50);

			const data = await gql(apiKey, LIST_ISSUES, { filter, first: limit });
			const issues = data.issues?.nodes ?? [];

			if (issues.length === 0) {
				return { content: [{ type: "text", text: "No issues found matching the filters." }], details: { issues: [] } };
			}

			const lines = issues.map((i: any) => formatIssueCompact(i));
			const text = `Found ${issues.length} issue${issues.length > 1 ? "s" : ""}:\n\n${lines.join("\n")}`;
			return {
				content: [{ type: "text", text }],
				details: { issues },
			};
		},
	});
}
