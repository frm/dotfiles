#!/usr/bin/env node
import { execFileSync, fork } from "node:child_process";
import { fileURLToPath } from "node:url";
import { statSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";

// ─── ANSI Helpers ────────────────────────────────────────────────────────────

const R = "\x1b[0m";
const style = (codes, t) => `${codes}${t}${R}`;
const bold = (t) => style("\x1b[1m", t);
const dim = (t) => style("\x1b[2m", t);
const yellow = (t) => style("\x1b[33m", t);
const cyan = (t) => style("\x1b[36m", t);
const green = (t) => style("\x1b[32m", t);
const red = (t) => style("\x1b[31m", t);
const magenta = (t) => style("\x1b[35m", t);
const boldCyan = (t) => style("\x1b[1;36m", t);
const bgCyan = (t) => style("\x1b[46;30m", t);

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
	const plain = stripAnsi(s);
	if (plain.length <= maxW) return s;
	return plain.slice(0, maxW - 1) + "…";
}

/**
 * Smart path truncation: shortens directory names to first letter from left
 * until the path fits. Filename is always kept intact (truncated with … only
 * as last resort). e.g. "ai/skills/writing-plans/SKILL.md" → "a/s/writing-plans/SKILL.md"
 */
function smartTruncatePath(filePath, maxW) {
	if (filePath.length <= maxW) return filePath;

	const parts = filePath.split("/");
	if (parts.length === 1) {
		// Just a filename, no dirs to shorten
		return truncate(filePath, maxW);
	}

	const fileName = parts[parts.length - 1];
	const dirs = parts.slice(0, -1);

	// Shorten directories left to right until it fits
	for (let i = 0; i < dirs.length; i++) {
		if (dirs[i].length > 1) {
			dirs[i] = dirs[i][0];
		}
		const candidate = dirs.join("/") + "/" + fileName;
		if (candidate.length <= maxW) return candidate;
	}

	// All dirs shortened, still too long — truncate filename
	const prefix = dirs.join("/") + "/";
	const remaining = maxW - prefix.length;
	if (remaining > 1) {
		return prefix + truncate(fileName, remaining);
	}
	// Extremely narrow — just truncate the whole thing
	return truncate(filePath, maxW);
}

// ─── Shell Helpers ───────────────────────────────────────────────────────────

const PIPE = ["pipe", "pipe", "pipe"];

function git(...args) {
	return execFileSync("git", args, {
		timeout: 5000, encoding: "utf-8", cwd: gitRoot, stdio: PIPE,
	}).replace(/\n$/, "");
}

function gitRaw(...args) {
	return execFileSync("git", args, {
		timeout: 5000, cwd: gitRoot, stdio: PIPE,
	});
}

function tmux(...args) {
	return execFileSync("tmux", args, {
		timeout: 3000, encoding: "utf-8", stdio: PIPE,
	}).trim();
}

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

function openUrl(url) {
	try { execFileSync("open", [url], { timeout: 3000, stdio: PIPE }); } catch {}
}

// ─── Git Root ────────────────────────────────────────────────────────────────

let gitRoot = "";
try {
	gitRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], {
		timeout: 3000, encoding: "utf-8", stdio: PIPE,
	}).trim();
} catch {
	gitRoot = process.cwd();
}

/** Resolve a git-relative path to an absolute path */
function absPath(relPath) {
	return join(gitRoot, relPath);
}

// ─── Data Types & Fetching ───────────────────────────────────────────────────

/**
 * @typedef {{
 *   status: string,
 *   path: string,
 *   origPath?: string,
 *   isDir: boolean,
 *   expanded: boolean,
 *   children?: TreeNode[],
 *   staged: boolean,
 *   hasWorkingTreeChanges: boolean,
 *   xy: string,
 * }} ChangedFile
 *
 * @typedef {{
 *   name: string,
 *   fullPath: string,
 *   isDir: boolean,
 *   expanded: boolean,
 *   children?: TreeNode[],
 * }} TreeNode
 *
 * @typedef {{ name: string, status: "pass"|"fail"|"pending", conclusion: string, detailsUrl?: string }} PrCheck
 * @typedef {{ number: number, title: string, checks: PrCheck[] }} PrInfo
 */

