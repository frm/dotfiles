import { execFileSync } from "node:child_process";
import { join } from "node:path";

const PIPE = ["pipe", "pipe", "pipe"];

// ─── Git Root ────────────────────────────────────────────────────────────────

export let gitRoot = "";
try {
	gitRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], {
		timeout: 3000, encoding: "utf-8", stdio: PIPE,
	}).trim();
} catch {
	gitRoot = process.cwd();
}

export function absPath(relPath) { return join(gitRoot, relPath); }

// ─── Git Helpers ─────────────────────────────────────────────────────────────

export function git(...args) {
	return execFileSync("git", args, {
		timeout: 5000, encoding: "utf-8", cwd: gitRoot, stdio: PIPE,
	}).replace(/\n$/, "");
}

export function gitRaw(...args) {
	return execFileSync("git", args, {
		timeout: 5000, cwd: gitRoot, stdio: PIPE,
	});
}

export function gitAt(cwd, ...args) {
	return execFileSync("git", args, {
		timeout: 5000, encoding: "utf-8", cwd, stdio: PIPE,
	}).trim();
}

export function gitCommonDir(cwd) {
	return gitAt(cwd, "rev-parse", "--git-common-dir");
}

export function gitRepoRoot(cwd) {
	const common = gitCommonDir(cwd);
	return common.endsWith("/.git") || common.endsWith("\\.git")
		? common.slice(0, -5)
		: common;
}

export function currentBranch(cwd) {
	return gitAt(cwd, "rev-parse", "--abbrev-ref", "HEAD");
}

export function branchExists(cwd, branch) {
	try {
		execFileSync("git", ["rev-parse", "--verify", branch], {
			timeout: 3000, cwd, stdio: PIPE,
		});
		return true;
	} catch { return false; }
}

export function worktreeDel(cwd, branch) {
	execFileSync("git", ["worktree-del", branch], {
		cwd, timeout: 30_000, encoding: "utf-8", stdio: PIPE,
	});
}

// ─── Shell Helpers ───────────────────────────────────────────────────────────

export function openUrl(url) {
	try { execFileSync("open", [url], { timeout: 3000, stdio: PIPE }); } catch {}
}

// ─── Repo Detection ──────────────────────────────────────────────────────────

export function isGitRepo(cwd) {
	try {
		execFileSync("git", ["rev-parse", "--is-inside-work-tree"], {
			timeout: 3000, ...(cwd ? { cwd } : {}), stdio: PIPE,
		});
		return true;
	} catch { return false; }
}

export function getGitRoot(cwd) {
	if (!isGitRepo(cwd)) return null;
	try {
		return execFileSync("git", ["rev-parse", "--show-toplevel"], {
			timeout: 3000, encoding: "utf-8", ...(cwd ? { cwd } : {}), stdio: PIPE,
		}).trim();
	} catch { return null; }
}
