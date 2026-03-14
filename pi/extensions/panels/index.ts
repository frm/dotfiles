import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { ghState } from "../lib/gh/index.ts";
import { join, resolve } from "path";
import { homedir } from "os";
import { fileURLToPath } from "url";
import { existsSync, readFileSync } from "fs";
import { execFileSync } from "child_process";
import { createHash } from "crypto";
import { tmuxRun, tmuxQuery, tmuxFormat, isSessionAlive, ensureSession, getSessionPanePid, setSessionOption } from "./lib/tmux.ts";
import { isGitRepo, getGitRoot, gitCommonDir } from "./lib/git.ts";

// ─── Tmux Pane Border Helpers ─────────────────────────────────────────────────

function getTerminalBg(): string | null {
	try {
		const theme = tmuxQuery("show-options", "-gv", "@powerkit_theme");
		const variant = tmuxQuery("show-options", "-gv", "@powerkit_theme_variant");
		const themeFile = join(homedir(), ".tmux/plugins/tmux-powerkit/src/themes", theme, `${variant}.sh`);
		if (!existsSync(themeFile)) return null;
		const content = readFileSync(themeFile, "utf-8");
		const match = content.match(/\[background\]="(#[0-9a-fA-F]{6})"/);
		return match ? match[1] : null;
	} catch { return null; }
}

function hidePaneBorders(windowTarget: string) {
	const bg = getTerminalBg();
	if (!bg) return;
	try {
		tmuxRun("set-option", "-w", "-t", windowTarget, "pane-border-style", `fg=${bg}`);
		tmuxRun("set-option", "-w", "-t", windowTarget, "pane-active-border-style", `fg=${bg}`);
	} catch {}
}

function restorePaneBorders(windowTarget: string) {
	try {
		tmuxRun("set-option", "-wu", "-t", windowTarget, "pane-border-style");
		tmuxRun("set-option", "-wu", "-t", windowTarget, "pane-active-border-style");
	} catch {}
}

// ─── Shared Session Helpers ──────────────────────────────────────────────────

