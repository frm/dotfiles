#!/usr/bin/env node
import { execFileSync, fork } from "node:child_process";
import { fileURLToPath } from "node:url";

import { git, gitRaw, gitRoot, absPath, tmux, openUrl } from "./lib/git.mjs";
import {
	R, dim, bgCyan, bgMuted, write,
	enterAltScreen, exitAltScreen, hideCursor, showCursor,
	clearScreen, moveTo, visWidth,
	enableFocusReporting, disableFocusReporting, setPaneActive,
} from "./lib/ui.mjs";

import * as files from "./tabs/files.mjs";
import * as checks from "./tabs/checks.mjs";
import * as detail from "./tabs/detail.mjs";

// ─── Worker Mode ─────────────────────────────────────────────────────────────

const selfPath = fileURLToPath(import.meta.url);

if (process.argv.includes("--fetch-data")) {
	const changedFiles = files.fetchChangedFiles();
	const prInfo = checks.fetchPrInfo();
	process.send({ files: changedFiles, pr: prInfo });
	process.exit(0);
}

// ─── UI State ────────────────────────────────────────────────────────────────

let activeTab = "files";
let changedFiles = [];
let prInfo = null;
let selectedIdx = 0;
let scrollOffset = 0;
let loading = true;
let paneActive = false;

function currentListLength() {
	if (activeTab === "files") return files.buildNavItems(changedFiles).length;
	return prInfo?.checks?.length ?? 0;
}

function clampSelection() {
	const len = currentListLength();
	if (selectedIdx >= len) selectedIdx = Math.max(0, len - 1);
	if (selectedIdx < 0) selectedIdx = 0;
}

// ─── Tmux Popup ──────────────────────────────────────────────────────────────

function tmuxPopup(args) {
	process.stdin.setRawMode(false);
	process.stdin.pause();
	exitAltScreen();
	showCursor();
	try {
		execFileSync("tmux", ["popup", "-E", "-w", "90%", "-h", "90%", "-d", gitRoot, ...args], { stdio: "inherit" });
	} catch {}
	enterAltScreen();
	hideCursor();
	process.stdin.setRawMode(true);
	process.stdin.resume();
	render();
}

// ─── Refresh ─────────────────────────────────────────────────────────────────

let refreshing = false;

function doRefresh() {
	if (loading) {
		render();
		setTimeout(() => {
			changedFiles = files.fetchChangedFiles();
			prInfo = checks.fetchPrInfo();
			if (changedFiles.length === 0 && prInfo) activeTab = "checks";
			if (activeTab === "checks" && !prInfo) activeTab = "files";
			clampSelection();
			loading = false;
			render();
		}, 0);
		return;
	}
	if (refreshing) return;
	refreshing = true;

	// Save expanded paths
	const expandedPaths = new Set();
	function collectExpanded(nodes) {
		if (!nodes) return;
		for (const n of nodes) {
			if (n.expanded) {
				expandedPaths.add(n.path || n.fullPath);
				collectExpanded(n.children);
			}
		}
	}
	collectExpanded(changedFiles);

	const child = fork(selfPath, ["--fetch-data"], {
		stdio: ["pipe", "pipe", "pipe", "ipc"],
		timeout: 30_000,
	});
	child.on("message", (data) => {
		changedFiles = data.files;
		prInfo = data.pr;

		// Restore expansion
		function restoreExpansion(nodes) {
			if (!nodes) return;
			for (const n of nodes) {
				const p = n.path || n.fullPath;
				if (expandedPaths.has(p) && n.isDir) {
					n.expanded = true;
					n.children = files.listDirChildren(p);
					restoreExpansion(n.children);
				}
			}
		}
		restoreExpansion(changedFiles);

		if (activeTab === "checks" && !prInfo) activeTab = "files";
		clampSelection();
		refreshing = false;
		render();
	});
	child.on("error", () => { refreshing = false; });
	child.on("exit", () => { if (refreshing) refreshing = false; });
}

// ─── Rendering ───────────────────────────────────────────────────────────────

