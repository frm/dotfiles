#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { readPiState } from "../lib/data.ts";
import { prMerge } from "../lib/gh.ts";
import { gitCommonDir, gitRepoRoot, currentBranch, branchExists, worktreeDel, openUrl } from "../lib/git.ts";
import { copyToClipboard } from "../lib/clipboard.ts";
import { linearIssueUrl } from "../lib/linear.ts";
import { createFocusManager } from "../lib/focus.ts";
import { parsePiPaneId, setup, quit, checkPiPane, focusPiPane, forkWorker } from "../lib/panel.ts";
import { getSessionOption } from "../lib/session.ts";
import { createVimNav } from "../lib/vim-nav.ts";
import { tmuxRun, tmuxQuery, tmuxFormat, tmuxHasSession, tmuxNewSession } from "../lib/tmux.ts";
import {
	R, dim, cyan, yellow, red, boldRed, magenta, bgCyan, bgMuted, write,
	hideCursor, createSpinner, flash, bottomBorder,
	clearScreen, moveTo, visWidth, truncate, wrapText, emptyLine, contentLine,
	bTL, bTR, bTopN, bSide,
} from "../lib/ui.ts";

import * as wt from "../tabs/global/worktrees.mjs";
import * as prs from "../tabs/global/prs.mjs";
import * as notif from "../tabs/global/notifications.mjs";

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

if (process.argv.includes("--merge-pr")) {
	const idx = process.argv.indexOf("--merge-pr");
	const number = process.argv[idx + 1];
	const auto = process.argv.includes("--auto");
	const cwd = process.argv[process.argv.length - 1];
	const result = prMerge(number, { auto }, cwd);
	process.send(result);
	process.exit(0);
}

if (process.argv.includes("--fetch-prs")) {
	const cwd = process.argv[process.argv.indexOf("--fetch-prs") + 1] ?? null;
	process.send(prs.fetchPrData(cwd));
	process.exit(0);
}

if (process.argv.includes("--fetch-notifications")) {
	process.send(notif.fetchNotifications());
	process.exit(0);
}

// ─── Tab State ───────────────────────────────────────────────────────────────

const TABS = ["worktrees", "prs", "notifications"];
let activeTabIdx = 0;
let activeTab = TABS[0];
let loading = true;
let prsLoading = true;
let notifLoading = true;
let notifLoadedOnce = false;
let prsLoadedOnce = false;
let confirmingDelete = false;
let confirmingMerge = false;
let confirmingPing = null; // { number, body } when confirming a ping comment
let confirmingAutoMerge = false;
let merging = false;
let deleting = false;


const spinner = createSpinner(() => render());

const shared = process.argv.includes("--shared");
const sessionNameIdx = process.argv.indexOf("--session");
const sessionName = sessionNameIdx !== -1 ? process.argv[sessionNameIdx + 1] : null;

// Ensure status bar is off in shared mode (set from inside the session for reliability)
if (shared) {
	try { tmuxRun("set-option", "status", "off"); } catch {}
}

const piPaneId = shared ? null : parsePiPaneId();
const focus = createFocusManager({ shared, render });

function getActivePiPane() {
	if (!shared) return piPaneId;
	return sessionName ? getSessionOption(sessionName, "pi_active_pane") : null;
}

function quitShared() {
	// Detach from the shared session instead of killing it, so state is
	// preserved and the next toggle reattaches instantly.
	try { tmuxRun("detach-client", "-s", `=${sessionName}`); } catch {}
}

function tab() {
	if (activeTab === "worktrees") return wt;
	if (activeTab === "prs") return prs;
	return notif;
}
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

