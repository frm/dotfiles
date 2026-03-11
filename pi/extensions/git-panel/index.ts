import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { execFileSync } from "child_process";
import { join } from "path";
import { fileURLToPath } from "url";

export default function gitPanel(pi: ExtensionAPI) {
	let paneId: string | null = null;
	const extensionDir = join(fileURLToPath(import.meta.url), "..");
	const panelScript = join(extensionDir, "panel.mjs");
	const nodeExec = process.execPath;

	function isGitRepo(): boolean {
		try {
			execFileSync("git", ["rev-parse", "--is-inside-work-tree"], {
				timeout: 3000,
				encoding: "utf-8",
				stdio: ["pipe", "pipe", "pipe"],
			});
			return true;
		} catch {
			return false;
		}
	}

	function isPaneAlive(): boolean {
		if (!paneId) return false;
		try {
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

	function createPane() {
		if (!isGitRepo()) return;
		killPane();
		try {
			const piPaneId = getCurrentPaneId();
			paneId = execFileSync(
				"tmux",
				[
					"split-window", "-hd", "-l", "22%",
					"-P", "-F", "#{pane_id}",
					`"${nodeExec}" "${panelScript}" --pi-pane "${piPaneId}"`,
				],
				{ encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
			).trim();
		} catch {
			paneId = null;
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

	pi.on("session_start", async (_event, ctx) => {
		if (!ctx.hasUI) return;
		createPane();
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
		killPane();
	});

	pi.registerCommand("git-panel", {
		description: "Manage git panel (show/hide/refresh)",
		handler: async (args, _ctx) => {
			const sub = args?.trim().toLowerCase();

			if (sub === "hide") {
				killPane();
				return;
			}

			if (sub === "show") {
				if (!isPaneAlive()) createPane();
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
				createPane();
			}
		},
	});

	pi.registerShortcut("ctrl+shift+g", {
		description: "Toggle git panel focus",
		handler: async (_ctx) => {
			if (!isPaneAlive()) {
				createPane();
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
