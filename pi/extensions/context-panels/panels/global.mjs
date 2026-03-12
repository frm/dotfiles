#!/usr/bin/env node
import { fileURLToPath } from "node:url";

import { readPiState } from "../lib/data.mjs";
import { gitCommonDir, gitRepoRoot, currentBranch, branchExists, worktreeDel, openUrl } from "../lib/git.mjs";
import { parsePiPaneId, setup, quit, checkPiPane, handleFocusEvent, focusPiPane, forkWorker } from "../lib/panel.mjs";
import { createVimNav } from "../lib/vim-nav.mjs";
import { tmuxRun, tmuxQuery, tmuxFormat } from "../lib/tmux.mjs";
import {
	dim, cyan, yellow, red, magenta, bgCyan, bgMuted, write,
	hideCursor,
	clearScreen, moveTo, visWidth, truncate, wrapText, emptyLine, contentLine,
} from "../lib/ui.mjs";

import * as wt from "../tabs/global/worktrees.mjs";
import * as prs from "../tabs/global/prs.mjs";

// ─── Worker Mode ─────────────────────────────────────────────────────────────

if (process.argv.includes("--fetch-worktrees")) {
	process.send(wt.fetchWorktrees());
	process.exit(0);
}

if (process.argv.includes("--delete-worktree")) {
	const idx = process.argv.indexOf("--delete-worktree");
	const root = process.argv[idx + 1];
	const branch = process.argv[idx + 2];
	const sessionWindow = process.argv[idx + 3];
	try { worktreeDel(root, branch); } catch {}
	try { tmuxRun("kill-window", "-t", sessionWindow); } catch {}
	process.exit(0);
}

if (process.argv.includes("--fetch-prs")) {
	const cwd = process.argv[process.argv.indexOf("--fetch-prs") + 1] ?? null;
	process.send(prs.fetchPrData(cwd));
	process.exit(0);
}

// ─── Tab State ───────────────────────────────────────────────────────────────

let activeTab = "worktrees";
let loading = true;
let prsLoading = true;
let prsLoadedOnce = false;
let confirmingDelete = false;
let deleting = false;
let deletingBranch = "";
let spinnerFrame = 0;
let spinnerTimer = null;
const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

const piPaneId = parsePiPaneId();
let paneActive = false;

function tab() { return activeTab === "worktrees" ? wt : prs; }
function tabState() { return tab().state; }

const nav = createVimNav({
	getIdx: () => tabState().selectedIdx,
	setIdx: (i) => { tabState().selectedIdx = i; },
	getLen: () => tabState().navItems.length,
	render: () => render(),
});

// ─── Create Worktree State ───────────────────────────────────────────────────

let creating = false;
let createInput = "";
let createBaseBranch = null; // default base (master/main)
let createUsingPaneBranch = false;
let createPaneBranch = null; // branch from pi pane's cwd
let createError = null;
let createErrorTimer = null;

function detectDefaultBase() {
	const entry = wt.state.sections.flatMap((s) => s.entries).find((e) => e.path);
	if (!entry) return null;
	try {
		const repoRoot = gitRepoRoot(entry.path);
		if (branchExists(repoRoot, "master")) return "master";
		if (branchExists(repoRoot, "main")) return "main";
	} catch {}
	return null;
}

function detectPaneBranch() {
	if (!piPaneId) return null;
	try {
		const paneCwd = tmuxFormat("#{pane_current_path}", piPaneId);
		if (!paneCwd) return null;
		const branch = currentBranch(paneCwd);
		const entry = wt.state.sections.flatMap((s) => s.entries).find((e) => e.path);
		if (entry) {
			if (gitCommonDir(paneCwd) !== gitCommonDir(entry.path)) return null;
		}
		return branch;
	} catch { return null; }
}

