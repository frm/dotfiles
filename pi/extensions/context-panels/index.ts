import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { execFileSync } from "child_process";
import { ghState } from "../lib/gh-state/index.ts";
import { join, resolve } from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";
import { createHash } from "crypto";

// ─── Tmux Helpers ────────────────────────────────────────────────────────────

const PIPE = { stdio: ["pipe", "pipe", "pipe"] as const };
const PIPE_UTF8 = { encoding: "utf-8" as const, ...PIPE };

function tmuxRun(...args: string[]): void {
	execFileSync("tmux", args, PIPE);
}

function tmuxQuery(...args: string[]): string {
	return execFileSync("tmux", args, PIPE_UTF8).trim();
}

function tmuxFormat(format: string, target?: string): string {
	const args = ["display-message"];
	if (target) args.push("-t", target);
	args.push("-p", format);
	return tmuxQuery(...args);
}

// ─── Shared Session Helpers ──────────────────────────────────────────────────

function computeSessionName(): string | null {
	let input: string;
	try {
		const sessionPath = tmuxFormat("#{session_path}");
		const commonDir = execFileSync("git", ["rev-parse", "--git-common-dir"], {
			encoding: "utf-8" as const, cwd: sessionPath, timeout: 3000, ...PIPE,
		}).trim();
		input = resolve(sessionPath, commonDir);
	} catch {
		try { input = tmuxFormat("#{session_name}"); }
		catch { return null; }
	}
	return `_pi_state_${createHash("md5").update(input).digest("hex").slice(0, 8)}`;
}

function isSessionAlive(name: string): boolean {
	try {
		execFileSync("tmux", ["has-session", "-t", `=${name}`], { timeout: 3000, ...PIPE });
		const output = tmuxQuery("list-panes", "-s", "-t", `=${name}`, "-F", "#{pane_dead}");
		return output.trim().split("\n").some(line => line.trim() !== "1");
	} catch { return false; }
}

function ensureSession(name: string, cmd: string, cwd: string): void {
	if (isSessionAlive(name)) return;
	try { tmuxRun("kill-session", "-t", `=${name}`); } catch {}
	execFileSync("tmux", [
		"new-session", "-d", "-s", name, "-c", cwd || ".", cmd,
	], { timeout: 5000, ...PIPE });
	try { tmuxRun("set-option", "-t", name, "status", "off"); } catch {}
	try { tmuxRun("set-option", "-t", name, "focus-events", "on"); } catch {}
	try { tmuxRun("set-option", "-t", name, "window-size", "latest"); } catch {}
}

function getSessionPanePid(name: string): number | null {
	try {
		const pid = tmuxQuery("list-panes", "-s", "-t", `=${name}`, "-F", "#{pane_pid}");
		const first = pid.trim().split("\n")[0];
		return first ? parseInt(first) : null;
	} catch { return null; }
}

function setSessionOption(name: string, key: string, value: string): void {
	try { tmuxRun("set-option", "-t", name, `@${key}`, value); } catch {}
}

// ─── Pane Manager ────────────────────────────────────────────────────────────

interface PaneConfig {
	script: string;
	side: "left" | "right";
	size: string;
	guard?: () => boolean;
}

function createPaneManager(config: PaneConfig) {
	let paneId: string | null = null;

	function isPaneAlive(): boolean {
		if (!paneId) return false;
		try {
			const info = tmuxFormat("#{pane_dead} #{pane_current_command}", paneId);
			if (info.startsWith("1") || !info.includes("node")) {
				try { tmuxRun("kill-pane", "-t", paneId); } catch {}
				paneId = null;
				return false;
			}
			return true;
		} catch {
			paneId = null;
			return false;
		}
	}

	function create(): string | null {
		if (config.guard && !config.guard()) return null;
		kill();
		if (!existsSync(config.script)) return `Panel script not found: ${config.script}`;
		try {
			const piPaneId = tmuxFormat("#{pane_id}");
			const splitFlag = config.side === "left" ? "-hbd" : "-hd";
			const cmd = `${process.execPath} ${config.script} --pi-pane ${piPaneId}`;
			paneId = tmuxQuery("split-window", splitFlag, "-l", config.size, "-P", "-F", "#{pane_id}", cmd);
			return null;
		} catch (e: any) {
			paneId = null;
			return e.message ?? "Unknown error creating pane";
		}
	}

	function kill() {
		if (!paneId) return;
		try { tmuxRun("kill-pane", "-t", paneId); } catch {}
		paneId = null;
	}

	function focus() {
		if (!isPaneAlive()) return;
		try { tmuxRun("select-pane", "-t", paneId!); } catch {}
	}

	function isFocused(): boolean {
		if (!isPaneAlive()) return false;
		try { return tmuxFormat("#{pane_id}") === paneId; } catch { return false; }
	}

	function signal() {
		if (!isPaneAlive()) return;
		try {
			const pid = tmuxFormat("#{pane_pid}", paneId!);
			if (pid) process.kill(parseInt(pid), "SIGUSR1");
		} catch {}
	}

	function resize() {
		if (!isPaneAlive()) return;
		try { tmuxRun("resize-pane", "-t", paneId!, config.side === "left" ? "-x" : "-x", config.size); } catch {}
	}

	return { isPaneAlive, create, kill, focus, isFocused, signal, resize };
}

