#!/usr/bin/env node
import { execFileSync, fork } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// State is read from tmux window options (@pi_state) instead of temp files
const HOME = process.env.HOME ?? "";

function readPiState(sessionWindow) {
	if (!sessionWindow) return null;
	try {
		const raw = execFileSync("tmux", ["show-option", "-wv", "-t", sessionWindow, "@pi_state"], {
			encoding: "utf-8",
			timeout: 3000,
			stdio: ["pipe", "pipe", "pipe"],
		}).trim();
		return raw || null;
	} catch {
		return null;
	}
}

function loadLinearAuth() {
	try {
		const raw = readFileSync(join(HOME, ".pi", "agent", "auth.json"), "utf-8");
		const data = JSON.parse(raw);
		return {
			apiKey: data?.linear?.["api-key"] ?? null,
			defaultTeam: data?.linear?.["default-team"] ?? null,
		};
	} catch {
		return { apiKey: null, defaultTeam: null };
	}
}

function extractIssueId(branch) {
	const parts = branch.split("/");
	for (const part of parts) {
		if (/^[A-Za-z]+-\d+$/.test(part)) return part.toUpperCase();
	}
	return null;
}

function extractDescription(branch) {
	// frm/TEAM-123/description-by-hyphens → description-by-hyphens
	// frm/description-by-hyphens → description-by-hyphens
	// description-by-hyphens → description-by-hyphens
	const parts = branch.split("/");
	return parts[parts.length - 1];
}

const linearCache = new Map();
const LINEAR_CACHE_TTL = 120_000;