function fetchChangedFiles() {
	try {
		const raw = git("status", "--porcelain");

		if (!raw) return [];

		// Get the definitive list of staged files from git
		const stagedPaths = new Set();
		try {
			const stagedRaw = git("diff", "--cached", "--name-only");
			if (stagedRaw) {
				for (const p of stagedRaw.split("\n")) {
					if (p) stagedPaths.add(p);
				}
			}
		} catch {}

		/** @type {ChangedFile[]} */
		const files = [];
		for (const line of raw.split("\n")) {
			if (!line) continue;
			const rawXY = line.substring(0, 2);
			const x = rawXY[0]; // index (staged) status
			const y = rawXY[1]; // working tree status
			const xy = rawXY.trim();
			const rest = line.substring(3);

			let status;
			let path = rest;
			let origPath;

			if (x === "R" || y === "R") {
				const parts = rest.split(" -> ");
				status = "R";
				path = parts[1]?.trim() ?? rest;
				origPath = parts[0]?.trim();
			} else if (xy === "??") {
				status = "??";
			} else if (xy.includes("U") || xy === "AA" || xy === "DD") {
				status = "U";
			} else if (y === "M") {
				// Working tree has modifications (may also be staged)
				status = "M";
			} else if (y === "D") {
				status = "D";
			} else if (x === "A" && y === " ") {
				// Purely staged new file, no working tree changes
				status = "A";
			} else if (x === "D" && y === " ") {
				status = "D";
			} else if (x === "M" && y === " ") {
				// Purely staged modification
				status = "M";
			} else {
				status = "M";
			}

			const staged = stagedPaths.has(path);
			const hasWorkingTreeChanges = y !== " " && y !== "?";

			// Check if path is a directory
			let isDir = false;
			if (path.endsWith("/")) {
				isDir = true;
				path = path.replace(/\/$/, "");
			} else {
				try {
					isDir = statSync(absPath(path)).isDirectory();
				} catch {}
			}

			files.push({ status, path, origPath, isDir, expanded: false, children: null, staged, hasWorkingTreeChanges, xy });
		}
		return files;
	} catch {
		return [];
	}
}

/** @param {string} dirPath — git-relative path @returns {TreeNode[]} */
function listDirChildren(dirPath) {
	try {
		const absDirPath = absPath(dirPath);
		const entries = readdirSync(absDirPath, { withFileTypes: true });
		return entries
			.filter((e) => !e.name.startsWith("."))
			.sort((a, b) => {
				if (a.isDirectory() && !b.isDirectory()) return -1;
				if (!a.isDirectory() && b.isDirectory()) return 1;
				return a.name.localeCompare(b.name);
			})
			.map((e) => ({
				name: e.name,
				fullPath: join(dirPath, e.name), // keep as git-relative
				isDir: e.isDirectory(),
				expanded: false,
				children: null,
			}));
	} catch {
		return [];
	}
}

/** @returns {PrInfo | null} */
function fetchPrInfo() {
	try {
		const raw = execFileSync("gh",
			["pr", "view", "--json", "number,title,state,statusCheckRollup"],
			{ timeout: 15000, encoding: "utf-8", cwd: gitRoot, stdio: PIPE },
		).trim();
		if (!raw) return null;

		const data = JSON.parse(raw);
		if (data.state !== "OPEN") return null;

		/** @type {PrCheck[]} */
		const checks = [];
		if (Array.isArray(data.statusCheckRollup)) {
			for (const item of data.statusCheckRollup) {
				const name = item.name || item.context || "Unknown";
				const conclusion = (item.conclusion || "").toLowerCase();
				const checkStatus = (item.status || "").toLowerCase();

				let status;
				if (["success", "neutral", "skipped"].includes(conclusion)) {
					status = "pass";
				} else if (["failure", "timed_out", "cancelled", "action_required"].includes(conclusion)) {
					status = "fail";
				} else if (checkStatus === "completed" && !conclusion) {
					status = "pass";
				} else {
					status = "pending";
				}

				checks.push({
					name,
					status,
					conclusion: conclusion || checkStatus || "unknown",
					detailsUrl: item.detailsUrl || item.targetUrl,
				});
			}
		}

		return { number: data.number, title: data.title, checks };
	} catch {
		return null;
	}
}

