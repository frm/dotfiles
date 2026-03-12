import { fork } from "node:child_process";
import { tmuxRun, tmuxQuery } from "./tmux.mjs";
import {
	R, write,
	enterAltScreen, exitAltScreen, hideCursor, showCursor,
	enableFocusReporting, disableFocusReporting,
} from "./ui.mjs";

export function parsePiPaneId() {
	const idx = process.argv.indexOf("--pi-pane");
	return idx !== -1 ? process.argv[idx + 1] : null;
}

export function focusPiPane(piPaneId) {
	if (!piPaneId) return;
	try { tmuxRun("select-pane", "-t", piPaneId); } catch {}
}

export function forkWorker(selfPath, args, { onMessage, onDone, timeout = 30_000 } = {}) {
	const child = fork(selfPath, args, {
		stdio: ["pipe", "pipe", "pipe", "ipc"],
		timeout,
	});
	if (onMessage) child.on("message", onMessage);
	child.on("error", () => { if (onDone) onDone(); });
	child.on("exit", () => { if (onDone) onDone(); });
	return child;
}

export function setup({ onInput, onResize, onRefresh, delayFocus = 0 }) {
	enterAltScreen();
	hideCursor();
	if (delayFocus > 0) setTimeout(enableFocusReporting, delayFocus);
	else enableFocusReporting();
	process.stdin.setRawMode(true);
	process.stdin.resume();
	process.stdin.on("data", onInput);
	process.on("SIGWINCH", onResize);
	process.on("SIGTERM", quit);
	process.on("SIGINT", quit);
	if (onRefresh) process.on("SIGUSR1", onRefresh);
}

export function quit() {
	disableFocusReporting();
	exitAltScreen();
	showCursor();
	try { process.stdin.setRawMode(false); } catch {}
	process.stdin.pause();
	write(R);
	const myPane = process.env.TMUX_PANE;
	if (myPane) { try { tmuxRun("kill-pane", "-t", myPane); } catch {} }
	process.exit(0);
}

export function checkPiPane(piPaneId) {
	if (!piPaneId) return;
	try { tmuxQuery("display-message", "-t", piPaneId, "-p", ""); }
	catch { quit(); }
}


