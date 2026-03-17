export function formatIssue(issue: any): string {
	const lines = [
		`**${issue.identifier}** — ${issue.title}`,
		`State: ${issue.state?.name ?? "?"}  |  Priority: ${issue.priorityLabel ?? "None"}  |  Assignee: ${issue.assignee?.displayName ?? "Unassigned"}`,
		`Team: ${issue.team?.key ?? "?"}  |  URL: ${issue.url}`,
	];
	if (issue.parent) lines.push(`Parent: ${issue.parent.identifier} — ${issue.parent.title}`);
	if (issue.labels?.nodes?.length) lines.push(`Labels: ${issue.labels.nodes.map((l: any) => l.name).join(", ")}`);
	if (issue.relations?.nodes?.length) {
		const blocked = issue.relations.nodes
			.filter((r: any) => r.type === "blocks" && r.relatedIssue?.state?.type !== "completed" && r.relatedIssue?.state?.type !== "cancelled")
			.map((r: any) => `${r.relatedIssue.identifier} (${r.relatedIssue.title})`);
		if (blocked.length) lines.push(`Blocked by: ${blocked.join(", ")}`);
	}
	if (issue.description) lines.push("", issue.description);
	return lines.join("\n");
}

export function formatIssueCompact(issue: any): string {
	const assignee = issue.assignee?.displayName ?? "Unassigned";
	const state = issue.state?.name ?? "?";
	const blocked = issue.relations?.nodes?.some(
		(r: any) => r.type === "blocks" && r.relatedIssue?.state?.type !== "completed" && r.relatedIssue?.state?.type !== "cancelled"
	);
	const blockedTag = blocked ? " [BLOCKED]" : "";
	return `${issue.identifier}  ${state}  ${assignee}  ${issue.title}${blockedTag}`;
}