/**
 * @param {ChangedFile} file
 * @returns {string[]}
 */
function fetchFileDiff(file) {
	try {
		let raw;
		if (file.status === "??") {
			try {
				raw = git("diff", "--no-index", "/dev/null", file.path);
			} catch (err) {
				raw = err.stdout ?? "";
			}
		} else {
			raw = git("diff", "HEAD", "--", file.path);
			if (!raw.trim()) {
				raw = git("diff", "--cached", "--", file.path);
			}
		}
		const lines = raw.split("\n");
		if (lines.length > 500) {
			return [...lines.slice(0, 500), "", `... (${lines.length - 500} more lines truncated)`];
		}
		return lines;
	} catch {
		return ["(unable to generate diff)"];
	}
}

// ─── Worker mode: fetch data in forked child and send back via IPC ──────────

const selfPath = fileURLToPath(import.meta.url);

if (process.argv.includes("--fetch-data")) {
	try {
		const files = fetchChangedFiles();
		const pr = fetchPrInfo();
		process.send({ files, pr });
	} catch {
		process.send({ files: [], pr: null });
	}
	process.exit(0);
}

// ─── UI State ────────────────────────────────────────────────────────────────

/** @type {"files"|"checks"} */
let activeTab = "files";
/** @type {ChangedFile[]} */
let changedFiles = [];
/** @type {PrInfo | null} */
let prInfo = null;
let selectedIdx = 0;
let scrollOffset = 0;
let loading = true;

// Detail view state
let detailMode = false;
/** @type {string[]} */
let detailLines = [];
let detailTitle = "";
let detailScroll = 0;

/**
 * @typedef {{ node: ChangedFile | TreeNode, depth: number, isDir: boolean, path: string, isTopLevel: boolean }} NavItem
 */

/**
 * Build the flat display list for files tab, recursively expanding directories.
 * @returns {NavItem[]}
 */
function buildFileNavItems() {
	const items = [];
	for (const file of changedFiles) {
		items.push({ node: file, depth: 0, isDir: file.isDir, path: file.path, isTopLevel: true });
		if (file.isDir && file.expanded && file.children) {
			appendChildren(items, file.children, 1);
		}
	}
	return items;
}

/** @param {NavItem[]} items @param {TreeNode[]} children @param {number} depth */
function appendChildren(items, children, depth) {
	for (const child of children) {
		items.push({ node: child, depth, isDir: child.isDir, path: child.fullPath, isTopLevel: false });
		if (child.isDir && child.expanded && child.children) {
			appendChildren(items, child.children, depth + 1);
		}
	}
}

function currentListLength() {
	if (activeTab === "files") return buildFileNavItems().length;
	return prInfo?.checks?.length ?? 0;
}

function clampSelection() {
	const len = currentListLength();
	if (selectedIdx >= len) selectedIdx = Math.max(0, len - 1);
	if (selectedIdx < 0) selectedIdx = 0;
}

// ─── Data Refresh ────────────────────────────────────────────────────────────

let refreshing = false;

