import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";

export function tryParseJsonObject(raw: string): Record<string, unknown> | null {
	const trimmed = raw.trim();
	try {
		return JSON.parse(trimmed);
	} catch {}

	const start = trimmed.indexOf("{");
	const end = trimmed.lastIndexOf("}");
	if (start >= 0 && end > start) {
		try {
			return JSON.parse(trimmed.slice(start, end + 1));
		} catch {}
	}
	return null;
}

export async function findFailedRun(
	cwd: string,
	headBranch: string,
	checkName: string,
): Promise<{ id: number; name: string } | null> {
	const raw = await execStdout(
		cwd,
		"gh",
		["run", "list", "--branch", headBranch, "--limit", "30", "--json", "databaseId,name,status,conclusion"],
	);
	if (!raw.trim()) return null;

	let runs: Array<{ databaseId: number; name: string; status: string; conclusion: string }> = [];
	try {
		runs = JSON.parse(raw);
	} catch {
		return null;
	}

	const failed = runs.filter((run) =>
		(run.status === "completed" || run.status === "COMPLETED") &&
		(run.conclusion === "failure" || run.conclusion === "cancelled" || run.conclusion === "FAILURE" || run.conclusion === "CANCELLED")
	);
	const exact = failed.find((run) => run.name === checkName);
	const picked = exact ?? failed[0];
	if (!picked?.databaseId) return null;

	return { id: picked.databaseId, name: picked.name };
}

export async function getFailedRunLogs(cwd: string, runId: number): Promise<string> {
	return await execStdout(cwd, "gh", ["run", "view", String(runId), "--log-failed"]);
}

export async function getPrChangedFiles(cwd: string, prNumber: number, baseRefName: string): Promise<string[]> {
	const ghOut = await execStdout(cwd, "gh", ["pr", "diff", String(prNumber), "--name-only"]);
	if (ghOut.trim()) {
		return ghOut.split("\n").map((line) => line.trim()).filter(Boolean);
	}
	const gitOut = await execStdout(cwd, "git", ["diff", "--name-only", `${baseRefName}...HEAD`]);
	return gitOut.split("\n").map((line) => line.trim()).filter(Boolean);
}

export async function rerunFailedJobs(cwd: string, runId: number): Promise<boolean> {
	const result = await runExec(cwd, "gh", ["run", "rerun", String(runId), "--failed"], 30000);
	return result.code === 0;
}

export async function readContextLines(cwd: string, relPath: string, aroundLine: number, radius: number): Promise<string> {
	try {
		const absolute = join(cwd, relPath);
		const src = await readFile(absolute, "utf8");
		const lines = src.split("\n");
		const line = Math.max(1, aroundLine);
		const start = Math.max(1, line - radius);
		const end = Math.min(lines.length, line + radius);
		const out: string[] = [];
		for (let i = start; i <= end; i++) {
			const marker = i === line ? ">" : " ";
			out.push(`${marker}${String(i).padStart(4, " ")} | ${lines[i - 1] ?? ""}`);
		}
		return out.join("\n");
	} catch {
		return "";
	}
}

const CHAOS_SIGNATURE = "\n\n---\n_Posted by CHAOS (Chaotically Helpful Autonomous Operating System) on behalf of @frm_";

export async function postReply(cwd: string, prNumber: number, commentId: number, body: string): Promise<boolean> {
	const signed = body + CHAOS_SIGNATURE;
	const result = await runExec(
		cwd,
		"gh",
		["api", `repos/{owner}/{repo}/pulls/${prNumber}/comments/${commentId}/replies`, "-f", `body=${signed}`],
		20000,
	);
	return result.code === 0;
}

export async function execStdout(cwd: string, cmd: string, args: string[]): Promise<string> {
	const result = await runExec(cwd, cmd, args, 20000);
	return result.code === 0 ? result.stdout : "";
}

export async function runExec(
	cwd: string,
	cmd: string,
	args: string[],
	timeout: number,
): Promise<{ code: number; stdout: string; stderr: string }> {
	return await new Promise((resolve) => {
		const child = spawn(cmd, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
		const timer = setTimeout(() => {
			child.kill("SIGTERM");
		}, timeout);

		let stdout = "";
		let stderr = "";

		child.stdout.on("data", (data: Buffer) => {
			stdout += data.toString();
		});
		child.stderr.on("data", (data: Buffer) => {
			stderr += data.toString();
		});

		child.on("error", (err) => {
			clearTimeout(timer);
			resolve({ code: 1, stdout: "", stderr: String(err) });
		});
		child.on("close", (code) => {
			clearTimeout(timer);
			resolve({ code: code ?? 1, stdout, stderr });
		});
	});
}