function getPiSession() {
	const pane = getActivePiPane();
	if (pane) {
		try { return tmuxFormat("#{session_name}", pane); } catch {}
	}
	try { return tmuxFormat("#{session_name}"); } catch { return null; }
}

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
	const pane = getActivePiPane();
	if (!pane) return null;
	try {
		const paneCwd = tmuxFormat("#{pane_current_path}", pane);
		if (!paneCwd) return null;
		// Check if the pane's cwd matches a known worktree entry
		const entries = wt.state.sections.flatMap((s) => s.entries);
		const match = entries.find((e) => paneCwd.startsWith(e.path));
		if (match) return match.branch;
		// Fall back to git detection
		const branch = currentBranch(paneCwd);
		const entry = entries.find((e) => e.path);
		if (entry && gitCommonDir(paneCwd) !== gitCommonDir(entry.path)) return null;
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

	const session = getPiSession();
	if (!session) return;

	creating = false;
	createInput = "";

	try {
		const newPane = tmuxQuery("new-window", "-t", `${session}:`, "-P", "-F", "#{pane_id}");
		tmuxRun("send-keys", "-t", newPane, `g co ${base} && g wt ${branchName} && pi`, "Enter");
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

function refreshNotificationsAsync() {
	notifLoading = true;
	forkWorker(selfPath, ["--fetch-notifications"], {
		onMessage: (data) => {
			notif.applyData(data);
			notifLoading = false;
			notifLoadedOnce = true;
			render();
		},
		onDone: () => { if (notifLoading) { notifLoading = false; notifLoadedOnce = true; render(); } },
	});
}

function refreshAfterAction(cleanup) {
	refreshing = true;
	forkWorker(selfPath, ["--fetch-worktrees"], {
		onMessage: (entries) => {
			spinner.stop();
			cleanup();
			wt.applyEntries(entries);
			loading = false;
			refreshing = false;
			render();
			prsLoading = true;
			refreshPrsAsync();
		},
		onDone: () => {
			spinner.stop();
			cleanup();
			refreshing = false;
			render();
		},
	});
}

function refreshAfterDelete() { refreshAfterAction(() => { deleting = false; }); }
function refreshAfterMerge() { refreshAfterAction(() => { merging = false; }); }

function doRefresh() {
	if (refreshing) return;
	refreshing = true;
	refreshWorktreesAsync();
	refreshNotificationsAsync();
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
	const activeBg = focus.active ? bgCyan : bgMuted;
	const wtLabel = activeTab === "worktrees" ? activeBg(" Worktrees ") : dim(" Worktrees ");
	const prLabel = activeTab === "prs" ? activeBg(" Pull Requests ") : dim(" Pull Requests ");
	const notifCount = notif.state.notifications.length;
	let tabBar = wtLabel + dim("│") + prLabel;
	if (notifCount > 0 || activeTab === "notifications") {
		const notifBadge = notifCount > 0 ? ` (${notifCount})` : "";
		const notifLabel = activeTab === "notifications"
			? activeBg(` Inbox${notifBadge} `)
			: dim(` Inbox${notifBadge} `);
		tabBar += dim("│") + notifLabel;
	}
	const hFill = Math.max(0, innerW - visWidth(tabBar));
	moveTo(row++, 1);
	write(bTL() + tabBar + bTopN(hFill) + bTR());

	const contentHeight = Math.max(1, height - 2);
	let contentRow = 0;

	if (merging) {
		moveTo(row, 1); write(contentLine(" " + spinner.colorFn(spinner.frame) + " " + truncate(spinner.message, innerW - 3), innerW));
		contentRow = 1;
	} else if (confirmingMerge || confirmingAutoMerge) {
		const entry = tab().getSelectedEntry();
		const number = entry?.number ?? entry?.pr?.number ?? "?";
		const action = confirmingAutoMerge ? "Enable auto-merge" : "Merge";
		moveTo(row++, 1); write(contentLine(boldRed(` ${action} #${number}?`), innerW)); contentRow++;
		moveTo(row++, 1); write(contentLine(" " + truncate(entry?.title ?? "", innerW - 2), innerW)); contentRow++;
		moveTo(row++, 1); write(emptyLine(innerW)); contentRow++;
		moveTo(row++, 1); write(contentLine(dim(" y/n"), innerW)); contentRow++;
	} else if (confirmingPing) {
		moveTo(row++, 1); write(contentLine(yellow(` Post comment on PR #${confirmingPing.number}?`), innerW)); contentRow++;
		moveTo(row++, 1); write(contentLine(" " + truncate(confirmingPing.body, innerW - 2), innerW)); contentRow++;
		moveTo(row++, 1); write(emptyLine(innerW)); contentRow++;
		moveTo(row++, 1); write(contentLine(dim(" y/n"), innerW)); contentRow++;
	} else if (deleting) {
		moveTo(row, 1); write(contentLine(" " + spinner.colorFn(spinner.frame) + " " + truncate(spinner.message, innerW - 3), innerW));
		contentRow = 1;
	} else if (creating) {
		contentRow = renderCreate(row, innerW, contentHeight);
	} else if (loading && activeTab === "worktrees") {
		const msg = " Finding worktrees...";
		moveTo(row, 1); write(bSide() + dim(msg) + " ".repeat(Math.max(0, innerW - msg.length)) + bSide());
		contentRow = 1;
	} else if (loading && activeTab === "prs") {
		const msg = " Fetching pull requests...";
		moveTo(row, 1); write(bSide() + dim(msg) + " ".repeat(Math.max(0, innerW - msg.length)) + bSide());
		contentRow = 1;
	} else if (activeTab === "worktrees") {
		contentRow = wt.renderTab(row, innerW, contentHeight, confirmingDelete);
	} else if (activeTab === "prs" && prsLoading && !prsLoadedOnce) {
		const msg = " Fetching pull requests...";
		moveTo(row, 1); write(bSide() + dim(msg) + " ".repeat(Math.max(0, innerW - msg.length)) + bSide());
		contentRow = 1;
	} else if (activeTab === "prs") {
		contentRow = prs.renderTab(row, innerW, contentHeight);
	} else if (activeTab === "notifications" && notifLoading && !notifLoadedOnce) {
		const msg = " Fetching notifications...";
		moveTo(row, 1); write(bSide() + dim(msg) + " ".repeat(Math.max(0, innerW - msg.length)) + bSide());
		contentRow = 1;
	} else if (activeTab === "notifications") {
		contentRow = notif.renderTab(row, innerW, contentHeight - 1);
		// Fill empty space, then footer on last line
		while (contentRow < contentHeight - 1) {
			moveTo(row + contentRow, 1);
			write(emptyLine(innerW));
			contentRow++;
		}
		moveTo(row + contentRow, 1);
		const hasNotifs = notif.state.notifications.length > 0;
		const hint = hasNotifs ? dim(" (o)pen (a)ction (s)nooze (d)ismiss") : "";
		write(contentLine(hint, innerW));
		contentRow++;
	}

	while (contentRow < contentHeight) {
		moveTo(row + contentRow, 1);
		write(emptyLine(innerW));
		contentRow++;
	}

	moveTo(row + contentRow, 1);
	write(bottomBorder(innerW));
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



function handleInput(data) {
	const str = data.toString();

	const remainder = focus.processInput(str);
	if (remainder === null) return;

	const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
	// If focus events were stripped, work with the cleaned string
	const clean = remainder !== str;
	const inputStr = clean ? remainder : str;
	const inputBuf = clean ? Buffer.from(remainder) : buf;

	if (creating) return handleCreateInput(inputBuf, inputStr);

	if (confirmingDelete) {
		if (inputStr === "y" || inputStr === "Y") executeDelete();
		confirmingDelete = false;
		render();
		return;
	}

	if (confirmingMerge) {
		if (inputStr === "y" || inputStr === "Y") executeMerge(false);
		confirmingMerge = false;
		render();
		return;
	}

	if (confirmingAutoMerge) {
		if (inputStr === "y" || inputStr === "Y") executeMerge(true);
		confirmingAutoMerge = false;
		render();
		return;
	}

	if (confirmingPing) {
		if (inputStr === "y" || inputStr === "Y") {
			const result = notif.acceptAction();
			if (!result?.ok) flash(result?.error ?? "Ping failed", render, 2000, red);
			else flash("Comment posted", render);
		}
		confirmingPing = null;
		render();
		return;
	}

	// Tab switching
	if (inputStr === "t" || (inputBuf.length === 1 && inputBuf[0] === 0x09)) return switchTab();
	if (inputBuf.length === 3 && inputBuf[0] === 0x1b && inputBuf[1] === 0x5b && inputBuf[2] === 0x5a) return switchTab();

	if (nav.handleKey(inputBuf, inputStr)) return;

	// Arrow left/right for section collapse/expand
	if (inputBuf.length === 3 && inputBuf[0] === 0x1b && inputBuf[1] === 0x5b) {
		if (inputBuf[2] === 0x43) return expandSection();
		if (inputBuf[2] === 0x44) return collapseSection();
	}
	if (activeTab !== "notifications" && (inputStr === "\r" || inputStr === "o")) return activate();
	if (inputStr === "p") return openPr();
	if (inputStr === "f") return openPrChanges();
	if (inputStr === "c") return reviewPr();
	if (inputStr === "C") return reviewPrLocal();
	if (inputStr === "l") return openLinear();
	if (inputStr === "y") return copyPrUrl();
	if (inputStr === "L") return copyLinearUrl();
	if (inputStr === "m") return promptMerge();
	if (inputStr === "M") return promptAutoMerge();
	if (inputStr === "r") { wt.clearPrCache(); return doRefresh(); }
	if (inputStr === "q" || (inputBuf.length === 1 && inputBuf[0] === 0x03)) return shared ? quitShared() : quit();

	if (activeTab === "worktrees" && inputStr === "d") return promptDelete();
	if (activeTab === "worktrees" && inputStr === "a") return startCreate();

	// Notifications-only
	if (activeTab === "notifications" && (inputStr === "\r" || inputStr === "o")) {
		notif.toggleExpand();
		render();
		return;
	}
	if (activeTab === "notifications" && inputStr === "a") {
		const entry = notif.getSelectedEntry();
		if (entry?.suggestedAction?.handler === "stale-prs:ping-reviewers") {
			const params = entry.suggestedAction.params;
			const reviewers = (params.reviewers ?? []).map(r => `@${r}`).join(" ");
			confirmingPing = {
				number: params.prNumber,
				body: `${reviewers} friendly ping — this PR has been waiting for review`,
			};
			render();
			return;
		}
		const result = notif.acceptAction();
		if (!result?.ok) flash(result?.error ?? "Action failed", render, 2000, red);
		render();
		return;
	}
	if (activeTab === "notifications" && inputStr === "s") {
		notif.snoozeSelected();
		render();
		return;
	}
	if (activeTab === "notifications" && inputStr === "d") {
		notif.dismissSelected();
		render();
		return;
	}
	if (activeTab === "notifications" && inputStr === "D") {
		notif.dismissAllNotifications();
		render();
		return;
	}
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
	const hasNotifs = notif.state.notifications.length > 0;
	const maxTabs = hasNotifs ? TABS.length : 2;
	activeTabIdx = (activeTabIdx + 1) % maxTabs;
	activeTab = TABS[activeTabIdx];
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

function copyPrUrl() {
	const entry = tab().getSelectedEntry();
	const url = entry?.pr?.url ?? entry?.url;
	if (url && copyToClipboard(url)) flash("Copied PR link", render);
}

function copyLinearUrl() {
	const entry = tab().getSelectedEntry();
	if (entry?.linearIssue && copyToClipboard(linearIssueUrl(entry.linearIssue.identifier))) flash("Copied Linear link", render);
}

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
	if (!number) return;
	// For worktrees tab, send to the entry's own window (where pi is running)
	if (activeTab === "worktrees" && entry?.sessionWindow) {
		tmuxRun("send-keys", "-t", entry.sessionWindow, `/review-pr ${number}`, "Enter");
		try { tmuxRun("select-window", "-t", entry.sessionWindow); } catch {}
		return;
	}
	// Fallback: send to active pi pane
	const pane = getActivePiPane();
	if (!pane) return;
	tmuxRun("send-keys", "-t", pane, `/review-pr ${number}`, "Enter");
	focusPiPane(pane);
}

function ensureServer(repoRoot) {
	const srvName = "pi-srv-" + createHash("sha256").update(repoRoot).digest("hex").slice(0, 8);
	if (tmuxHasSession(srvName)) return;
	const configPath = join(repoRoot, ".pi", "config.json");
	if (!existsSync(configPath)) return;
	try {
		const config = JSON.parse(readFileSync(configPath, "utf-8"));
		if (!config.server) return;
		tmuxNewSession(srvName, config.server, repoRoot, { noStatus: true });
	} catch {}
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

	const session = getPiSession();
	if (!session) return;

	try {
		ensureServer(repoRoot);
		const newPane = tmuxQuery("new-window", "-t", `${session}:`, "-c", repoRoot, "-P", "-F", "#{pane_id}");
		tmuxRun("send-keys", "-t", newPane, `git fetch && g wt ${branch} && pi "/review-pr ${number}"`, "Enter");
	} catch {}
}

function openLinear() {
	const entry = tab().getSelectedEntry();
	if (entry?.linearIssue) openUrl(linearIssueUrl(entry.linearIssue.identifier));
}

function promptMerge() {
	const entry = tab().getSelectedEntry();
	if (!entry?.number && !entry?.pr?.number) return;
	confirmingMerge = true;
	render();
}

function promptAutoMerge() {
	const entry = tab().getSelectedEntry();
	if (!entry?.number && !entry?.pr?.number) return;
	confirmingAutoMerge = true;
	render();
}

function executeMerge(auto) {
	const entry = tab().getSelectedEntry();
	const number = entry?.number ?? entry?.pr?.number;
	if (!number) return;

	const wtEntry = wt.state.sections.flatMap((s) => s.entries).find((e) => e.path);
	if (!wtEntry?.path) return;

	merging = true;
	confirmingMerge = false;
	confirmingAutoMerge = false;
	render();
	spinner.start(`Merging #${number}...`, yellow);

	forkWorker(selfPath, ["--merge-pr", String(number), auto ? "--auto" : "", wtEntry.path].filter(Boolean), {
		timeout: 60_000,
		onMessage: (result) => {
			if (result?.ok) {
				spinner.update("Refreshing worktrees");
			} else {
				spinner.start(result?.error ?? "merge failed", red);
				setTimeout(() => { spinner.update("Refreshing worktrees"); }, 3000);
			}
		},
		onDone: () => {
			wt.clearPrCache();
			refreshAfterMerge();
		},
	});
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
	render();
	spinner.start(`Deleting ${entry.branch}`, yellow);

	const sessionWindow = `${entry.session}:${entry.window}`;
	const branch = entry.branch;

	forkWorker(selfPath, ["--delete-worktree", repoRoot, branch, sessionWindow], {
		timeout: 60_000,
		onDone: () => {
			spinner.update("Refreshing worktrees");
			wt.clearPrCache();
			refreshAfterDelete();
		},
	});
}

// ─── Setup ───────────────────────────────────────────────────────────────────

function initPanel() {
	setup({
		onInput: handleInput,
		onResize: () => render(),
		onRefresh: () => { wt.clearPrCache(); doRefresh(); },
		delayFocus: shared ? 500 : 0,
	});
}

// ─── State Polling ───────────────────────────────────────────────────────────

let lastActiveWindow = null;

function pollStates() {
	let activeWindow = null;
	const pane = getActivePiPane();
	if (pane) {
		try {
			// Get the user's session name from the pi pane, then query the session
			// for its active window (targeting a session resolves to its active window)
			const userSession = tmuxFormat("#{session_name}", pane);
			if (userSession) activeWindow = tmuxFormat("#{session_name}:#{window_index}", userSession);
		} catch {}
	}

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
if (!shared) setInterval(() => checkPiPane(piPaneId), 5_000);