function startCreate() {
	creating = true;
	createInput = "";
	createBaseBranch = detectDefaultBase();
	createUsingPaneBranch = false;
	createPaneBranch = null;
	createError = null;
	if (createErrorTimer) { clearTimeout(createErrorTimer); createErrorTimer = null; }
	render();
}

function cancelCreate() {
	creating = false;
	createInput = "";
	createError = null;
	if (createErrorTimer) { clearTimeout(createErrorTimer); createErrorTimer = null; }
	render();
}

function toggleCreateBase() {
	if (createUsingPaneBranch) {
		// Switch back to default
		createUsingPaneBranch = false;
		render();
		return;
	}
	// Try to detect pane branch
	const branch = detectPaneBranch();
	if (branch) {
		createPaneBranch = branch;
		createUsingPaneBranch = true;
		render();
	} else {
		// Show error, keep default
		createError = "Current directory is not a repo worktree";
		if (createErrorTimer) clearTimeout(createErrorTimer);
		createErrorTimer = setTimeout(() => {
			createError = null;
			createErrorTimer = null;
			render();
		}, 2000);
		render();
	}
}

function executeCreate() {
	const branchName = createInput.trim();
	if (!branchName) return;
	const base = createUsingPaneBranch && createPaneBranch ? createPaneBranch : createBaseBranch;
	if (!base) return;

	let session;
	try { session = tmuxFormat("#{session_name}"); } catch { return; }
	if (!session) return;

	creating = false;
	createInput = "";

	try {
		tmuxRun("new-window", "-t", session);
		tmuxRun("send-keys", "-t", session, `g co ${base} && g wt ${branchName} && pi`, "Enter");
	} catch {}

	render();
}

// ─── Refresh ─────────────────────────────────────────────────────────────────

let refreshing = false;
const selfPath = fileURLToPath(import.meta.url);

function refreshWorktreesAsync() {
	forkWorker(selfPath, ["--fetch-worktrees"], {
		onMessage: (entries) => {
			wt.applyEntries(entries);
			loading = false;
			refreshing = false;
			render();
			prsLoading = true;
			refreshPrsAsync();
		},
		onDone: () => { if (refreshing) { loading = false; refreshing = false; render(); } },
	});
}

function refreshPrsAsync() {
	const cwd = wt.state.sections.flatMap((s) => s.entries).find((e) => e.path)?.path ?? null;
	if (!cwd) { prsLoading = false; return; }

	forkWorker(selfPath, ["--fetch-prs", cwd], {
		onMessage: (data) => {
			prs.applyData(data.reviewPrs, data.myPrs);
			prsLoading = false;
			prsLoadedOnce = true;
			render();
		},
		onDone: () => { if (prsLoading) { prsLoading = false; render(); } },
	});
}

function doRefresh() {
	if (refreshing) return;
	refreshing = true;
	refreshWorktreesAsync();
}

// ─── Rendering ───────────────────────────────────────────────────────────────

