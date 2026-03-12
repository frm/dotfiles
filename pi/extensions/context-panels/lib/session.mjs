import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { tmuxRun, tmuxQuery, tmuxFormat } from "./tmux.mjs";

const PIPE = ["pipe", "pipe", "pipe"];

export function computeSessionName() {
	let input;
	try {
		const sessionPath = tmuxFormat("#{session_path}");
		const commonDir = execFileSync("git", ["rev-parse", "--git-common-dir"], {
			encoding: "utf-8", cwd: sessionPath, timeout: 3000, stdio: PIPE,
		}).trim();
		input = resolve(sessionPath, commonDir);
	} catch {
		try {
			input = tmuxFormat("#{session_name}");
		} catch { return null; }
	}
	const hash = createHash("md5").update(input).digest("hex").slice(0, 8);
	return `_pi_state_${hash}`;
}

export function isSessionAlive(name) {
	try {
		execFileSync("tmux", ["has-session", "-t", `=${name}`], { timeout: 3000, stdio: PIPE });
		const output = tmuxQuery("list-panes", "-s", "-t", `=${name}`, "-F", "#{pane_dead}");
		return output.trim().split("\n").some(line => line.trim() !== "1");
	} catch { return false; }
}

export function ensureSession(name, cmd, cwd) {
	if (isSessionAlive(name)) return;
	// Kill broken session if it exists
	try { tmuxRun("kill-session", "-t", `=${name}`); } catch {}
	execFileSync("tmux", [
		"new-session", "-d", "-s", name, "-c", cwd || ".", cmd,
	], { timeout: 5000, stdio: PIPE });
	try { tmuxRun("set-option", "-t", name, "status", "off"); } catch {}
	try { tmuxRun("set-option", "-t", name, "focus-events", "on"); } catch {}
	try { tmuxRun("set-option", "-t", name, "window-size", "latest"); } catch {}
}

export function getSessionPanePid(name) {
	try {
		const pid = tmuxQuery("list-panes", "-s", "-t", `=${name}`, "-F", "#{pane_pid}");
		const first = pid.trim().split("\n")[0];
		return first ? parseInt(first) : null;
	} catch { return null; }
}

export function setSessionOption(name, key, value) {
	try { tmuxRun("set-option", "-t", name, `@${key}`, value); } catch {}
}

export function getSessionOption(name, key) {
	try {
		return tmuxQuery("show-option", "-v", "-t", name, `@${key}`) || null;
	} catch { return null; }
}
