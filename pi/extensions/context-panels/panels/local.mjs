#!/usr/bin/env node
import { fileURLToPath } from "node:url";

import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import { git, gitRaw, gitRoot, absPath, openUrl } from "../lib/git.mjs";
import { parsePiPaneId, setup, quit, checkPiPane, handleFocusEvent, focusPiPane, forkWorker } from "../lib/panel.mjs";
import { createVimNav } from "../lib/vim-nav.mjs";
import { tmuxRun, tmuxInteractive, tmuxHasSession, tmuxNewSession, tmuxKillSession } from "../lib/tmux.mjs";
import {
	dim, green, bgCyan, bgMuted, write, setPaneActive,
	enterAltScreen, exitAltScreen, hideCursor, showCursor,
	clearScreen, moveTo, visWidth,
} from "../lib/ui.mjs";

import * as files from "../tabs/local/files.mjs";
import * as checks from "../tabs/local/checks.mjs";
import * as detail from "../tabs/local/detail.mjs";

// ─── Worker Mode ─────────────────────────────────────────────────────────────

const selfPath = fileURLToPath(import.meta.url);

if (process.argv.includes("--fetch-data")) {
	const changedFiles = files.fetchChangedFiles();
	process.send({ files: changedFiles });
	process.exit(0);
}

if (process.argv.includes("--fetch-checks")) {
	const prInfo = checks.fetchPrInfo();
	process.send({ pr: prInfo });
	process.exit(0);
}

// ─── Server ──────────────────────────────────────────────────────────────────

const serverSessionName = "pi-srv-" + createHash("sha256").update(gitRoot).digest("hex").slice(0, 8);
const termSessionName = "pi-term-" + createHash("sha256").update(gitRoot).digest("hex").slice(0, 8);

function readServerCommand() {
	const configPath = join(gitRoot, ".pi", "config.json");
	if (!existsSync(configPath)) return null;
	try {
		const config = JSON.parse(readFileSync(configPath, "utf-8"));
		return config.server || null;
	} catch { return null; }
}

function serverRunning() { return tmuxHasSession(serverSessionName); }

function toggleServer() {
	if (!serverRunning()) {
		const cmd = readServerCommand();
		if (!cmd) return;
		tmuxNewSession(serverSessionName, cmd, gitRoot, { noStatus: true });
	}

	tmuxPopup(["tmux", "attach-session", "-t", `=${serverSessionName}`]);
}

function killServer() {
	tmuxKillSession(serverSessionName);
	render();
}