function render() {
	const width = process.stdout.columns || 30;
	const height = process.stdout.rows || 24;
	const innerW = Math.max(1, width - 2);

	clearScreen();
	hideCursor();

	let row = 1;

	// Tab header
	const activeBg = paneActive ? bgCyan : bgMuted;
	const wtLabel = activeTab === "worktrees" ? activeBg(" Worktrees ") : dim(" Worktrees ");
	const prLabel = activeTab === "prs" ? activeBg(" Pull Requests ") : dim(" Pull Requests ");
	const tabBar = wtLabel + dim("│") + prLabel;
	const hFill = "─".repeat(Math.max(0, innerW - visWidth(tabBar)));
	moveTo(row++, 1);
	write(dim("╭") + tabBar + dim(hFill + "╮"));

	const contentHeight = Math.max(1, height - 2);
	let contentRow = 0;

	if (deleting) {
		const spin = yellow(SPINNER[spinnerFrame]);
		const msg = ` Deleting ${deletingBranch}`;
		moveTo(row, 1); write(contentLine(" " + spin + truncate(msg, innerW - 2), innerW));
		contentRow = 1;
	} else if (creating) {
		contentRow = renderCreate(row, innerW, contentHeight);
	} else if (loading && activeTab === "worktrees") {
		const msg = " Finding worktrees...";
		moveTo(row, 1); write(dim("│") + dim(msg) + " ".repeat(Math.max(0, innerW - msg.length)) + dim("│"));
		contentRow = 1;
	} else if (loading && activeTab === "prs") {
		const msg = " Fetching pull requests...";
		moveTo(row, 1); write(dim("│") + dim(msg) + " ".repeat(Math.max(0, innerW - msg.length)) + dim("│"));
		contentRow = 1;
	} else if (activeTab === "worktrees") {
		contentRow = wt.renderTab(row, innerW, contentHeight, confirmingDelete);
	} else if (prsLoading && !prsLoadedOnce) {
		const msg = " Fetching pull requests...";
		moveTo(row, 1); write(dim("│") + dim(msg) + " ".repeat(Math.max(0, innerW - msg.length)) + dim("│"));
		contentRow = 1;
	} else {
		contentRow = prs.renderTab(row, innerW, contentHeight);
	}

	while (contentRow < contentHeight) {
		moveTo(row + contentRow, 1);
		write(emptyLine(innerW));
		contentRow++;
	}

	moveTo(row + contentRow, 1);
	write(dim("╰" + "─".repeat(innerW) + "╯"));
}

// ─── Create Worktree Rendering ───────────────────────────────────────────────

function writeWrapped(text, colorFn, innerW, state) {
	const lines = wrapText(text, innerW);
	for (const l of lines) {
		moveTo(state.row++, 1);
		write(contentLine(colorFn ? colorFn(l) : l, innerW));
		state.contentRow++;
	}
}

function renderCreate(startRow, innerW, contentHeight) {
	const st = { row: startRow, contentRow: 0 };

	// Blank line
	moveTo(st.row++, 1); write(emptyLine(innerW)); st.contentRow++;

	// Label
	moveTo(st.row++, 1); write(contentLine(dim(" Branch name:"), innerW)); st.contentRow++;

	// Input field with cursor — show tail of input if too long
	const maxInputW = innerW - 2; // space + cursor
	const displayInput = createInput.length > maxInputW
		? "…" + createInput.slice(-(maxInputW - 1))
		: createInput;
	moveTo(st.row++, 1); write(contentLine(" " + displayInput + cyan("█"), innerW)); st.contentRow++;

	// Blank line
	moveTo(st.row++, 1); write(emptyLine(innerW)); st.contentRow++;

	// Info or error line
	if (createError) {
		writeWrapped(` ${createError}`, red, innerW, st);
	} else {
		const base = createUsingPaneBranch && createPaneBranch ? createPaneBranch : createBaseBranch;
		writeWrapped(` Creating worktree from ${base ?? "unknown"}`, dim, innerW, st);
	}

	// Hints
	moveTo(st.row++, 1); write(emptyLine(innerW)); st.contentRow++;
	moveTo(st.row++, 1);
	write(contentLine(" " + magenta("S-Tab") + dim(": toggle base"), innerW));
	st.contentRow++;

	return st.contentRow;
}

// ─── Input ───────────────────────────────────────────────────────────────────

function isCtrlShiftW(buf, str) {
	if (buf.length === 1 && buf[0] === 0x17) return true;
	if (str === "\x1b[119;6u" || str === "\x1b[87;6u") return true;
	return false;
}