// ─── Shared Global Pane Manager ──────────────────────────────────────────────

function createGlobalPaneManager(config: PaneConfig) {
	let paneId: string | null = null;
	let sessionName: string | null = null;

	function isPaneAlive(): boolean {
		if (!paneId) return false;
		try {
			const dead = tmuxFormat("#{pane_dead}", paneId);
			if (dead === "1") {
				try { tmuxRun("kill-pane", "-t", paneId); } catch {}
				paneId = null;
				return false;
			}
			if (sessionName && !isSessionAlive(sessionName)) {
				try { tmuxRun("kill-pane", "-t", paneId); } catch {}
				paneId = null;
				return false;
			}
			return true;
		} catch {
			paneId = null;
			return false;
		}
	}

	function create(): string | null {
		kill();
		if (!sessionName) sessionName = computeSessionName();
		if (!sessionName) return "Could not determine shared session name";
		if (!existsSync(config.script)) return `Panel script not found: ${config.script}`;
		try {
			const piPaneId = tmuxFormat("#{pane_id}");
			const sessionPath = tmuxFormat("#{session_path}");
			const cmd = `${process.execPath} ${config.script} --shared --session ${sessionName}`;
			ensureSession(sessionName, cmd, sessionPath);
			setSessionOption(sessionName, "pi_active_pane", piPaneId);
			const attachCmd = `TMUX= exec tmux attach-session -t '=${sessionName}'`;
			const splitFlag = config.side === "left" ? "-hbd" : "-hd";
			paneId = tmuxQuery("split-window", splitFlag, "-l", config.size, "-P", "-F", "#{pane_id}", attachCmd);
			return null;
		} catch (e: any) {
			paneId = null;
			return e.message ?? "Unknown error creating pane";
		}
	}

	function kill() {
		if (!paneId) return;
		try { tmuxRun("kill-pane", "-t", paneId); } catch {}
		paneId = null;
	}

	function focus() {
		if (!isPaneAlive()) return;
		if (sessionName) {
			const piPaneId = tmuxFormat("#{pane_id}");
			setSessionOption(sessionName, "pi_active_pane", piPaneId);
		}
		try { tmuxRun("select-pane", "-t", paneId!); } catch {}
	}

	function isFocused(): boolean {
		if (!isPaneAlive()) return false;
		try { return tmuxFormat("#{pane_id}") === paneId; } catch { return false; }
	}

	function signal() {
		if (!sessionName || !isSessionAlive(sessionName)) return;
		try {
			const pid = getSessionPanePid(sessionName);
			if (pid) process.kill(pid, "SIGUSR1");
		} catch {}
	}

	function resize() {
		if (!isPaneAlive()) return;
		try { tmuxRun("resize-pane", "-t", paneId!, "-x", config.size); } catch {}
	}

	return { isPaneAlive, create, kill, focus, isFocused, signal, resize };
}

// ─── Extension ───────────────────────────────────────────────────────────────

