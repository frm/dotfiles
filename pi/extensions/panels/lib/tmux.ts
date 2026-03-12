import { execFileSync } from "node:child_process";

const PIPE = ["pipe", "pipe", "pipe"];

export function tmuxRun(...args) {
	execFileSync("tmux", args, { timeout: 3000, stdio: PIPE });
}

export function tmuxQuery(...args) {
	let timeout = 3000;
	const last = args[args.length - 1];
	if (typeof last === "object" && last !== null) {
		args.pop();
		if (last.timeout) timeout = last.timeout;
	}
	return execFileSync("tmux", args, {
		timeout, encoding: "utf-8", stdio: PIPE,
	}).trim();
}

export function tmuxFormat(format, target) {
	const args = ["display-message"];
	if (target) args.push("-t", target);
	args.push("-p", format);
	return tmuxQuery(...args);
}

export function tmuxInteractive(...args) {
	execFileSync("tmux", args, { stdio: "inherit" });
}

export function tmuxHasSession(name) {
	try { execFileSync("tmux", ["has-session", "-t", `=${name}`], { timeout: 3000, stdio: PIPE }); return true; }
	catch { return false; }
}

export function tmuxNewSession(name, cmd, cwd, opts = {}) {
	execFileSync("tmux", ["new-session", "-d", "-s", name, "-c", cwd, cmd], { timeout: 5000, stdio: PIPE });
	if (opts.noStatus) {
		try { execFileSync("tmux", ["set-option", "-t", `=${name}`, "status", "off"], { timeout: 3000, stdio: PIPE }); } catch {}
	}
}

export function tmuxKillSession(name) {
	try {
		// Get the PID of the shell running in the session's first pane so we can
		// kill the entire process tree.  Phoenix watchers (storybook, vite, etc.)
		// spawn in their own process groups and won't receive the SIGHUP that
		// tmux sends when it destroys a session, leaving orphaned processes.
		const pid = execFileSync("tmux", [
			"list-panes", "-t", `=${name}`, "-F", "#{pane_pid}",
		], { timeout: 3000, encoding: "utf-8", stdio: PIPE }).trim().split("\n")[0];

		if (pid) {
			killProcessTree(parseInt(pid));
		}
	} catch {
		// Session may already be gone
	}

	try { execFileSync("tmux", ["kill-session", "-t", `=${name}`], { timeout: 3000, stdio: PIPE }); } catch {}
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

function killProcessTree(rootPid) {
	// Collect all descendants first, then kill leaf-to-root so children don't
	// get re-parented before we can find them.
	const pids = [];

	function collectChildren(parentPid) {
		let children;
		try {
			children = execFileSync("pgrep", ["-P", String(parentPid)], {
				timeout: 3000, encoding: "utf-8", stdio: PIPE,
			}).trim().split("\n").filter(Boolean).map(Number);
		} catch { return; }

		for (const child of children) {
			collectChildren(child);
			pids.push(child);
		}
	}

	collectChildren(rootPid);
	pids.push(rootPid);

	for (const pid of pids) {
		try { process.kill(pid, "SIGTERM"); } catch {}
	}
}