function handleInput(data) {
	const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
	const str = data.toString();

	const focus = handleFocusEvent(str);
	if (focus !== null) { paneActive = focus; render(); return; }

	if (creating) return handleCreateInput(buf, str);

	if (confirmingDelete) {
		if (str === "y" || str === "Y") executeDelete();
		confirmingDelete = false;
		render();
		return;
	}

	if (isCtrlShiftW(buf, str)) return focusPiPane(piPaneId);

	// Tab switching
	if (str === "t" || (buf.length === 1 && buf[0] === 0x09)) return switchTab();
	if (buf.length === 3 && buf[0] === 0x1b && buf[1] === 0x5b && buf[2] === 0x5a) return switchTab();

	if (nav.handleKey(buf, str)) return;

	// Arrow left/right for section collapse/expand
	if (buf.length === 3 && buf[0] === 0x1b && buf[1] === 0x5b) {
		if (buf[2] === 0x43) return expandSection();
		if (buf[2] === 0x44) return collapseSection();
	}
	if (str === "\r" || str === "o") return activate();
	if (str === "p") return openPr();
	if (str === "f") return openPrChanges();
	if (str === "c") return reviewPr();
	if (str === "C") return reviewPrLocal();
	if (str === "l") return openLinear();
	if (str === "r") { wt.clearPrCache(); return doRefresh(); }
	if (str === "q" || (buf.length === 1 && buf[0] === 0x03)) return quit();

	// Worktrees-only
	if (activeTab === "worktrees" && str === "d") return promptDelete();
	if (activeTab === "worktrees" && str === "a") return startCreate();
}

function handleCreateInput(buf, str) {
	// Escape — cancel
	if (buf.length === 1 && buf[0] === 0x1b) return cancelCreate();
	// Enter — execute
	if (str === "\r") return executeCreate();
	// Shift+Tab — toggle base branch
	if (buf.length === 3 && buf[0] === 0x1b && buf[1] === 0x5b && buf[2] === 0x5a) return toggleCreateBase();
	// Backspace
	if (buf.length === 1 && (buf[0] === 0x7f || buf[0] === 0x08)) {
		createInput = createInput.slice(0, -1);
		render();
		return;
	}
	// Ctrl+U — clear input
	if (buf.length === 1 && buf[0] === 0x15) {
		createInput = "";
		render();
		return;
	}
	// Printable characters
	if (str.length === 1 && str.charCodeAt(0) >= 32) {
		createInput += str;
		render();
	}
}

function switchTab() {
	activeTab = activeTab === "worktrees" ? "prs" : "worktrees";
	render();
}

function expandSection() {
	const s = tabState();
	const item = s.navItems[s.selectedIdx];
	if (!item) return;
	const sections = activeTab === "worktrees"
		? wt.state.sections
		: prs.getSelectedSections();
	const sec = sections[item.sectionIdx];
	if (sec.collapsed) {
		sec.collapsed = false;
		tab().rebuildNav();
		render();
	}
}

function collapseSection() {
	const s = tabState();
	const item = s.navItems[s.selectedIdx];
	if (!item) return;
	const sections = activeTab === "worktrees"
		? wt.state.sections
		: prs.getSelectedSections();
	const sec = sections[item.sectionIdx];
	if (!sec.collapsed) {
		sec.collapsed = true;
		tab().rebuildNav();
		render();
	}
}

function activate() {
	const s = tabState();
	const item = s.navItems[s.selectedIdx];
	if (!item) return;

	if (item.type === "section") {
		const sections = activeTab === "worktrees"
			? wt.state.sections
			: prs.getSelectedSections();
		const sec = sections[item.sectionIdx];
		sec.collapsed = !sec.collapsed;
		tab().rebuildNav();
		render();
		return;
	}

	if (activeTab === "worktrees") {
		const entry = wt.getSelectedEntry();
		if (!entry) return;
		const target = `${entry.session}:${entry.window}`;
		try { tmuxRun("select-window", "-t", target); }
		catch { try { tmuxRun("switch-client", "-t", target); } catch {} }
	} else {
		openPr();
	}
}

// ─── Actions ─────────────────────────────────────────────────────────────────

function openPr() {
	const entry = tab().getSelectedEntry();
	const url = entry?.pr?.url ?? entry?.url;
	if (url) openUrl(url);
}

