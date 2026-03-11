import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { execFileSync } from "child_process";
import { join } from "path";
import { fileURLToPath } from "url";
import { mkdirSync, writeFileSync, unlinkSync, existsSync } from "fs";

const STATE_DIR = join(process.env.TMPDIR ?? "/tmp", "pi_panel_state");

function sanitizePath(p: string): string {
	return p.replace(/\//g, "_");
}

export default function worktreePanel(pi: ExtensionAPI) {
	let paneId: string | null = null;
	let stateFile: string | null = null;
	let extensionDir: string;
	try {
		extensionDir = join(fileURLToPath(import.meta.url), "..");
	} catch {
		extensionDir = __dirname;
	}
	const panelScript = join(extensionDir, "panel.mjs");
	const nodeExec = process.execPath;

	function writeState(state: "idle" | "question") {
		if (!stateFile) return;
		try {
			mkdirSync(STATE_DIR, { recursive: true });
			writeFileSync(stateFile, state, "utf-8");
		} catch {}
		signalRefresh();
	}

	function clearState() {
		if (!stateFile) return;
		try {
			unlinkSync(stateFile);
		} catch {}
		signalRefresh();
	}

	function isPaneAlive(): boolean {
		if (!paneId) return false;
		try {
			// Check pane exists and its process is alive
			const info = execFileSync("tmux", ["display-message", "-t", paneId, "-p", "#{pane_dead} #{pane_current_command}"], {
				encoding: "utf-8",
				stdio: ["pipe", "pipe", "pipe"],
			}).trim();
			const dead = info.startsWith("1");
			const isNode = info.includes("node");
			if (dead || !isNode) {
				try {
					execFileSync("tmux", ["kill-pane", "-t", paneId], { stdio: ["pipe", "pipe", "pipe"] });
				} catch {}
				paneId = null;
				return false;
			}
			return true;
		} catch {
			paneId = null;
			return false;
		}
	}

	function getCurrentPaneId(): string {
		return execFileSync("tmux", ["display-message", "-p", "#{pane_id}"], {
			encoding: "utf-8",
			stdio: ["pipe", "pipe", "pipe"],
		}).trim();
	}

	function createPane(): string | null {
		// Kill existing panel pane if tracked
		if (paneId) {
			try {
				execFileSync("tmux", ["kill-pane", "-t", paneId], {
					stdio: ["pipe", "pipe", "pipe"],
				});
			} catch {}
			paneId = null;
		}

		if (!existsSync(panelScript)) {
			return `Panel script not found: ${panelScript}`;
		}

		try {
			const piPaneId = getCurrentPaneId();
			const cmd = `${nodeExec} ${panelScript} --pi-pane ${piPaneId}`;
			paneId = execFileSync(
				"tmux",
				[
					"split-window", "-hbd", "-l", "22%",
					"-P", "-F", "#{pane_id}",
					cmd,
				],
				{ encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
			).trim();
			return null;
		} catch (e: any) {
			paneId = null;
			return e.message ?? "Unknown error creating pane";
		}
	}

	function killPane() {
		if (paneId) {
			try {
				execFileSync("tmux", ["kill-pane", "-t", paneId], {
					stdio: ["pipe", "pipe", "pipe"],
				});
			} catch {}
			paneId = null;
		}
	}

	function focusPane() {
		if (!isPaneAlive()) return;
		try {
			execFileSync("tmux", ["select-pane", "-t", paneId!], {
				stdio: ["pipe", "pipe", "pipe"],
			});
		} catch {}
	}

	function focusPi() {
		try {
			const piPaneId = getCurrentPaneId();
			execFileSync("tmux", ["select-pane", "-t", piPaneId], {
				stdio: ["pipe", "pipe", "pipe"],
			});
		} catch {}
	}

	function isPaneFocused(): boolean {
		if (!isPaneAlive()) return false;
		try {
			const activePaneId = execFileSync(
				"tmux",
				["display-message", "-p", "#{pane_id}"],
				{ encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
			).trim();
			return activePaneId === paneId;
		} catch {
			return false;
		}
	}

	function signalRefresh() {
		if (!isPaneAlive()) return;
		try {
			const pid = execFileSync(
				"tmux",
				["display-message", "-t", paneId!, "-p", "#{pane_pid}"],
				{ encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
			).trim();
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
			writeState("question");
		}
	});

	pi.on("tool_result", async (event, _ctx) => {
		if (event.toolName === "subagent") {
			subagentDepth = Math.max(0, subagentDepth - 1);
		}
	});

	pi.on("agent_end", async (_event, _ctx) => {
		if (subagentDepth > 0) return;
		writeState("idle");
	});

	pi.on("input", async (_event, _ctx) => {
		clearState();
	});

	pi.on("before_agent_start", async (_event, _ctx) => {
		clearState();
	});

	// ─── Lifecycle ───────────────────────────────────────────────────────

	pi.on("session_start", async (_event, ctx) => {
		if (!ctx.hasUI) return;
		stateFile = join(STATE_DIR, sanitizePath(ctx.cwd));
		clearState();
		const err = createPane();
		if (err) ctx.ui.notify(`Worktree panel: ${err}`, "error");
	});

	pi.on("session_switch", async (_event, ctx) => {
		if (!ctx.hasUI) return;
		stateFile = join(STATE_DIR, sanitizePath(ctx.cwd));
		if (isPaneAlive()) {
			signalRefresh();
		} else {
			createPane();
		}
	});

	pi.on("session_shutdown", async () => {
		clearState();
		killPane();
	});

	pi.registerCommand("worktrees", {
		description: "Manage worktree panel (show/hide/refresh)",
		handler: async (args, ctx) => {
			const sub = args?.trim().toLowerCase();
			if (sub === "hide") {
				killPane();
				return;
			}

			if (sub === "show") {
				if (!isPaneAlive()) {
					const err = createPane();
					if (err) ctx.ui.notify(`Worktree panel: ${err}`, "error");
				}
				return;
			}

			if (sub === "refresh") {
				signalRefresh();
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