function render() {
	if (detail.active) { detail.render(); return; }

	const width = process.stdout.columns || 30;
	const height = process.stdout.rows || 24;
	const innerW = Math.max(1, width - 2);

	clearScreen();
	hideCursor();

	let row = 1;

	// Header
	const activeBg = paneActive ? bgCyan : bgMuted;
	const filesLabel = activeTab === "files" ? activeBg(" Changes ") : dim(" Changes ");
	const checksLabel = prInfo
		? (activeTab === "checks" ? activeBg(" Checks ") : dim(" Checks "))
		: "";
	const tabBar = filesLabel + (checksLabel ? dim("│") + checksLabel : "");
	const hFill = "─".repeat(Math.max(0, innerW - visWidth(tabBar)));
	moveTo(row++, 1);
	write(dim("╭") + tabBar + dim(hFill + "╮"));

	const contentHeight = Math.max(1, height - 2);
	let contentRow = 0;

	if (loading) {
		moveTo(row++, 1);
		const msg = dim(" Loading...");
		const pad = " ".repeat(Math.max(0, innerW - visWidth(msg)));
		write(dim("│") + msg + pad + dim("│"));
		contentRow++;
	} else if (activeTab === "files") {
		const navItems = files.buildNavItems(changedFiles);
		if (navItems.length === 0) {
			moveTo(row++, 1);
			const msg = dim(" Working tree clean");
			const pad = " ".repeat(Math.max(0, innerW - visWidth(msg)));
			write(dim("│") + msg + pad + dim("│"));
			contentRow++;
		} else {
			const maxVisible = Math.max(1, contentHeight);
			if (selectedIdx < scrollOffset) scrollOffset = selectedIdx;
			if (selectedIdx >= scrollOffset + maxVisible) scrollOffset = selectedIdx - maxVisible + 1;
			scrollOffset = Math.max(0, Math.min(scrollOffset, Math.max(0, navItems.length - maxVisible)));

			const visibleCount = Math.min(navItems.length - scrollOffset, maxVisible);
			for (let vi = 0; vi < visibleCount; vi++) {
				const i = scrollOffset + vi;
				const nav = navItems[i];
				const selected = i === selectedIdx;
				moveTo(row++, 1);
				contentRow++;
				if (nav.isTopLevel) files.renderFileEntry(nav.node, selected, innerW);
				else files.renderTreeNodeEntry(nav.node, nav.depth, selected, innerW);
			}
		}
	} else {
		const checkList = prInfo?.checks ?? [];
		if (checkList.length === 0) {
			moveTo(row++, 1);
			const msg = dim(" No checks");
			const pad = " ".repeat(Math.max(0, innerW - visWidth(msg)));
			write(dim("│") + msg + pad + dim("│"));
			contentRow++;
		} else {
			const maxVisible = Math.max(1, contentHeight);
			if (selectedIdx < scrollOffset) scrollOffset = selectedIdx;
			if (selectedIdx >= scrollOffset + maxVisible) scrollOffset = selectedIdx - maxVisible + 1;
			scrollOffset = Math.max(0, Math.min(scrollOffset, Math.max(0, checkList.length - maxVisible)));

			const visibleCount = Math.min(checkList.length - scrollOffset, maxVisible);
			for (let vi = 0; vi < visibleCount; vi++) {
				const i = scrollOffset + vi;
				moveTo(row++, 1);
				contentRow++;
				checks.renderCheckEntry(checkList[i], i === selectedIdx, innerW);
			}
		}
	}

	while (contentRow < contentHeight) {
		moveTo(row++, 1);
		write(dim("│") + " ".repeat(innerW) + dim("│"));
		contentRow++;
	}

	moveTo(row++, 1);
	write(dim("╰" + "─".repeat(innerW) + "╯"));
}

// ─── Input ───────────────────────────────────────────────────────────────────

let pendingG = false;

function handleInput(data) {
	const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
	const ch = data.toString();

	// Focus events
	if (ch === "\x1b[I") { paneActive = true; setPaneActive(true); render(); return; }
	if (ch === "\x1b[O") { paneActive = false; setPaneActive(false); render(); return; }

	if (detail.active) {
		if (detail.handleInput(buf, ch)) {
			if (!detail.active) render(); // closed detail view
		}
		return;
	}

	// Arrows
	if (buf.length === 3 && buf[0] === 0x1b && buf[1] === 0x5b) {
		pendingG = false;
		if (buf[2] === 0x41) return moveUp();
		if (buf[2] === 0x42) return moveDown();
	}

	// gg
	if (ch === "g") {
		if (pendingG) { pendingG = false; return jumpToTop(); }
		pendingG = true;
		setTimeout(() => { pendingG = false; }, 500);
		return;
	}
	pendingG = false;

	if (ch === "k") return moveUp();
	if (ch === "j") return moveDown();
	if (ch === "G") return jumpToBottom();
	if (ch === "\r" || ch === "o") return openInNvim();
	if (ch === "d") return openDiff();
	if (ch === " ") return toggleExpand();
	if (ch === "\t" || ch === "t") return switchTab();
	if (buf.length === 3 && buf[0] === 0x1b && buf[1] === 0x5b && buf[2] === 0x5a) return switchTab();
	if (ch === "a") return doToggleStage();
	if (ch === "A") return doStageAll();
	if (ch === "l") return openLazygit();
	if (ch === "v") return tmuxPopup(["nvim"]);
	if (ch === "c") return triggerCommit();
	if (ch === "r") return doRefresh();
	if (buf.length === 1 && buf[0] === 0x04) return halfPageDown();
	if (buf.length === 1 && buf[0] === 0x15) return halfPageUp();
	if (buf.length === 1 && buf[0] === 0x07) return focusPiPane();
	if (ch === "q" || (buf.length === 1 && buf[0] === 0x03)) return quit();
}

