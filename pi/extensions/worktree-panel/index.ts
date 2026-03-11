import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { execFileSync } from "child_process";
import { join } from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

// ─── tmux helpers ────────────────────────────────────────────────────────────

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

// ─── Extension ───────────────────────────────────────────────────────────────

export default function worktreePanel(pi: ExtensionAPI) {
	let paneId: string | null = null;
	let tmuxWindowTarget: string | null = null;

	let extensionDir: string;
	try {
		extensionDir = join(fileURLToPath(import.meta.url), "..");
	} catch {
		extensionDir = __dirname;
	}
	const panelScript = join(extensionDir, "panel.mjs");
	const nodeExec = process.execPath;

	// ─── Pi State ────────────────────────────────────────────────────────

	function detectTmuxWindow() {
		try {
			tmuxWindowTarget = tmuxFormat("#{session_name}:#{window_index}") || null;
		} catch {
			tmuxWindowTarget = null;
		}
	}

	function setPiState(state: "idle" | "question") {
		if (!tmuxWindowTarget) return;
		try {
			tmuxRun("set-option", "-w", "-t", tmuxWindowTarget, "@pi_state", state);
		} catch {}
		signalRefresh();
	}

	function clearPiState() {
		if (!tmuxWindowTarget) return;
		try {
			tmuxRun("set-option", "-wu", "-t", tmuxWindowTarget, "@pi_state");
		} catch {}
		signalRefresh();
	}

	// ─── Pane Lifecycle ──────────────────────────────────────────────────

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

	function createPane(): string | null {
		if (paneId) {
			try { tmuxRun("kill-pane", "-t", paneId); } catch {}
			paneId = null;
		}

		if (!existsSync(panelScript)) {
			return `Panel script not found: ${panelScript}`;
		}

		try {
			const piPaneId = tmuxFormat("#{pane_id}");
			const cmd = `${nodeExec} ${panelScript} --pi-pane ${piPaneId}`;
			paneId = tmuxQuery(
				"split-window", "-hbd", "-l", "22%",
				"-P", "-F", "#{pane_id}",
				cmd,
			);
			return null;
		} catch (e: any) {
			paneId = null;
			return e.message ?? "Unknown error creating pane";
		}
	}

	function killPane() {
		if (!paneId) return;
		try { tmuxRun("kill-pane", "-t", paneId); } catch {}
		paneId = null;
	}

	function focusPane() {
		if (!isPaneAlive()) return;
		try { tmuxRun("select-pane", "-t", paneId!); } catch {}
	}

	function focusPi() {
		try { tmuxRun("select-pane", "-t", tmuxFormat("#{pane_id}")); } catch {}
	}

	function isPaneFocused(): boolean {
		if (!isPaneAlive()) return false;
		try {
			return tmuxFormat("#{pane_id}") === paneId;
		} catch {
			return false;
		}
	}

	function signalRefresh() {
		if (!isPaneAlive()) return;
		try {
			const pid = tmuxFormat("#{pane_pid}", paneId!);
			if (pid) process.kill(parseInt(pid), "SIGUSR1");
		} catch {}
	}

	// ─── State Detection ─────────────────────────────────────────────────

	const INPUT_TOOLS = new Set(["questionnaire", "present_plan", "confirm", "select"]);
	let subagentDepth = 0;

	pi.on("tool_execution_start", async (event, _ctx) => {
		if (event.toolName === "subagent") {
			subagentDepth++;
			return;
		}
		if (subagentDepth > 0) return;
		if (INPUT_TOOLS.has(event.toolName)) {
			setPiState("question");
		}
	});

	pi.on("tool_result", async (event, _ctx) => {
		if (event.toolName === "subagent") {
			subagentDepth = Math.max(0, subagentDepth - 1);
		}
	});

	pi.on("agent_end", async (_event, _ctx) => {
		if (subagentDepth > 0) return;
		setPiState("idle");
	});

	// ─── Lifecycle ───────────────────────────────────────────────────────

	pi.on("session_start", async (_event, ctx) => {
		detectTmuxWindow();
		clearPiState();
		if (!ctx.hasUI) return;
		const err = createPane();
		if (err) ctx.ui.notify(`Worktree panel: ${err}`, "error");
	});

	pi.on("session_switch", async (_event, ctx) => {
		if (!ctx.hasUI) return;
		if (isPaneAlive()) {
			signalRefresh();
		} else {
			createPane();
		}
	});

	pi.on("session_shutdown", async () => {
		clearPiState();
		killPane();
	});

	// ─── Commands & Shortcuts ────────────────────────────────────────────

	pi.registerCommand("worktrees", {
		description: "Manage worktree panel (show/hide/refresh)",
		handler: async (args, ctx) => {
			const sub = args?.trim().toLowerCase();

			if (sub === "hide") return killPane();
			if (sub === "refresh") return signalRefresh();

			if (sub === "show") {
				if (!isPaneAlive()) {
					const err = createPane();
					if (err) ctx.ui.notify(`Worktree panel: ${err}`, "error");
				}
				return;
			}

			// Default: toggle
			if (isPaneAlive()) {
				killPane();
			} else {
				const err = createPane();
				if (err) ctx.ui.notify(`Worktree panel: ${err}`, "error");
			}
		},
	});

	pi.registerShortcut("ctrl+shift+w", {
		description: "Toggle worktree panel",
		handler: async (ctx) => {
			if (!isPaneAlive()) {
				const err = createPane();
				if (err) ctx.ui.notify(`Worktree panel: ${err}`, "error");
				return;
			}
			if (isPaneFocused()) {
				focusPi();
			} else {
				focusPane();
			}
		},
	});
}
