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

// ─── Tmux/Shell Helpers ─────────────────────────────────────────────────────

export function tmux(...args) {
	return execFileSync("tmux", args, {
		timeout: 3000, encoding: "utf-8", stdio: PIPE,
	}).trim();
}

export function openUrl(url) {
	try { execFileSync("open", [url], { timeout: 3000, stdio: PIPE }); } catch {}
}