function lookupLinearIssue(identifier) {
	const cached = linearCache.get(identifier);
	if (cached && Date.now() - cached.ts < LINEAR_CACHE_TTL) return cached.result;

	const auth = loadLinearAuth();
	if (!auth.apiKey) return null;

	const [teamKey, numStr] = identifier.split("-");
	const num = parseInt(numStr);
	if (!teamKey || isNaN(num)) return null;

	const body = JSON.stringify({
		query: `query($filter: IssueFilter) { issues(filter: $filter, first: 1) { nodes { identifier title url state { name } } } }`,
		variables: { filter: { team: { key: { eq: teamKey } }, number: { eq: num } } },
	});

	try {
		const raw = execFileSync(
			"curl",
			["-s", "-X", "POST", "-H", "Content-Type: application/json", "-H", `Authorization: ${auth.apiKey}`, "-d", body, "https://api.linear.app/graphql"],
			{ timeout: 10_000, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
		);
		const json = JSON.parse(raw);
		const issue = json.data?.issues?.nodes?.[0] ?? null;
		linearCache.set(identifier, { result: issue, ts: Date.now() });
		return issue;
	} catch {
		linearCache.set(identifier, { result: null, ts: Date.now() });
		return null;
	}
}

// ─── ANSI Helpers ────────────────────────────────────────────────────────────

const R = "\x1b[0m";
const style = (codes, t) => `${codes}${t}${R}`;
const bold = (t) => style("\x1b[1m", t);
const dim = (t) => style("\x1b[2m", t);
const yellow = (t) => style("\x1b[33m", t);
const cyan = (t) => style("\x1b[36m", t);
const green = (t) => style("\x1b[32m", t);
const red = (t) => style("\x1b[31m", t);
const boldCyan = (t) => style("\x1b[1;36m", t);
const boldRed = (t) => style("\x1b[1;31m", t);

const write = (s) => process.stdout.write(s);
const enterAltScreen = () => write("\x1b[?1049h");
const exitAltScreen = () => write("\x1b[?1049l");
const hideCursor = () => write("\x1b[?25l");
const showCursor = () => write("\x1b[?25h");
const clearScreen = () => write("\x1b[2J\x1b[H");
const moveTo = (r, c) => write(`\x1b[${r};${c}H`);

function stripAnsi(s) {
	return s.replace(/\x1b\[[0-9;]*m/g, "");
}

function visWidth(s) {
	return stripAnsi(s).length;
}

function truncate(s, maxW) {
	if (maxW <= 0) return "";
	const plain = stripAnsi(s);
	if (plain.length <= maxW) return s;
	return plain.slice(0, maxW - 1) + "…";
}

// ─── Data Fetching ───────────────────────────────────────────────────────────

const prCache = new Map();
const PR_CACHE_TTL = 30_000;

function lookupChecks(prNumber, cwd) {
	try {
		let raw;
		try {
			raw = execFileSync("gh", ["pr", "checks", String(prNumber)], {
				cwd,
				timeout: 10_000,
				encoding: "utf-8",
				stdio: ["pipe", "pipe", "pipe"],
			});
		} catch (err) {
			// gh pr checks exits non-zero when checks fail, but still outputs data
			raw = err.stdout ?? "";
		}

		raw = (raw ?? "").toString().trim();
		if (!raw) return { status: null, passing: 0, total: 0 };

		const statuses = [];
		for (const line of raw.split("\n")) {
			const parts = line.split("\t");
			if (parts[1]) statuses.push(parts[1].trim());
		}

		const total = statuses.length;
		const passing = statuses.filter((s) => s === "pass" || s === "skipping").length;

		if (total === 0) return { status: null, passing: 0, total: 0 };

		let status = null;
		if (statuses.some((s) => s === "fail")) status = "fail";
		else if (statuses.some((s) => s === "pending")) status = "pending";
		else if (passing === total) status = "pass";

		return { status, passing, total };
	} catch {
		return { status: null, passing: 0, total: 0 };
	}
}

function lookupPr(branch, cwd) {
	const key = `${cwd}:${branch}`;
	const cached = prCache.get(key);
	if (cached && Date.now() - cached.ts < PR_CACHE_TTL) return cached.result;

	try {
		const raw = execFileSync(
			"gh",
			["pr", "list", "--state", "all", "--head", branch, "--json", "number,state,mergedAt,url", "--limit", "1"],
			{ cwd, timeout: 10_000, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
		).trim();
		const arr = JSON.parse(raw);
		if (arr.length === 0) {
			prCache.set(key, { result: null, ts: Date.now() });
			return null;
		}

		const pr = arr[0];
		let checks = { status: null, passing: 0, total: 0 };
		if (pr.state === "OPEN") {
			checks = lookupChecks(pr.number, cwd);
		}

		const result = { number: pr.number, state: pr.state, checks, url: pr.url ?? null };
		prCache.set(key, { result, ts: Date.now() });
		return result;
	} catch {
		prCache.set(key, { result: null, ts: Date.now() });
		return null;
	}
}

function prSymbol(pr) {
	if (!pr) return null;
	switch (pr.state) {
		case "MERGED":
			return { symbol: "⇑", colorFn: (t) => style("\x1b[35m", t) };
		case "CLOSED":
			return { symbol: "⊘", colorFn: red };
		case "OPEN":
			switch (pr.checks.status) {
				case "fail":
					return { symbol: "✗", colorFn: red };
				case "pending":
					return { symbol: "⧖", colorFn: (t) => t };
				case "pass":
					return { symbol: "✓", colorFn: green };
				default:
					return null;
			}
		default:
			return null;
	}
}

function prSubline(pr) {
	if (!pr) return null;
	const sym = prSymbol(pr);
	const colorFn = sym?.colorFn ?? cyan;
	const prefix = sym ? colorFn(sym.symbol) + " " : "";
	let rest = colorFn(`#${pr.number}`);
	if (pr.checks.total > 0) {
		rest += dim(` (${pr.checks.passing}/${pr.checks.total})`);
	}
	return { text: prefix + rest };
}

function fetchWorktrees() {
	let raw;
	try {
		raw = execFileSync("tmux", ["list-windows", "-a", "-F", "#{session_name}\t#{window_name}\t#{pane_current_path}\t#{window_index}"], {
			timeout: 5000,
			encoding: "utf-8",
			stdio: ["pipe", "pipe", "pipe"],
		}).trim();
	} catch {
		return [];
	}
	if (!raw) return [];

	const entries = [];
	const seen = new Set();

	for (const line of raw.split("\n")) {
		const [session, window_, path, windowIndex] = line.split("\t");
		if (!session || !window_ || !path) continue;
		if (!path.includes(".worktrees/")) continue;
		if (seen.has(path)) continue;
		seen.add(path);

		let branch;
		try {
			branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
				cwd: path,
				timeout: 5000,
				encoding: "utf-8",
				stdio: ["pipe", "pipe", "pipe"],
			}).trim();
		} catch {
			continue;
		}

		const pr = lookupPr(branch, path);
		let status = "in-progress";
		if (pr?.state === "MERGED") status = "done";
		else if (pr?.state === "OPEN") status = "in-review";

		const sessionWindow = `${session}:${windowIndex}`;
		const piState = readPiState(sessionWindow);
		const issueId = extractIssueId(branch);
		const linearIssue = issueId ? lookupLinearIssue(issueId) : null;
		entries.push({ session, window: window_, path, branch, status, pr, piState, linearIssue, sessionWindow });
	}

	return entries;
}

// ─── Worker Mode ─────────────────────────────────────────────────────────────
// When invoked with --fetch-data, just fetch and send data back via IPC

if (process.argv.includes("--fetch-data")) {
	try {
		const entries = fetchWorktrees();
		process.send(entries);
	} catch {
		process.send([]);
	}
	process.exit(0);
}

// ─── UI State ────────────────────────────────────────────────────────────────

const SECTION_DEFS = [
	{ key: "done", label: "Done", icon: "✓", colorFn: green },
	{ key: "in-review", label: "In Review", icon: "◐", colorFn: cyan },
	{ key: "in-progress", label: "In Progress", icon: "●", colorFn: yellow },
];

let sections = SECTION_DEFS.map((s) => ({ ...s, entries: [], collapsed: s.key === "done" }));
let navItems = [];
let visualRows = [];
let selectedIdx = 0;
let scrollOffset = 0;
let loading = true;
let confirmingDelete = false;

function buildNavItems() {
	const items = [];
	for (let s = 0; s < sections.length; s++) {
		if (sections[s].entries.length === 0) continue;
		items.push({ type: "section", sectionIdx: s });
		if (!sections[s].collapsed) {
			for (let e = 0; e < sections[s].entries.length; e++) {
				items.push({ type: "entry", sectionIdx: s, entryIdx: e });
			}
		}
	}
	return items;
}

function buildVisualRows() {
	const rows = [];
	for (let i = 0; i < navItems.length; i++) {
		const item = navItems[i];
		if (item.type === "section") {
			rows.push({ navIdx: i, kind: "section" });
		} else {
			const entry = sections[item.sectionIdx].entries[item.entryIdx];
			rows.push({ navIdx: i, kind: "entry" });
			if (entry.pr || entry.linearIssue) {
				rows.push({ navIdx: i, kind: "detail" });
			}
		}
	}
	return rows;
}

function clampSelection() {
	if (selectedIdx >= navItems.length) selectedIdx = Math.max(0, navItems.length - 1);
	if (selectedIdx < 0) selectedIdx = 0;
}

let refreshing = false;
const selfPath = fileURLToPath(import.meta.url);

function doRefresh() {
	if (loading) {
		render();
		setTimeout(() => {
			const entries = fetchWorktrees();
			applyEntries(entries);
			loading = false;
			render();
		}, 0);
		return;
	}
	if (refreshing) return;
	refreshing = true;

	// Fork a child process so the UI stays responsive during data fetch
	const child = fork(selfPath, ["--fetch-data"], {
		stdio: ["pipe", "pipe", "pipe", "ipc"],
		timeout: 30_000,
	});
	child.on("message", (entries) => {
		applyEntries(entries);
		refreshing = false;
		render();
	});
	child.on("error", () => { refreshing = false; });
	child.on("exit", () => { if (refreshing) refreshing = false; });
}

function applyEntries(entries) {
	const groups = { "in-progress": [], "in-review": [], done: [] };
	for (const e of entries) groups[e.status].push(e);
	for (const sec of sections) sec.entries = groups[sec.key];
	navItems = buildNavItems();
	visualRows = buildVisualRows();
	clampSelection();
}

// ─── Rendering ───────────────────────────────────────────────────────────────

function emptyLine(innerW) {
	return dim("│") + " ".repeat(innerW) + dim("│");
}

function contentLine(content, innerW) {
	const pad = " ".repeat(Math.max(0, innerW - visWidth(content)));
	return dim("│") + content + pad + dim("│");
}

function render() {
	const width = process.stdout.columns || 30;
	const height = process.stdout.rows || 24;
	const innerW = Math.max(1, width - 2);

	clearScreen();
	hideCursor();

	let row = 1;

	// Header
	const title = boldCyan(" Worktrees ");
	const titleW = visWidth(title);
	const hFill = "─".repeat(Math.max(0, innerW - titleW));
	moveTo(row++, 1);
	write(dim("╭") + title + dim(hFill + "╮"));

	const contentHeight = Math.max(1, height - 2);
	let contentRow = 0;

	if (loading) {
		moveTo(row++, 1);
		write(contentLine(dim(" Loading..."), innerW));
		contentRow++;
	} else if (confirmingDelete) {
		const entry = getSelectedEntry();
		if (entry) {
			moveTo(row++, 1);
			write(contentLine(boldRed(" Delete worktree?"), innerW));
			contentRow++;

			moveTo(row++, 1);
			write(contentLine(" " + truncate(entry.branch, innerW - 2), innerW));
			contentRow++;

			moveTo(row++, 1);
			write(emptyLine(innerW));
			contentRow++;

			moveTo(row++, 1);
			write(contentLine(dim(" y/n"), innerW));
			contentRow++;
		}
	} else if (visualRows.length === 0) {
		moveTo(row++, 1);
		write(contentLine(dim(" No worktrees"), innerW));
		contentRow++;
	} else {
		// Scroll: ensure all visual rows of the selected navItem are visible
		const selFirst = visualRows.findIndex((r) => r.navIdx === selectedIdx);
		const selLast = visualRows.findLastIndex((r) => r.navIdx === selectedIdx);

		if (selFirst !== -1) {
			if (selFirst < scrollOffset) scrollOffset = selFirst;
			if (selLast >= scrollOffset + contentHeight) scrollOffset = selLast - contentHeight + 1;
		}
		const maxScroll = Math.max(0, visualRows.length - contentHeight);
		if (scrollOffset > maxScroll) scrollOffset = maxScroll;
		if (scrollOffset < 0) scrollOffset = 0;

		const visibleCount = Math.min(visualRows.length - scrollOffset, contentHeight);

		for (let vi = 0; vi < visibleCount; vi++) {
			const vr = visualRows[scrollOffset + vi];
			const selected = vr.navIdx === selectedIdx;
			const item = navItems[vr.navIdx];

			moveTo(row++, 1);
			contentRow++;

			if (vr.kind === "section") {
				const sec = sections[item.sectionIdx];
				const arrow = sec.collapsed ? "▸" : "▾";
				const icon = sec.colorFn(sec.icon);
				const content = ` ${arrow} ${icon} ${bold(sec.label)} ${dim(`(${sec.entries.length})`)}`;
				const contentW = visWidth(content);
				const pad = " ".repeat(Math.max(0, innerW - contentW));
				const border = selected ? cyan("▐") : dim("│");
				write(border + content + pad + dim("│"));
			} else if (vr.kind === "entry") {
				const entry = sections[item.sectionIdx].entries[item.entryIdx];
				const cursor = selected ? cyan("→ ") : "  ";
				const indent = " ";
				let stateIcon = "";
				let stateW = 0;
				if (entry.piState === "idle") {
					stateIcon = cyan("◆") + " ";
					stateW = 2;
				} else if (entry.piState === "question") {
					stateIcon = cyan("⁇") + " ";
					stateW = 2;
				}
				const maxNameW = innerW - 3 - stateW;
				const name = truncate(extractDescription(entry.branch), maxNameW);
				const nameW = visWidth(name);
				const pad = " ".repeat(Math.max(0, innerW - 3 - stateW - nameW));
				write(dim("│") + indent + cursor + stateIcon + name + pad + dim("│"));
			} else if (vr.kind === "detail") {
				const entry = sections[item.sectionIdx].entries[item.entryIdx];
				const parts = [];
				const sub = prSubline(entry.pr);
				if (sub) parts.push(sub.text);
				if (entry.linearIssue) parts.push(dim(entry.linearIssue.identifier));
				const indent = "     ";
				const full = indent + parts.join(dim(" • "));
				const fullW = visWidth(full);
				const pad = " ".repeat(Math.max(0, innerW - fullW));
				write(dim("│") + full + pad + dim("│"));
			}
		}
	}

	// Fill remaining rows
	while (contentRow < contentHeight) {
		moveTo(row++, 1);
		write(emptyLine(innerW));
		contentRow++;
	}

	// Footer
	moveTo(row++, 1);
	const footFill = "─".repeat(Math.max(0, innerW));
	write(dim("╰" + footFill + "╯"));
}

function getSelectedEntry() {
	const item = navItems[selectedIdx];
	if (!item || item.type !== "entry") return null;
	return sections[item.sectionIdx].entries[item.entryIdx];
}

// ─── Input Handling ──────────────────────────────────────────────────────────

function isCtrlShiftW(buf, str) {
	// 0x17 = Ctrl+W (most terminals send this for Ctrl+Shift+W too)
	if (buf.length === 1 && buf[0] === 0x17) return true;
	// CSI u encoding: \x1b[119;6u (ctrl+shift+w) or \x1b[87;6u (ctrl+shift+W)
	if (str === "\x1b[119;6u" || str === "\x1b[87;6u") return true;
	return false;
}

function handleInput(data) {
	const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
	const str = data.toString();

	if (confirmingDelete) {
		if (str === "y" || str === "Y") {
			executeDelete();
		}
		confirmingDelete = false;
		render();
		return;
	}

	if (isCtrlShiftW(buf, str)) return focusPiPane();

	// Arrow keys: ESC [ A/B/C/D
	if (buf.length === 3 && buf[0] === 0x1b && buf[1] === 0x5b) {
		if (buf[2] === 0x41) return moveUp();
		if (buf[2] === 0x42) return moveDown();
		if (buf[2] === 0x43) return expandSection();
		if (buf[2] === 0x44) return collapseSection();
	}

	if (str === "k") return moveUp();
	if (str === "j") return moveDown();
	if (str === "\r" || str === "o") return activate();
	if (str === "d") return promptDelete();
	if (str === "p") return openPr();
	if (str === "l") return openLinear();
	if (str === "r") {
		prCache.clear();
		return doRefresh();
	}
	if (str === "q" || (buf.length === 1 && buf[0] === 0x03)) {
		quit();
	}
}

function moveUp() {
	selectedIdx = Math.max(0, selectedIdx - 1);
	render();
}

function moveDown() {
	selectedIdx = Math.min(navItems.length - 1, selectedIdx + 1);
	render();
}

function expandSection() {
	const item = navItems[selectedIdx];
	if (!item) return;
	const sec = sections[item.sectionIdx];
	if (sec.collapsed) {
		sec.collapsed = false;
		navItems = buildNavItems();
		visualRows = buildVisualRows();
		render();
	}
}

function collapseSection() {
	const item = navItems[selectedIdx];
	if (!item) return;
	const sec = sections[item.sectionIdx];
	if (!sec.collapsed) {
		sec.collapsed = true;
		navItems = buildNavItems();
		visualRows = buildVisualRows();
		clampSelection();
		render();
	}
}

function activate() {
	const item = navItems[selectedIdx];
	if (!item) return;

	if (item.type === "section") {
		const sec = sections[item.sectionIdx];
		sec.collapsed = !sec.collapsed;
		navItems = buildNavItems();
		visualRows = buildVisualRows();
		clampSelection();
		render();
		return;
	}

	const entry = sections[item.sectionIdx].entries[item.entryIdx];
	const target = `${entry.session}:${entry.window}`;
	try {
		execFileSync("tmux", ["select-window", "-t", target], {
			timeout: 3000,
			stdio: ["pipe", "pipe", "pipe"],
		});
	} catch {
		try {
			execFileSync("tmux", ["switch-client", "-t", target], {
				timeout: 3000,
				stdio: ["pipe", "pipe", "pipe"],
			});
		} catch {}
	}
}

function promptDelete() {
	const entry = getSelectedEntry();
	if (!entry) return;
	confirmingDelete = true;
	render();
}

function executeDelete() {
	const entry = getSelectedEntry();
	if (!entry) return;

	let gitRoot;
	try {
		gitRoot = execFileSync("git", ["rev-parse", "--git-common-dir"], {
			cwd: entry.path,
			timeout: 5000,
			encoding: "utf-8",
			stdio: ["pipe", "pipe", "pipe"],
		}).trim();
		if (gitRoot.endsWith("/.git") || gitRoot.endsWith("\\.git")) {
			gitRoot = gitRoot.slice(0, -5);
		}
	} catch {
		return;
	}

	if (!gitRoot) return;

	try {
		execFileSync("git", ["worktree-del", entry.branch], {
			cwd: gitRoot,
			timeout: 30_000,
			encoding: "utf-8",
			stdio: ["pipe", "pipe", "pipe"],
		});
	} catch {}

	try {
		execFileSync("tmux", ["kill-window", "-t", `${entry.session}:${entry.window}`], {
			timeout: 3000,
			stdio: ["pipe", "pipe", "pipe"],
		});
	} catch {}

	prCache.clear();
	doRefresh();
}

// ─── Focus ───────────────────────────────────────────────────────────────────

const piPaneArg = process.argv.indexOf("--pi-pane");
const piPaneId = piPaneArg !== -1 ? process.argv[piPaneArg + 1] : null;

function openPr() {
	const entry = getSelectedEntry();
	if (!entry?.pr?.url) return;
	try {
		execFileSync("open", [entry.pr.url], { timeout: 3000, stdio: ["pipe", "pipe", "pipe"] });
	} catch {}
}

function openLinear() {
	const entry = getSelectedEntry();
	if (!entry?.linearIssue) return;
	// Deep link to Linear app: linear.app redirects to the app if installed
	const url = `https://linear.app/issue/${entry.linearIssue.identifier}`;
	try {
		execFileSync("open", [url], { timeout: 3000, stdio: ["pipe", "pipe", "pipe"] });
	} catch {}
}

function focusPiPane() {
	if (!piPaneId) return;
	try {
		execFileSync("tmux", ["select-pane", "-t", piPaneId], {
			timeout: 3000,
			stdio: ["pipe", "pipe", "pipe"],
		});
	} catch {}
}

// ─── Pi Pane Watchdog ────────────────────────────────────────────────────────

function checkPiPane() {
	if (!piPaneId) return;
	try {
		execFileSync("tmux", ["display-message", "-t", piPaneId, "-p", ""], {
			stdio: ["pipe", "pipe", "pipe"],
		});
	} catch {
		quit();
	}
}

// ─── Setup & Cleanup ─────────────────────────────────────────────────────────

function quit() {
	exitAltScreen();
	showCursor();
	try {
		process.stdin.setRawMode(false);
	} catch {}
	process.stdin.pause();
	write(R);
	// Kill our own tmux pane to ensure clean shutdown
	const myPane = process.env.TMUX_PANE;
	if (myPane) {
		try {
			execFileSync("tmux", ["kill-pane", "-t", myPane], { stdio: ["pipe", "pipe", "pipe"] });
		} catch {}
	}
	process.exit(0);
}

function setup() {
	enterAltScreen();
	hideCursor();
	process.stdin.setRawMode(true);
	process.stdin.resume();
	process.stdin.on("data", handleInput);

	process.on("SIGWINCH", () => render());
	process.on("SIGTERM", () => quit());
	process.on("SIGINT", () => quit());
	process.on("SIGUSR1", () => {
		prCache.clear();
		doRefresh();
	});
}

// ─── State Polling ───────────────────────────────────────────────────────────
// Fast poll: re-read pi state from tmux window options every 2s.
// Also detect active window changes and clear alerts (like David's dashboard).

let lastActiveWindow = null;

function getActiveWindow() {
	try {
		return execFileSync("tmux", ["display-message", "-p", "#{session_name}:#{window_index}"], {
			encoding: "utf-8",
			timeout: 3000,
			stdio: ["pipe", "pipe", "pipe"],
		}).trim();
	} catch {
		return null;
	}
}

function pollStates() {
	// Detect window switch → clear alert on the now-active window
	const activeWindow = getActiveWindow();
	if (activeWindow && activeWindow !== lastActiveWindow && lastActiveWindow !== null) {
		// User switched to a new window — clear "idle" but keep "question"
		const currentState = readPiState(activeWindow);
		if (currentState === "idle") {
			try {
				execFileSync("tmux", ["set-option", "-wu", "-t", activeWindow, "@pi_state"], {
					stdio: ["pipe", "pipe", "pipe"],
				});
			} catch {}
		}
	}
	lastActiveWindow = activeWindow;

	// Re-read states for all entries
	let changed = false;
	for (const sec of sections) {
		for (const entry of sec.entries) {
			const newState = readPiState(entry.sessionWindow);
			if (newState !== entry.piState) {
				entry.piState = newState;
				changed = true;
			}
		}
	}
	if (changed) render();
}

// ─── Main ────────────────────────────────────────────────────────────────────

setup();
doRefresh();
setInterval(doRefresh, 60_000);
setInterval(pollStates, 2_000);
setInterval(checkPiPane, 5_000);