export default function contextPanels(pi: ExtensionAPI) {
	let extensionDir: string;
	try {
		extensionDir = join(fileURLToPath(import.meta.url), "..");
	} catch {
		extensionDir = __dirname;
	}

	function isGitRepo(): boolean {
		try {
			execFileSync("git", ["rev-parse", "--is-inside-work-tree"], { timeout: 3000, ...PIPE_UTF8 });
			return true;
		} catch { return false; }
	}

	const global = createGlobalPaneManager({
		script: join(extensionDir, "panels", "global.mjs"),
		side: "left",
		size: "22%",
	});

	const local = createPaneManager({
		script: join(extensionDir, "panels", "local.mjs"),
		side: "right",
		size: "22%",
		guard: isGitRepo,
	});

	function focusPi() {
		try { tmuxRun("select-pane", "-t", tmuxFormat("#{pane_id}")); } catch {}
	}

	// ─── Pi State Tracking ───────────────────────────────────────────────

	let tmuxWindowTarget: string | null = null;

	function detectTmuxWindow() {
		try {
			tmuxWindowTarget = tmuxFormat("#{session_name}:#{window_index}") || null;
		} catch { tmuxWindowTarget = null; }
	}

	function setPiState(state: "idle" | "question") {
		if (!tmuxWindowTarget) return;
		try { tmuxRun("set-option", "-w", "-t", tmuxWindowTarget, "@pi_state", state); } catch {}
		global.signal();
	}

	function clearPiState() {
		if (!tmuxWindowTarget) return;
		try { tmuxRun("set-option", "-wu", "-t", tmuxWindowTarget, "@pi_state"); } catch {}
		global.signal();
	}

	const INPUT_TOOLS = new Set(["questionnaire", "present_plan", "confirm", "select"]);
	let subagentDepth = 0;

	pi.on("tool_execution_start", async (event) => {
		if (event.toolName === "subagent") { subagentDepth++; return; }
		if (subagentDepth > 0) return;
		if (INPUT_TOOLS.has(event.toolName)) setPiState("question");
	});

	pi.on("tool_result", async (event) => {
		if (event.toolName === "subagent") subagentDepth = Math.max(0, subagentDepth - 1);
	});

	pi.on("agent_end", async () => {
		if (subagentDepth > 0) return;
		setPiState("idle");
	});

	// ─── Lifecycle ───────────────────────────────────────────────────────

	pi.on("session_start", async (_event, ctx) => {
		detectTmuxWindow();
		clearPiState();
		if (!ctx.hasUI) return;
		const globalErr = global.create();
		if (globalErr) ctx.ui.notify(`Global panel: ${globalErr}`, "error");
		local.create();
		// Start gh-state after panels are open — don't block panel creation
		ghState.start(pi, ctx.cwd).catch(() => {});
	});

	pi.on("session_switch", async (_event, ctx) => {
		if (!ctx.hasUI) return;
		if (global.isPaneAlive()) global.signal();
		else global.create();
		if (local.isPaneAlive()) local.signal();
		else local.create();
	});

	pi.on("session_shutdown", async () => {
		clearPiState();
		global.kill();
		local.kill();
		ghState.stop();
	});

	// ─── Commands ────────────────────────────────────────────────────────

	pi.registerCommand("worktrees", {
		description: "Manage worktree panel (show/hide/refresh)",
		handler: async (args, ctx) => {
			const sub = args?.trim().toLowerCase();
			if (sub === "hide") return global.kill();
			if (sub === "refresh") return global.signal();
			if (sub === "show") {
				if (!global.isPaneAlive()) {
					const err = global.create();
					if (err) ctx.ui.notify(`Global panel: ${err}`, "error");
				}
				return;
			}
			if (global.isPaneAlive()) global.kill();
			else {
				const err = global.create();
				if (err) ctx.ui.notify(`Global panel: ${err}`, "error");
			}
		},
	});

	pi.registerCommand("context-panels", {
		description: "Manage context panels (reset to default sizes)",
		handler: async (_args, _ctx) => {
			global.resize();
			local.resize();
		},
	});

	pi.registerCommand("git-panel", {
		description: "Manage git panel (show/hide/refresh)",
		handler: async (args) => {
			const sub = args?.trim().toLowerCase();
			if (sub === "hide") return local.kill();
			if (sub === "refresh") return local.signal();
			if (sub === "show") { if (!local.isPaneAlive()) local.create(); return; }
			if (local.isPaneAlive()) local.kill();
			else local.create();
		},
	});

	// ─── Shortcuts ───────────────────────────────────────────────────────

	pi.registerShortcut("ctrl+shift+w", {
		description: "Toggle worktree panel",
		handler: async (ctx) => {
			if (!global.isPaneAlive()) {
				const err = global.create();
				if (err) ctx.ui.notify(`Global panel: ${err}`, "error");
				return;
			}
			if (global.isFocused()) focusPi();
			else global.focus();
		},
	});

	pi.registerShortcut("ctrl+shift+g", {
		description: "Toggle git panel focus",
		handler: async () => {
			if (!local.isPaneAlive()) { local.create(); return; }
			if (local.isFocused()) focusPi();
			else local.focus();
		},
	});
}
