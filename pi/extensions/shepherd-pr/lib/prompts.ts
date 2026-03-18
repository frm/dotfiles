export function buildCiFixPrompt(
	checkName: string,
	prNumber: number,
	prTitle: string,
	changedFiles: string[],
	failedLogs: string,
): string {
	return `You are fixing a PR CI failure in-place for the current repository.
Goal: make CI pass with minimal, safe edits.

Check: ${checkName}
PR #${prNumber}: ${prTitle}

Changed files in this PR:
${changedFiles.length > 0 ? changedFiles.map((f) => `- ${f}`).join("\n") : "(unknown)"}

Failed log excerpt:
\`\`\`
${failedLogs.slice(0, 12000) || "(no failed logs available)"}
\`\`\`

Do the following:
1) Identify root cause from the logs
2) Apply minimal code fix
3) Run focused verification commands to confirm the fix
4) Stage ONLY the files you changed, commit with message: fix: address CI failure (${checkName})
5) Run: git push origin HEAD — this is critical, the fix is not done until pushed`;
}

export function buildReviewFixPrompt(
	prNumber: number,
	prTitle: string,
	comment: { user: { login: string }; path: string; line: number | null; original_line: number | null; body: string; diff_hunk?: string },
	fileContext: string,
): string {
	const lineRef = comment.line ?? comment.original_line ?? "?";

	return `You are addressing a PR review comment for the current repository.
Goal: address the reviewer's feedback with minimal correct edits.

PR #${prNumber}: ${prTitle}
Reviewer: ${comment.user.login}
Location: ${comment.path}:${lineRef}

Review comment:
\`\`\`
${comment.body}
\`\`\`

Diff hunk for context:
\`\`\`diff
${comment.diff_hunk || ""}
\`\`\`

Local file context around the line:
\`\`\`
${fileContext || "(no local file context found)"}
\`\`\`

Do the following:
1) Read the file and understand the reviewer's concern
2) Implement the requested change — keep it narrowly scoped
3) Run any relevant verification (lint, type-check, test) to confirm
4) Stage ONLY the files you changed, commit with message: fix: address review feedback on ${comment.path}
5) Run: git push origin HEAD — this is critical, the fix is not done until pushed`;
}

export function buildConflictFixPrompt(
	prNumber: number,
	prTitle: string,
	baseRefName: string,
): string {
	return `A git rebase is in progress and has hit conflicts.
Use the solve-conflicts skill to resolve them. Auto-accept the plan — do not ask for approval.
After resolving each step, run \`git rebase --continue\` and repeat until the rebase completes.
Then force-push with: git push --force-with-lease origin HEAD

PR #${prNumber}: ${prTitle}
Base: ${baseRefName}`;
}
