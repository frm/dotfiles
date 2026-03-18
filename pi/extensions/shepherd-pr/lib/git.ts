import { execStdout, runExec } from "./exec.ts";

export async function isWorktreeClean(cwd: string): Promise<boolean> {
	const status = await execStdout(cwd, "git", ["status", "--porcelain"]);
	return status.trim().length === 0;
}

export async function ensurePushed(cwd: string, commitMsg: string): Promise<void> {
	// If pi left staged or unstaged changes, commit them
	const clean = await isWorktreeClean(cwd);
	if (!clean) {
		await runExec(cwd, "git", ["add", "-A"], 5000);
		await runExec(cwd, "git", ["commit", "-m", commitMsg], 15000);
	}

	const unpushed = await execStdout(cwd, "git", ["log", "@{u}..HEAD", "--oneline"]);
	if (unpushed.trim()) {
		await runExec(cwd, "git", ["push", "origin", "HEAD"], 45000);
	}
}