function computeSessionName(): string | null {
	let input: string;
	try {
		const sessionPath = tmuxFormat("#{session_path}");
		input = resolve(sessionPath, gitCommonDir(sessionPath));
	} catch {
		try { input = tmuxFormat("#{session_name}"); }
		catch { return null; }
	}
	return `_pi_state_${createHash("md5").update(input).digest("hex").slice(0, 8)}`;
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

	function create(targetPaneId?: string): string | null {
		if (config.guard && !config.guard()) return null;
		kill();
		if (!existsSync(config.script)) return `Panel script not found: ${config.script}`;
		try {
			const piPaneId = targetPaneId ?? tmuxFormat("#{pane_id}");
			const splitFlag = config.side === "left" ? "-hbd" : "-hd";
			const cmd = `${process.execPath} ${config.script} --pi-pane ${piPaneId}`;
			paneId = tmuxQuery("split-window", splitFlag, "-t", piPaneId, "-l", config.size, "-P", "-F", "#{pane_id}", cmd);
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

	function create(targetPaneId?: string): string | null {
		kill();
		if (!sessionName) sessionName = computeSessionName();
		if (!sessionName) return "Could not determine shared session name";
		if (!existsSync(config.script)) return `Panel script not found: ${config.script}`;
		try {
			const piPaneId = targetPaneId ?? tmuxFormat("#{pane_id}");
			const sessionPath = tmuxFormat("#{session_path}");
			const cmd = `${process.execPath} ${config.script} --shared --session ${sessionName}`;
			ensureSession(sessionName, cmd, sessionPath);
			setSessionOption(sessionName, "pi_active_pane", piPaneId);
			const attachCmd = `TMUX= exec tmux attach-session -t '=${sessionName}'`;
			const splitFlag = config.side === "left" ? "-hbd" : "-hd";
			paneId = tmuxQuery("split-window", splitFlag, "-t", piPaneId, "-l", config.size, "-P", "-F", "#{pane_id}", attachCmd);
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

	function focus(callerPaneId?: string) {
		if (!isPaneAlive()) return;
		if (sessionName && callerPaneId) {
			setSessionOption(sessionName, "pi_active_pane", callerPaneId);
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

export default function panels(pi: ExtensionAPI) {
	let extensionDir: string;
	try {
		extensionDir = join(fileURLToPath(import.meta.url), "..");
	} catch {
		extensionDir = __dirname;
	}

	const global = createGlobalPaneManager({
		script: join(extensionDir, "panes", "global.mjs"),
		side: "left",
		size: "22%",
	});

	const local = createPaneManager({
		script: join(extensionDir, "panes", "local.mjs"),
		side: "right",
		size: "22%",
		guard: isGitRepo,
	});

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

	// TMUX_PANE is set by tmux per-pane at creation and never changes,
	// so it always refers to pi's pane regardless of which window is focused.
	const piPaneId: string | null = process.env.TMUX_PANE ?? null;

	pi.on("session_start", async (_event, ctx) => {
		detectTmuxWindow();
		clearPiState();
		if (!ctx.hasUI) return;
		const globalErr = global.create(piPaneId ?? undefined);
		if (globalErr) ctx.ui.notify(`Global panel: ${globalErr}`, "error");
		local.create(piPaneId ?? undefined);
		if (tmuxWindowTarget) hidePaneBorders(tmuxWindowTarget);
		// Start gh after panels are open — don't block panel creation
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
		if (tmuxWindowTarget) restorePaneBorders(tmuxWindowTarget);
		global.kill();
		local.kill();
		ghState.stop();
	});

	// ─── Commands ────────────────────────────────────────────────────────

	pi.registerCommand("global", {
		description: "Toggle global panel",
		handler: async (_args, ctx) => {
			if (global.isPaneAlive()) global.kill();
			else {
				const err = global.create();
				if (err) ctx.ui.notify(`Global panel: ${err}`, "error");
			}
		},
	});

	pi.registerCommand("local", {
		description: "Toggle local panel",
		handler: async () => {
			if (local.isPaneAlive()) local.kill();
			else local.create();
		},
	});

	pi.registerCommand("panels", {
		description: "Reset panels to default sizes",
		handler: async () => {
			global.resize();
			local.resize();
		},
	});

	// ─── Shortcuts ───────────────────────────────────────────────────────

	pi.registerShortcut("alt+g", {
		description: "Toggle global panel",
		handler: async (_ctx) => {
			if (global.isPaneAlive()) global.kill();
			else global.create(piPaneId ?? undefined);
		},
	});

	pi.registerShortcut("alt+l", {
		description: "Toggle local panel",
		handler: async () => {
			if (local.isPaneAlive()) local.kill();
			else local.create(piPaneId ?? undefined);
		},
	});

	// ─── Popup Shortcuts ─────────────────────────────────────────────────

	function popupSessionName(prefix: string, root: string): string {
		return `${prefix}-${createHash("sha256").update(root).digest("hex").slice(0, 8)}`;
	}

	function openPopup(name: string, cmd: string, cwd: string): void {
		if (!isSessionAlive(name)) {
			try { tmuxRun("kill-session", "-t", `=${name}`); } catch {}
			ensureSession(name, cmd, cwd);
		}
		try {
			tmuxRun("popup", "-E", "-w", "90%", "-h", "90%", "-d", cwd,
				`tmux attach-session -t '=${name}' \\; set status off`);
		} catch {}
	}

	pi.registerShortcut("alt+t", {
		description: "Toggle terminal popup",
		handler: async () => {
			const root = getGitRoot();
			if (!root) return;
			openPopup(popupSessionName("pi-term", root), process.env.SHELL || "bash", root);
		},
	});

	pi.registerShortcut("alt+v", {
		description: "Toggle nvim popup",
		handler: async () => {
			const root = getGitRoot();
			if (!root) return;
			const name = popupSessionName("pi-nvim", root);
			openPopup(name, `nvim --listen '/tmp/${name}.sock'`, root);
		},
	});
}