function toggleTerm() {
	if (!tmuxHasSession(termSessionName)) {
		tmuxNewSession(termSessionName, process.env.SHELL || "bash", gitRoot, { noStatus: true });
	}
	tmuxPopup(["tmux", "attach-session", "-t", `=${termSessionName}`]);
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

const nav = createVimNav({
	getIdx: () => selectedIdx,
	setIdx: (i) => { selectedIdx = i; },
	getLen: currentListLength,
	render: () => render(),
});

// ─── Tmux Popup ──────────────────────────────────────────────────────────────

function tmuxPopup(args) {
	process.stdin.setRawMode(false);
	process.stdin.pause();
	exitAltScreen();
	showCursor();
	try { tmuxInteractive("popup", "-E", "-w", "90%", "-h", "90%", "-d", gitRoot, ...args); } catch {}
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
			// Schedule the first checks refresh after initial load
			scheduleChecksRefresh();
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

	forkWorker(selfPath, ["--fetch-data"], {
		onMessage: (data) => {
			changedFiles = data.files;

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
		},
		onDone: () => { if (refreshing) refreshing = false; },
	});
}

let checksRefreshing = false;

function doChecksRefresh() {
	if (checksRefreshing) return;
	checksRefreshing = true;

	forkWorker(selfPath, ["--fetch-checks"], {
		onMessage: (data) => {
			prInfo = data.pr;
			if (activeTab === "checks" && !prInfo) activeTab = "files";
			clampSelection();
			checksRefreshing = false;
			render();
		},
		onDone: () => { if (checksRefreshing) checksRefreshing = false; },
	});
}

function scheduleChecksRefresh() {
	setInterval(doChecksRefresh, 60_000);
}

// ─── Rendering ───────────────────────────────────────────────────────────────

function render() {
	if (detail.active) { detail.render(); return; }

	const width = process.stdout.columns || 30;
	const height = process.stdout.rows || 24;
	const innerW = Math.max(1, width - 2);

	hideCursor();

	let row = 1;

	// Header
	const activeBg = paneActive ? bgCyan : bgMuted;
	const filesLabel = activeTab === "files" ? activeBg(" Changes ") : dim(" Changes ");
	const checksLabel = prInfo
		? (activeTab === "checks" ? activeBg(" Checks ") : dim(" Checks "))
		: "";
	const srvIndicator = serverRunning() ? " " + green("●") + dim(" srv") : "";
	const tabBar = filesLabel + (checksLabel ? dim("│") + checksLabel : "") + srvIndicator;
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

function handleInput(data) {
	const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
	const ch = data.toString();

	const focus = handleFocusEvent(ch);
	if (focus !== null) { paneActive = focus; setPaneActive(focus); render(); return; }

	if (detail.active) {
		if (detail.handleInput(buf, ch)) {
			if (!detail.active) render();
		}
		return;
	}

	if (nav.handleKey(buf, ch)) return;

	if (ch === "\r" || ch === "o") return openInNvim();
	if (ch === "d") return openDiff();
	if (ch === " ") return toggleExpand();
	if (ch === "\t") return switchTab();
	if (ch === "t") return toggleTerm();
	if (buf.length === 3 && buf[0] === 0x1b && buf[1] === 0x5b && buf[2] === 0x5a) return switchTab();
	if (ch === "a") return doStageFile();
	if (ch === "u") return doUnstageFile();
	if (ch === "A") return doStageAll();
	if (ch === "s") return toggleServer();
	if (ch === "S") return killServer();
	if (ch === "l") return openLazygit();
	if (ch === "v") return tmuxPopup(["nvim"]);
	if (ch === "c") return triggerCommit();
	if (ch === "r") { doRefresh(); doChecksRefresh(); return; }
	if (buf.length === 1 && buf[0] === 0x07) return focusPiPane(piPaneId);
	if (ch === "q" || (buf.length === 1 && buf[0] === 0x03)) return quit();
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

let lastStageAction = 0;

function doStageFile() {
	if (activeTab !== "files") return;
	const navItems = files.buildNavItems(changedFiles);
	if (selectedIdx >= navItems.length) return;
	const nav = navItems[selectedIdx];
	if (nav.isTopLevel) nav.node.staged = true;
	files.stage(nav);
	lastStageAction = Date.now();
	render();
}

function doUnstageFile() {
	if (activeTab !== "files") return;
	const navItems = files.buildNavItems(changedFiles);
	if (selectedIdx >= navItems.length) return;
	const nav = navItems[selectedIdx];
	if (nav.isTopLevel) nav.node.staged = false;
	files.unstage(nav);
	lastStageAction = Date.now();
	render();
}

function doStageAll() {
	if (activeTab !== "files") return;
	files.stageAll();
	doRefresh();
}

function triggerCommit() {
	if (!piPaneId) return;
	try { tmuxRun("send-keys", "-t", piPaneId, "/commit", "Enter"); focusPiPane(piPaneId); } catch {}
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────

const piPaneId = parsePiPaneId();

function initPanel() {
	setup({
		onInput: handleInput,
		onResize: () => render(),
		onRefresh: () => doRefresh(),
	});
}

// ─── Main ────────────────────────────────────────────────────────────────────

initPanel();
doRefresh();
setInterval(() => {
	if (Date.now() - lastStageAction < 2_000) return;
	doRefresh();
}, 5_000);
setInterval(() => checkPiPane(piPaneId), 5_000);