// ─── Navigation ──────────────────────────────────────────────────────────────

function moveUp() { selectedIdx = Math.max(0, selectedIdx - 1); render(); }
function moveDown() { selectedIdx = Math.min(currentListLength() - 1, selectedIdx + 1); render(); }
function jumpToTop() { selectedIdx = 0; scrollOffset = 0; render(); }
function jumpToBottom() { selectedIdx = Math.max(0, currentListLength() - 1); render(); }

function halfPageDown() {
	const jump = Math.max(1, Math.floor((process.stdout.rows || 24) / 2));
	selectedIdx = Math.min(currentListLength() - 1, selectedIdx + jump);
	render();
}

function halfPageUp() {
	const jump = Math.max(1, Math.floor((process.stdout.rows || 24) / 2));
	selectedIdx = Math.max(0, selectedIdx - jump);
	render();
}

function switchTab() {
	activeTab = (activeTab === "files" && prInfo) ? "checks" : "files";
	selectedIdx = 0;
	scrollOffset = 0;
	render();
}

// ─── Actions ─────────────────────────────────────────────────────────────────

function toggleExpand() {
	if (activeTab !== "files") return;
	const navItems = files.buildNavItems(changedFiles);
	if (selectedIdx >= navItems.length) return;
	const nav = navItems[selectedIdx];
	if (!nav.isDir) return;
	nav.node.expanded = !nav.node.expanded;
	if (nav.node.expanded && !nav.node.children) {
		nav.node.children = files.listDirChildren(nav.path);
	}
	render();
}

function openLazygit() { tmuxPopup(["lazygit"]); }

function openDiff() {
	if (activeTab !== "files") return;
	const navItems = files.buildNavItems(changedFiles);
	if (selectedIdx >= navItems.length) return;
	const nav = navItems[selectedIdx];
	if (nav.isDir) return;
	const esc = nav.path.replace(/'/g, "'\\''");
	if (nav.isTopLevel && nav.node.status === "??") {
		tmuxPopup([`git --no-pager diff --no-index /dev/null '${esc}' | delta --paging always --pager 'less -R'`]);
	} else {
		tmuxPopup([`git --no-pager diff HEAD -- '${esc}' | delta --paging always --pager 'less -R'`]);
	}
}

function openInNvim() {
	if (activeTab === "files") {
		const navItems = files.buildNavItems(changedFiles);
		if (selectedIdx >= navItems.length) return;
		const nav = navItems[selectedIdx];
		if (nav.isDir) return toggleExpand();
		tmuxPopup(["nvim", absPath(nav.path)]);
	} else {
		const checkList = prInfo?.checks ?? [];
		if (selectedIdx >= checkList.length) return;
		if (checkList[selectedIdx]?.detailsUrl) openUrl(checkList[selectedIdx].detailsUrl);
	}
}

function doToggleStage() {
	if (activeTab !== "files") return;
	const navItems = files.buildNavItems(changedFiles);
	if (selectedIdx >= navItems.length) return;
	files.toggleStage(navItems[selectedIdx]);
	doRefresh();
}

function doStageAll() {
	if (activeTab !== "files") return;
	files.stageAll();
	doRefresh();
}

function triggerCommit() {
	if (!piPaneId) return;
	try { tmux("send-keys", "-t", piPaneId, "/commit", "Enter"); focusPiPane(); } catch {}
}

function focusPiPane() {
	if (!piPaneId) return;
	try { tmux("select-pane", "-t", piPaneId); } catch {}
}

// ─── Watchdog & Lifecycle ────────────────────────────────────────────────────

const piPaneArg = process.argv.indexOf("--pi-pane");
const piPaneId = piPaneArg !== -1 ? process.argv[piPaneArg + 1] : null;

function checkPiPane() {
	if (!piPaneId) return;
	try { tmux("display-message", "-t", piPaneId, "-p", ""); } catch { quit(); }
}

function quit() {
	disableFocusReporting(); exitAltScreen(); showCursor();
	try { process.stdin.setRawMode(false); } catch {}
	process.stdin.pause(); write(R);
	const myPane = process.env.TMUX_PANE;
	if (myPane) { try { tmux("kill-pane", "-t", myPane); } catch {} }
	process.exit(0);
}

function setup() {
	enterAltScreen(); hideCursor(); enableFocusReporting();
	process.stdin.setRawMode(true);
	process.stdin.resume();
	process.stdin.on("data", handleInput);
	process.on("SIGWINCH", () => render());
	process.on("SIGTERM", () => quit());
	process.on("SIGINT", () => quit());
	process.on("SIGUSR1", () => doRefresh());
}

// ─── Main ────────────────────────────────────────────────────────────────────

setup();
doRefresh();
setInterval(doRefresh, 5_000);
setInterval(checkPiPane, 5_000);