function openPrChanges() {
	const entry = tab().getSelectedEntry();
	const url = entry?.pr?.url ?? entry?.url;
	if (url) openUrl(`${url}/files`);
}

function reviewPr() {
	const entry = tab().getSelectedEntry();
	const number = entry?.number ?? entry?.pr?.number;
	if (!number || !piPaneId) return;
	tmuxRun("send-keys", "-t", piPaneId, `/review-pr ${number}`, "Enter");
	focusPiPane(piPaneId);
}

function reviewPrLocal() {
	const entry = tab().getSelectedEntry();
	const number = entry?.number ?? entry?.pr?.number;
	const branch = entry?.branch ?? entry?.pr?.headRefName;
	if (!number || !branch) return;

	const wtEntry = wt.state.sections.flatMap((s) => s.entries).find((e) => e.path);
	let repoRoot;
	try { repoRoot = gitRepoRoot(wtEntry?.path); } catch { return; }
	if (!repoRoot) return;

	let session;
	try { session = tmuxFormat("#{session_name}"); } catch { return; }
	if (!session) return;

	try {
		tmuxRun("new-window", "-t", session, "-c", repoRoot);
		tmuxRun("send-keys", "-t", session, `git fetch && g wt ${branch} && pi "/review-pr ${number}"`, "Enter");
	} catch {}
}

function openLinear() {
	const entry = tab().getSelectedEntry();
	if (entry?.linearIssue) openUrl(`https://linear.app/issue/${entry.linearIssue.identifier}`);
}

function promptDelete() {
	if (activeTab !== "worktrees" || !wt.getSelectedEntry()) return;
	confirmingDelete = true;
	render();
}

function executeDelete() {
	const entry = wt.getSelectedEntry();
	if (!entry) return;
	let repoRoot;
	try { repoRoot = gitRepoRoot(entry.path); } catch { return; }
	if (!repoRoot) return;

	deleting = true;
	deletingBranch = entry.branch;
	spinnerFrame = 0;
	render();
	spinnerTimer = setInterval(() => { spinnerFrame = (spinnerFrame + 1) % SPINNER.length; render(); }, 80);

	const sessionWindow = `${entry.session}:${entry.window}`;
	const branch = entry.branch;

	forkWorker(selfPath, ["--delete-worktree", repoRoot, branch, sessionWindow], {
		timeout: 60_000,
		onDone: () => {
			clearInterval(spinnerTimer);
			spinnerTimer = null;
			deleting = false;
			wt.clearPrCache();
			doRefresh();
		},
	});
}

// ─── Setup ───────────────────────────────────────────────────────────────────

function initPanel() {
	setup({
		onInput: handleInput,
		onResize: () => render(),
		onRefresh: () => { wt.clearPrCache(); doRefresh(); },
	});
}

// ─── State Polling ───────────────────────────────────────────────────────────

let lastActiveWindow = null;

function pollStates() {
	let activeWindow;
	try {
		activeWindow = tmuxFormat("#{session_name}:#{window_index}");
	} catch { return; }

	if (activeWindow && activeWindow !== lastActiveWindow && lastActiveWindow !== null) {
		const currentState = readPiState(activeWindow);
		if (currentState === "idle") {
			try { tmuxRun("set-option", "-wu", "-t", activeWindow, "@pi_state"); } catch {}
		}
	}
	lastActiveWindow = activeWindow;

	let changed = false;
	for (const sec of wt.state.sections) {
		for (const entry of sec.entries) {
			const newState = readPiState(entry.sessionWindow);
			if (newState !== entry.piState) { entry.piState = newState; changed = true; }
		}
	}
	if (changed) render();
}

// ─── Main ────────────────────────────────────────────────────────────────────

initPanel();
render();
doRefresh();
setInterval(doRefresh, 60_000);
setInterval(pollStates, 2_000);
setInterval(() => checkPiPane(piPaneId), 5_000);
