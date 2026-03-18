/**
 * Work Setup Extension
 *
 * Tool: work__setup — create a worktree + tmux window for a Linear ticket
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { execFileSync } from "node:child_process";
import { readAuth } from "../lib/config.ts";

const GQL = "https://api.linear.app/graphql";
const PIPE: any = ["pipe", "pipe", "pipe"];

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

function loadLinearSettings() {
	const s = readAuth("linear");
	return {
		apiKey: s?.["api-key"] ?? null,
		userId: s?.["user-id"] ?? null,
	};
}

// ---------------------------------------------------------------------------
// Linear helpers
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

const ISSUE_FIELDS = `
  id identifier title description url priority priorityLabel
  state { id name type }
  assignee { id name displayName }
  team { id key name }
`;

const FETCH_ISSUE = `
  query($filter: IssueFilter) {
    issues(filter: $filter, first: 1) { nodes { ${ISSUE_FIELDS} } }
  }
`;

const RESOLVE_STATES = `
  query($filter: WorkflowStateFilter) {
    workflowStates(filter: $filter) { nodes { id name type } }
  }
`;

const UPDATE_ISSUE = `
  mutation($id: String!, $input: IssueUpdateInput!) {
    issueUpdate(id: $id, input: $input) { success issue { identifier title } }
  }
`;

async function fetchIssue(apiKey: string, identifier: string) {
	const [teamKey, numberStr] = identifier.toUpperCase().split("-");
	if (!teamKey || !numberStr) return null;
	const num = parseInt(numberStr, 10);
	if (isNaN(num)) return null;
	const data = await gql(apiKey, FETCH_ISSUE, {
		filter: { team: { key: { eq: teamKey } }, number: { eq: num } },
	});
	return data.issues?.nodes?.[0] ?? null;
}

async function resolveStateId(apiKey: string, teamId: string, stateName: string): Promise<string> {
	const data = await gql(apiKey, RESOLVE_STATES, { filter: { team: { id: { eq: teamId } } } });
	const states = data.workflowStates?.nodes ?? [];
	const match = states.find((s: any) => s.name === stateName)
		?? states.find((s: any) => s.name.toLowerCase() === stateName.toLowerCase());
	if (!match) throw new Error(`State "${stateName}" not found`);
	return match.id;
}

// ---------------------------------------------------------------------------
// Shell helpers
// ---------------------------------------------------------------------------

function sh(cmd: string, ...args: string[]): string {
	return execFileSync(cmd, args, { timeout: 5000, encoding: "utf-8", stdio: PIPE }).trim();
}

function slugify(title: string, max = 50): string {
	return title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, max);
}

function detectDefaultBranch(): string {
	try {
		return sh("git", "symbolic-ref", "refs/remotes/origin/HEAD").replace(/^refs\/remotes\/origin\//, "");
	} catch {
		try { sh("git", "rev-parse", "--verify", "main"); return "main"; } catch {}
		try { sh("git", "rev-parse", "--verify", "master"); return "master"; } catch {}
		throw new Error("Could not detect default branch");
	}
}

function tmuxSessionName(): string {
	return sh("tmux", "display-message", "-p", "#{session_name}");
}

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------

export default function workSetupExtension(pi: ExtensionAPI) {
	pi.registerTool({
		name: "work__setup",
		label: "Work: Setup Ticket",
		description:
			"Create a worktree and tmux window for a Linear ticket. " +
			"Fetches ticket, creates branch, opens new tmux window with pi, " +
			"assigns ticket and moves to In Progress.",
		parameters: Type.Object({
			identifier: Type.String({ description: "Linear ticket ID, e.g. RVR-123" }),
			brainstorm: Type.Optional(Type.Boolean({ description: "Launch pi with /brainstorm (default: true)" })),
			planAfterBrainstorm: Type.Optional(Type.Boolean({ description: "Chain /writing-plans after brainstorm (default: false)" })),
		}),
		async execute(_id, params) {
			const settings = loadLinearSettings();
			if (!settings.apiKey) throw new Error("No Linear API key configured");

			// 1. Fetch ticket
			const issue = await fetchIssue(settings.apiKey, params.identifier);
			if (!issue) throw new Error(`Issue ${params.identifier} not found`);

			// 2. Detect default branch
			const defaultBranch = detectDefaultBranch();

			// 3. Generate branch name
			const ticketId = issue.identifier.toLowerCase();
			const slug = slugify(issue.title);
			const branchName = `frm/${ticketId}/${slug}`;

			// 4. Get tmux session
			const session = tmuxSessionName();

			// 5. Build pi launch command
			let piCmd = "pi";
			const doBrainstorm = params.brainstorm !== false;
			if (doBrainstorm) {
				const desc = (issue.description || "").replace(/'/g, "'\\''");
				const title = issue.title.replace(/'/g, "'\\''");
				let prompt = `/brainstorm ${issue.identifier} — ${title}\n\n${desc}\n\nURL: ${issue.url}`;
				if (params.planAfterBrainstorm) {
					prompt += "\n\nAfter the brainstorm is complete and the design is written, use the writing-plans skill to create an execution plan.";
				}
				piCmd = `pi '${prompt.replace(/'/g, "'\\''")}'`;
			}

			// 6. Create tmux window + worktree
			const fullCmd = `g co ${defaultBranch} && g wt ${branchName} && ${piCmd}`;
			execFileSync("tmux", ["new-window", "-t", `${session}:`], { timeout: 5000, stdio: PIPE });
			execFileSync("tmux", ["send-keys", "-t", `${session}:`, fullCmd, "Enter"], { timeout: 5000, stdio: PIPE });

			// 7. Update Linear: assign + move to In Progress
			const updates: Record<string, any> = {};
			if (!issue.assignee || issue.assignee.id !== settings.userId) {
				if (settings.userId) updates.assigneeId = settings.userId;
			}
			if (issue.state?.name !== "In Progress") {
				updates.stateId = await resolveStateId(settings.apiKey, issue.team.id, "In Progress");
			}
			if (Object.keys(updates).length > 0) {
				await gql(settings.apiKey, UPDATE_ISSUE, { id: issue.id, input: updates });
			}

			const msg = `Set up worktree for **${issue.identifier}** — ${issue.title}.\nBranch: \`${branchName}\`\nMoved to In Progress.${doBrainstorm ? " Pi is starting with /brainstorm." : ""}`;
			return {
				content: [{ type: "text", text: msg }],
				details: { issue, branchName, defaultBranch },
			};
		},
	});
}
