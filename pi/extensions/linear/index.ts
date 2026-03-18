/**
 * Linear Extension
 *
 * Command: /linear <issue-id> [notes] — fetch issue and send to agent
 *
 * Tools (LLM-callable):
 *   linear_fetch_issue       — fetch a single issue by identifier
 *   linear_create_issue      — create an issue (or sub-issue via parentId)
 *   linear_update_issue      — update issue attributes (state, assignee, description, etc.)
 *   linear_list_issues       — list issues with filters (assignee, state, team)
 *   linear_list_my_projects  — list projects where the current user is a member or lead
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { StringEnum } from "@mariozechner/pi-ai";
import type { LinearSettings } from "./lib/types.js";
import { CREATE_ISSUE, LIST_ISSUES, LIST_MY_PROJECTS, UPDATE_ISSUE } from "./lib/queries.js";
import { gql, resolveTeamId, resolveStateId, fetchIssueByIdentifier } from "./lib/client.js";
import { formatIssue, formatIssueCompact } from "./lib/format.js";
import { readAuth } from "../lib/config.ts";

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

function loadSettings(): LinearSettings {
	const s = readAuth("linear");
	return {
		apiKey: s?.["api-key"] ?? null,
		defaultTeamKey: s?.["default-team"] ?? null,
		userId: s?.["user-id"] ?? null,
	};
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
	// ── /linear command ─────────────────────────────────────────────────
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

	// ── linear__fetch_issue tool ─────────────────────────────────────────
	pi.registerTool({
		name: "linear__fetch_issue",
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

	// ── linear__create_issue tool ────────────────────────────────────────
	pi.registerTool({
		name: "linear__create_issue",
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

	// ── linear__update_issue tool ────────────────────────────────────────
	pi.registerTool({
		name: "linear__update_issue",
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

	// ── linear__list_issues tool ─────────────────────────────────────────
	pi.registerTool({
		name: "linear__list_issues",
		label: "Linear: List Issues",
		description:
			"List Linear issues with filters. Defaults to issues assigned to the current user. " +
			"Combine filters with AND logic. Use projectId to filter by project, unassigned to find unassigned issues.",
		parameters: Type.Object({
			assignedToMe: Type.Optional(Type.Boolean({ description: "Filter to issues assigned to the current user. Defaults to true." })),
			stateName: Type.Optional(Type.String({ description: "Filter by workflow state name, e.g. 'In Progress'" })),
			stateType: Type.Optional(StringEnum(["triage", "backlog", "unstarted", "started", "completed", "cancelled"] as const)),
			teamKey: Type.Optional(Type.String({ description: "Filter by team key, e.g. ENG" })),
			projectId: Type.Optional(Type.String({ description: "Filter issues by Linear project ID" })),
			unassigned: Type.Optional(Type.Boolean({ description: "When true, filter to issues with no assignee" })),
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
			if (params.projectId) {
				filters.push({ project: { id: { eq: params.projectId } } });
			}
			if (params.unassigned) {
				filters.push({ assignee: { null: true } });
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

	// ── linear__list_my_projects tool ────────────────────────────────────
	pi.registerTool({
		name: "linear__list_my_projects",
		label: "Linear: List My Projects",
		description: "List Linear projects where the current user is a member or lead.",
		parameters: Type.Object({
			limit: Type.Optional(Type.Number({ description: "Max results (default 25, max 50)" })),
		}),
		async execute(_id, params) {
			const apiKey = requireApiKey();
			const limit = Math.min(params.limit ?? 25, 50);
			const data = await gql(apiKey, LIST_MY_PROJECTS, { first: limit });
			const projects = data.projects?.nodes ?? [];

			if (projects.length === 0) {
				return { content: [{ type: "text", text: "No projects found." }], details: { projects: [] } };
			}

			const lines = projects.map((p: any) => `${p.name} (${p.state}) — ID: ${p.id}`);
			const text = `Found ${projects.length} project${projects.length > 1 ? "s" : ""}:\n\n${lines.join("\n")}`;
			return {
				content: [{ type: "text", text }],
				details: { projects },
			};
		},
	});
}