function doRefresh() {
	if (loading) {
		render();
		setTimeout(() => {
			changedFiles = fetchChangedFiles();
			prInfo = fetchPrInfo();
			if (changedFiles.length === 0 && prInfo) {
				activeTab = "checks";
			}
			if (activeTab === "checks" && !prInfo) activeTab = "files";
			clampSelection();
			loading = false;
			render();
		}, 0);
		return;
	}

	if (refreshing) return;
	refreshing = true;

	// Collect expanded paths before refresh
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

	// Fork a child process so the UI stays responsive
	const child = fork(selfPath, ["--fetch-data"], {
		stdio: ["pipe", "pipe", "pipe", "ipc"],
		timeout: 30_000,
	});
	child.on("message", (data) => {
		changedFiles = data.files;
		prInfo = data.pr;

		// Restore expansion state recursively
		function restoreExpansion(nodes) {
			if (!nodes) return;
			for (const n of nodes) {
				const p = n.path || n.fullPath;
				if (expandedPaths.has(p) && n.isDir) {
					n.expanded = true;
					n.children = listDirChildren(p);
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

// ─── Rendering: List View ────────────────────────────────────────────────────

function render() {
	if (detailMode) {
		renderDetail();
		return;
	}
	renderList();
}

function renderList() {
	const width = process.stdout.columns || 30;
	const height = process.stdout.rows || 24;
	const innerW = Math.max(1, width - 2);

	clearScreen();
	hideCursor();

	let row = 1;

	// Header with tabs
	const filesLabel = activeTab === "files" ? bgCyan(" Changes ") : dim(" Changes ");
	const checksLabel = prInfo
		? activeTab === "checks" ? bgCyan(" Checks ") : dim(" Checks ")
		: "";
	const tabBar = filesLabel + (checksLabel ? dim("│") + checksLabel : "");
	const tabBarW = visWidth(tabBar);
	const hFill = "─".repeat(Math.max(0, innerW - tabBarW));
	moveTo(row++, 1);
	write(dim("╭") + tabBar + dim(hFill + "╮"));

	// Content
	const contentHeight = Math.max(1, height - 2);
	let contentRow = 0;

	if (loading) {
		moveTo(row++, 1);
		const msg = dim(" Loading...");
		const pad = " ".repeat(Math.max(0, innerW - visWidth(msg)));
		write(dim("│") + msg + pad + dim("│"));
		contentRow++;
	} else if (activeTab === "files") {
		const navItems = buildFileNavItems();

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
			const maxScroll = Math.max(0, navItems.length - maxVisible);
			if (scrollOffset > maxScroll) scrollOffset = maxScroll;
			if (scrollOffset < 0) scrollOffset = 0;

			const visibleCount = Math.min(navItems.length - scrollOffset, maxVisible);

			for (let vi = 0; vi < visibleCount; vi++) {
				const i = scrollOffset + vi;
				const nav = navItems[i];
				const selected = i === selectedIdx;
				moveTo(row++, 1);
				contentRow++;

				if (nav.isTopLevel) {
					writeFileEntry(nav.node, selected, innerW);
				} else {
					writeTreeNodeEntry(nav.node, nav.depth, selected, innerW);
				}
			}
		}
	} else {
		// Checks tab
		const checks = prInfo?.checks ?? [];

		if (checks.length === 0) {
			moveTo(row++, 1);
			const msg = dim(" No checks");
			const pad = " ".repeat(Math.max(0, innerW - visWidth(msg)));
			write(dim("│") + msg + pad + dim("│"));
			contentRow++;
		} else {
			const maxVisible = Math.max(1, contentHeight);
			if (selectedIdx < scrollOffset) scrollOffset = selectedIdx;
			if (selectedIdx >= scrollOffset + maxVisible) scrollOffset = selectedIdx - maxVisible + 1;
			const maxScroll = Math.max(0, checks.length - maxVisible);
			if (scrollOffset > maxScroll) scrollOffset = maxScroll;
			if (scrollOffset < 0) scrollOffset = 0;

			const visibleCount = Math.min(checks.length - scrollOffset, maxVisible);

			for (let vi = 0; vi < visibleCount; vi++) {
				const i = scrollOffset + vi;
				const selected = i === selectedIdx;
				moveTo(row++, 1);
				contentRow++;
				writeCheckEntry(checks[i], selected, innerW);
			}
		}
	}

	// Fill remaining
	while (contentRow < contentHeight) {
		moveTo(row++, 1);
		write(dim("│") + " ".repeat(innerW) + dim("│"));
		contentRow++;
	}

	// Footer
	moveTo(row++, 1);
	const footFill = "─".repeat(Math.max(0, innerW));
	write(dim("╰" + footFill + "╯"));
}

function writeFileEntry(file, selected, innerW) {
	let icon, colorFn;
	if (file.isDir) {
		const arrow = file.expanded ? "▾" : "▸";
		icon = arrow;
		colorFn = file.status === "??" ? dim : yellow;
	} else {
		switch (file.status) {
			case "A": icon = "A"; colorFn = green; break;
			case "D": icon = "D"; colorFn = red; break;
			case "M": icon = "M"; colorFn = yellow; break;
			case "R": icon = "R"; colorFn = magenta; break;
			case "U": icon = "U"; colorFn = red; break;
			case "??": icon = "?"; colorFn = dim; break;
			default: icon = "·"; colorFn = dim;
		}
	}

	const prefix = selected ? cyan(" → ") : "   ";
	const stagedMark = file.staged ? green("● ") : "  ";
	const statusStr = colorFn(icon) + " ";
	const prefixW = visWidth(prefix) + visWidth(stagedMark) + visWidth(statusStr);
	const maxPathW = innerW - prefixW;
	const displayPath = file.isDir ? file.path + "/" : file.path;
	const path = smartTruncatePath(displayPath, maxPathW);

	const pathW = visWidth(path);
	const pad = " ".repeat(Math.max(0, innerW - prefixW - pathW));
	const border = selected ? cyan("▐") : dim("│");
	write(border + prefix + stagedMark + statusStr + path + pad + dim("│"));
}

function writeTreeNodeEntry(node, depth, selected, innerW) {
	const indent = "  ".repeat(depth);
	const prefix = selected ? cyan(indent + " → ") : indent + "   ";
	let icon;
	if (node.isDir) {
		icon = node.expanded ? dim("▾ ") : dim("▸ ");
	} else {
		icon = dim("· ");
	}
	const prefixW = visWidth(prefix) + visWidth(icon);
	const maxNameW = innerW - prefixW;
	const displayName = node.isDir ? node.name + "/" : node.name;
	const name = truncate(displayName, maxNameW);
	const nameW = visWidth(name);
	const pad = " ".repeat(Math.max(0, innerW - prefixW - nameW));
	const border = selected ? cyan("▐") : dim("│");
	write(border + prefix + icon + name + pad + dim("│"));
}

function writeCheckEntry(check, selected, innerW) {
	let icon, colorFn;
	switch (check.status) {
		case "pass": icon = "✓"; colorFn = green; break;
		case "fail": icon = "✗"; colorFn = red; break;
		case "pending": icon = "●"; colorFn = yellow; break;
		default: icon = "?"; colorFn = dim;
	}

	const prefix = selected ? cyan(" → ") : "   ";
	const statusStr = colorFn(icon) + " ";
	const prefixW = visWidth(prefix) + visWidth(statusStr);
	const maxNameW = innerW - prefixW;
	const name = truncate(check.name, maxNameW);
	const nameW = visWidth(name);
	const pad = " ".repeat(Math.max(0, innerW - prefixW - nameW));
	const border = selected ? cyan("▐") : dim("│");
	write(border + prefix + statusStr + name + pad + dim("│"));
}

// ─── Rendering: Detail View ─────────────────────────────────────────────────

function renderDetail() {
	const width = process.stdout.columns || 30;
	const height = process.stdout.rows || 24;
	const innerW = Math.max(1, width - 2);

	clearScreen();
	hideCursor();

	let row = 1;

	// Header
	const title = boldCyan(` ${detailTitle} `);
	const titleW = visWidth(title);
	const hFill = "─".repeat(Math.max(0, innerW - titleW));
	moveTo(row++, 1);
	write(dim("╭") + title + dim(hFill + "╮"));

	// Content
	const contentHeight = Math.max(1, height - 2);
	const maxScroll = Math.max(0, detailLines.length - contentHeight);
	if (detailScroll > maxScroll) detailScroll = maxScroll;
	if (detailScroll < 0) detailScroll = 0;

	const visibleCount = Math.min(detailLines.length - detailScroll, contentHeight);
	let contentRow = 0;

	for (let i = 0; i < visibleCount; i++) {
		const line = detailLines[detailScroll + i];
		moveTo(row++, 1);
		contentRow++;
		writeDetailLine(line, innerW);
	}

	// Fill remaining
	while (contentRow < contentHeight) {
		moveTo(row++, 1);
		write(dim("│") + " ".repeat(innerW) + dim("│"));
		contentRow++;
	}

	// Footer
	moveTo(row++, 1);
	const pos = detailLines.length > 0
		? `${detailScroll + 1}-${detailScroll + visibleCount}/${detailLines.length}`
		: "0/0";
	const hint = dim(` ${pos}  q:back  j/k:scroll  g/G:top/bottom `);
	const hintW = visWidth(hint);
	const fFill = "─".repeat(Math.max(0, innerW - hintW));
	write(dim("╰") + hint + dim(fFill + "╯"));
}

function writeDetailLine(line, innerW) {
	const content = " " + truncate(line, innerW - 1);
	const contentW = visWidth(content);
	const pad = " ".repeat(Math.max(0, innerW - contentW));

	let colored;
	if (line.startsWith("+++") || line.startsWith("---")) {
		colored = dim(content);
	} else if (line.startsWith("+")) {
		colored = green(content);
	} else if (line.startsWith("-")) {
		colored = red(content);
	} else if (line.startsWith("@@")) {
		colored = cyan(content);
	} else if (line.startsWith("diff ") || line.startsWith("index ")) {
		colored = dim(content);
	} else {
		colored = content;
	}

	write(dim("│") + colored + pad + dim("│"));
}

// ─── Input Handling ──────────────────────────────────────────────────────────

function handleInput(data) {
	const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);

	if (detailMode) {
		handleDetailInput(buf, data.toString());
		return;
	}

	handleListInput(buf, data.toString());
}

let pendingG = false;

function handleListInput(buf, ch) {
	// Arrow keys
	if (buf.length === 3 && buf[0] === 0x1b && buf[1] === 0x5b) {
		pendingG = false;
		if (buf[2] === 0x41) return moveUp(); // up
		if (buf[2] === 0x42) return moveDown(); // down
	}

	// gg — jump to top (two consecutive 'g' presses)
	if (ch === "g") {
		if (pendingG) {
			pendingG = false;
			return jumpToTop();
		}
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
	// Shift+Tab
	if (buf.length === 3 && buf[0] === 0x1b && buf[1] === 0x5b && buf[2] === 0x5a) return switchTab();
	if (ch === "a") return toggleStage();
	if (ch === "A") return stageAll();
	if (ch === "l") return openLazygit();
	if (ch === "v") return tmuxPopup(["nvim"]);
	if (ch === "c") return triggerCommit();
	if (ch === "r") return doRefresh();
	// Ctrl+D (0x04) — half page down
	if (buf.length === 1 && buf[0] === 0x04) return halfPageDown();
	// Ctrl+U (0x15) — half page up
	if (buf.length === 1 && buf[0] === 0x15) return halfPageUp();
	// Ctrl+G (0x07) — focus back to pi pane
	if (buf.length === 1 && buf[0] === 0x07) return focusPiPane();
	if (ch === "q" || (buf.length === 1 && buf[0] === 0x03)) {
		quit();
	}
}

function handleDetailInput(buf, ch) {
	// Arrow keys
	if (buf.length === 3 && buf[0] === 0x1b && buf[1] === 0x5b) {
		if (buf[2] === 0x41) { detailScroll = Math.max(0, detailScroll - 1); render(); return; }
		if (buf[2] === 0x42) { detailScroll++; render(); return; }
	}

	if (ch === "k") { detailScroll = Math.max(0, detailScroll - 1); render(); return; }
	if (ch === "j") { detailScroll++; render(); return; }
	if (ch === "g") { detailScroll = 0; render(); return; }
	if (ch === "G") {
		const contentHeight = Math.max(1, (process.stdout.rows || 24) - 2);
		detailScroll = Math.max(0, detailLines.length - contentHeight);
		render();
		return;
	}
	if (ch === "d") {
		const jump = Math.max(3, (process.stdout.rows || 24) - 4);
		detailScroll += jump;
		render();
		return;
	}
	if (ch === "u") {
		const jump = Math.max(3, (process.stdout.rows || 24) - 4);
		detailScroll = Math.max(0, detailScroll - jump);
		render();
		return;
	}
	if (ch === "q" || (buf.length === 1 && buf[0] === 0x1b)) {
		detailMode = false;
		render();
		return;
	}
}

function moveUp() {
	if (currentListLength() === 0) return;
	selectedIdx = Math.max(0, selectedIdx - 1);
	render();
}

function moveDown() {
	const len = currentListLength();
	if (len === 0) return;
	selectedIdx = Math.min(len - 1, selectedIdx + 1);
	render();
}

function jumpToTop() {
	selectedIdx = 0;
	scrollOffset = 0;
	render();
}

function jumpToBottom() {
	const len = currentListLength();
	if (len === 0) return;
	selectedIdx = len - 1;
	render();
}

function halfPageDown() {
	const len = currentListLength();
	if (len === 0) return;
	const jump = Math.max(1, Math.floor((process.stdout.rows || 24) / 2));
	selectedIdx = Math.min(len - 1, selectedIdx + jump);
	render();
}

function halfPageUp() {
	if (currentListLength() === 0) return;
	const jump = Math.max(1, Math.floor((process.stdout.rows || 24) / 2));
	selectedIdx = Math.max(0, selectedIdx - jump);
	render();
}

function switchTab() {
	if (activeTab === "files" && prInfo) {
		activeTab = "checks";
	} else {
		activeTab = "files";
	}
	selectedIdx = 0;
	scrollOffset = 0;
	render();
}

function toggleExpand() {
	if (activeTab !== "files") return;

	const navItems = buildFileNavItems();
	if (selectedIdx >= navItems.length) return;
	const nav = navItems[selectedIdx];

	if (!nav.isDir) return;

	const node = nav.node;
	node.expanded = !node.expanded;
	if (node.expanded && !node.children) {
		node.children = listDirChildren(nav.path);
	}
	render();
}

function openLazygit() {
	tmuxPopup(["lazygit"]);
}

function openDiff() {
	if (activeTab !== "files") return;

	const navItems = buildFileNavItems();
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
		const navItems = buildFileNavItems();
		if (selectedIdx >= navItems.length) return;
		const nav = navItems[selectedIdx];

		if (nav.isDir) {
			toggleExpand();
			return;
		}

		tmuxPopup(["nvim", absPath(nav.path)]);
	} else {
		const checks = prInfo?.checks ?? [];
		if (selectedIdx >= checks.length) return;
		const check = checks[selectedIdx];
		if (check?.detailsUrl) openUrl(check.detailsUrl);
	}
}

function stageAll() {
	if (activeTab !== "files") return;
	try { gitRaw("add", "."); } catch {}
	doRefresh();
}

function toggleStage() {
	if (activeTab !== "files") return;

	const navItems = buildFileNavItems();
	if (selectedIdx >= navItems.length) return;
	const nav = navItems[selectedIdx];

	const filePath = nav.path;

	// Determine whether to stage or unstage:
	// - Not staged → git add
	// - Staged + has working tree changes → git add (stage the remaining changes)
	// - Staged + clean working tree → git restore --staged (unstage)
	let shouldUnstage = false;
	if (nav.isTopLevel) {
		shouldUnstage = nav.node.staged && !nav.node.hasWorkingTreeChanges;
	} else {
		try {
			const isStagedChild = git("diff", "--cached", "--name-only", "--", filePath).length > 0;
			const hasWtChanges = git("diff", "--name-only", "--", filePath).length > 0;
			shouldUnstage = isStagedChild && !hasWtChanges;
		} catch {
			shouldUnstage = false;
		}
	}

	try {
		if (shouldUnstage) {
			gitRaw("restore", "--staged", "--", filePath);
		} else {
			gitRaw("add", "--", filePath);
		}
	} catch {}

	doRefresh();
}

function triggerCommit() {
	if (!piPaneId) return;
	try {
		tmux("send-keys", "-t", piPaneId, "/commit", "Enter");
		focusPiPane();
	} catch {}
}

function focusPiPane() {
	if (!piPaneId) return;
	try { tmux("select-pane", "-t", piPaneId); } catch {}
}

// ─── Pi Pane Watchdog ────────────────────────────────────────────────────────

const piPaneArg = process.argv.indexOf("--pi-pane");
const piPaneId = piPaneArg !== -1 ? process.argv[piPaneArg + 1] : null;

function checkPiPane() {
	if (!piPaneId) return;
	try { tmux("display-message", "-t", piPaneId, "-p", ""); } catch { quit(); }
}

// ─── Setup & Cleanup ─────────────────────────────────────────────────────────

function cleanup() {
	exitAltScreen();
	showCursor();
	try { process.stdin.setRawMode(false); } catch {}
	process.stdin.pause();
	write(R);
}

function quit() {
	cleanup();
	const myPane = process.env.TMUX_PANE;
	if (myPane) {
		try {
			tmux("kill-pane", "-t", myPane);
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
	process.on("SIGUSR1", () => doRefresh());
}

// ─── Main ────────────────────────────────────────────────────────────────────

setup();
doRefresh();
setInterval(doRefresh, 5_000);
setInterval(checkPiPane, 5_000);
