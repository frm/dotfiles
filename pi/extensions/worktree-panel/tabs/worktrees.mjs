import { execFileSync } from "node:child_process";
import { extractIssueId, extractDescription, readPiState } from "../lib/data.mjs";
import { lookupIssue } from "../lib/linear.mjs";
import { prList, prChecks } from "../lib/gh.mjs";
import {
	dim, cyan, green, yellow, magenta, red, boldRed,
	truncate, visWidth, write, moveTo, selColor,
	emptyLine, contentLine, renderSectionRow,
	buildSectionNav, buildSectionVisual,
} from "../lib/ui.mjs";

// ─── PR Lookup (per-worktree branch) ────────────────────────────────────────

const prCache = new Map();
const PR_CACHE_TTL = 30_000;

export function clearPrCache() { prCache.clear(); }

function lookupPr(branch, cwd) {
	const key = `${cwd}:${branch}`;
	const cached = prCache.get(key);
	if (cached && Date.now() - cached.ts < PR_CACHE_TTL) return cached.result;

	const prs = prList({ state: "all", head: branch, json: "number,state,mergedAt,url,mergeable", limit: 1 }, cwd);
	if (prs.length === 0) { prCache.set(key, { result: null, ts: Date.now() }); return null; }

	const pr = prs[0];
	let checks = { status: null, passing: 0, total: 0 };
	if (pr.state === "OPEN") checks = prChecks(pr.number, cwd);
	const result = { number: pr.number, state: pr.state, checks, url: pr.url ?? null, mergeable: pr.mergeable ?? null };
	prCache.set(key, { result, ts: Date.now() });
	return result;
}

function prSymbol(pr) {
	if (!pr) return null;
	switch (pr.state) {
		case "MERGED": return { symbol: "⇑", colorFn: magenta };
		case "CLOSED": return { symbol: "⊘", colorFn: red };
		case "OPEN":
			switch (pr.checks.status) {
				case "fail": return { symbol: "✗", colorFn: red };
				case "pending": return { symbol: "⧖", colorFn: (t) => t };
				case "pass":
					if (pr.mergeable === "CONFLICTING") return { symbol: "⇄", colorFn: red };
					return { symbol: "✓", colorFn: green };
				default:
					if (pr.mergeable === "CONFLICTING") return { symbol: "⇄", colorFn: red };
					return null;
			}
		default: return null;
	}
}

function prSubline(pr) {
	if (!pr) return null;
	const sym = prSymbol(pr);
	const colorFn = sym?.colorFn ?? cyan;
	const prefix = sym ? colorFn(sym.symbol) + " " : "";
	let rest = colorFn(`#${pr.number}`);
	if (pr.checks.total > 0) rest += dim(` (${pr.checks.passing}/${pr.checks.total})`);
	return { text: prefix + rest };
}

// ─── Fetch ───────────────────────────────────────────────────────────────────

export function fetchWorktrees() {
	let raw;
	try {
		raw = execFileSync("tmux", ["list-windows", "-a", "-F", "#{session_name}\t#{window_name}\t#{pane_current_path}\t#{window_index}"], {
			timeout: 5000, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"],
		}).trim();
	} catch { return []; }
	if (!raw) return [];

	const entries = [];
	const seen = new Set();
	for (const line of raw.split("\n")) {
		const [session, window_, path, windowIndex] = line.split("\t");
		if (!session || !window_ || !path || !path.includes(".worktrees/")) continue;
		if (seen.has(path)) continue;
		seen.add(path);

		let branch;
		try {
			branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
				cwd: path, timeout: 5000, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"],
			}).trim();
		} catch { continue; }

		const pr = lookupPr(branch, path);
		let status = "in-progress";
		if (pr?.state === "MERGED") status = "done";
		else if (pr?.state === "OPEN") status = "in-review";

		const sessionWindow = `${session}:${windowIndex}`;
		const piState = readPiState(sessionWindow);
		const issueId = extractIssueId(branch);
		const linearIssue = issueId ? lookupIssue(issueId) : null;
		entries.push({ session, window: window_, path, branch, status, pr, piState, linearIssue, sessionWindow });
	}
	return entries;
}

// ─── State ───────────────────────────────────────────────────────────────────

const SECTION_DEFS = [
	{ key: "done", label: "Done", icon: "✓", colorFn: green },
	{ key: "in-review", label: "In Review", icon: "◐", colorFn: cyan },
	{ key: "in-progress", label: "In Progress", icon: "●", colorFn: yellow },
];

export const state = {
	sections: SECTION_DEFS.map((s) => ({ ...s, entries: [], collapsed: s.key === "done" })),
	navItems: [],
	visualRows: [],
	selectedIdx: 0,
	scrollOffset: 0,
};

function hasDetail(entry) { return !!(entry.pr || entry.linearIssue); }

export function rebuildNav() {
	state.navItems = buildSectionNav(state.sections);
	state.visualRows = buildSectionVisual(state.navItems, state.sections, hasDetail);
	if (state.selectedIdx >= state.navItems.length) state.selectedIdx = Math.max(0, state.navItems.length - 1);
	if (state.selectedIdx < 0) state.selectedIdx = 0;
}

export function applyEntries(entries) {
	const groups = { "in-progress": [], "in-review": [], done: [] };
	for (const e of entries) groups[e.status].push(e);
	for (const sec of state.sections) sec.entries = groups[sec.key];
	rebuildNav();
}

export function getSelectedEntry() {
	const item = state.navItems[state.selectedIdx];
	if (!item || item.type !== "entry") return null;
	return state.sections[item.sectionIdx].entries[item.entryIdx];
}

// ─── Rendering ───────────────────────────────────────────────────────────────

export function renderTab(startRow, innerW, contentHeight, confirmingDelete) {
	let row = startRow;
	let contentRow = 0;
	const { sections, navItems, visualRows } = state;
	let { selectedIdx, scrollOffset } = state;

	if (confirmingDelete) {
		const entry = getSelectedEntry();
		if (entry) {
			moveTo(row++, 1); write(contentLine(boldRed(" Delete worktree?"), innerW)); contentRow++;
			moveTo(row++, 1); write(contentLine(" " + truncate(entry.branch, innerW - 2), innerW)); contentRow++;
			moveTo(row++, 1); write(emptyLine(innerW)); contentRow++;
			moveTo(row++, 1); write(contentLine(dim(" y/n"), innerW)); contentRow++;
		}
		return contentRow;
	}

	if (visualRows.length === 0) {
		moveTo(row++, 1); write(contentLine(dim(" No worktrees"), innerW));
		return 1;
	}

	// Scroll
	const selFirst = visualRows.findIndex((r) => r.navIdx === selectedIdx);
	const selLast = visualRows.findLastIndex((r) => r.navIdx === selectedIdx);
	if (selFirst !== -1) {
		if (selFirst < scrollOffset) scrollOffset = selFirst;
		if (selLast >= scrollOffset + contentHeight) scrollOffset = selLast - contentHeight + 1;
	}
	scrollOffset = Math.max(0, Math.min(scrollOffset, Math.max(0, visualRows.length - contentHeight)));
	state.scrollOffset = scrollOffset;

	const visibleCount = Math.min(visualRows.length - scrollOffset, contentHeight);
	for (let vi = 0; vi < visibleCount; vi++) {
		const vr = visualRows[scrollOffset + vi];
		const selected = vr.navIdx === selectedIdx;
		const item = navItems[vr.navIdx];
		moveTo(row++, 1); contentRow++;

		if (vr.kind === "section") renderSectionRow(sections, item, selected, innerW);
		else if (vr.kind === "entry") renderEntryRow(item, selected, innerW);
		else if (vr.kind === "detail") renderDetailRow(item, innerW);
	}
	return contentRow;
}

function renderEntryRow(item, selected, innerW) {
	const entry = state.sections[item.sectionIdx].entries[item.entryIdx];
	const cursor = selected ? selColor("→ ") : "  ";
	let stateIcon = "", stateW = 0;
	if (entry.piState === "idle") { stateIcon = cyan("◆") + " "; stateW = 2; }
	else if (entry.piState === "question") { stateIcon = cyan("⁇") + " "; stateW = 2; }
	const name = truncate(extractDescription(entry.branch), innerW - 3 - stateW);
	const pad = " ".repeat(Math.max(0, innerW - 3 - stateW - visWidth(name)));
	write(dim("│") + " " + cursor + stateIcon + name + pad + dim("│"));
}

function renderDetailRow(item, innerW) {
	const entry = state.sections[item.sectionIdx].entries[item.entryIdx];
	const parts = [];
	const sub = prSubline(entry.pr);
	if (sub) parts.push(sub.text);
	if (entry.linearIssue) parts.push(dim(entry.linearIssue.identifier));
	const indent = "     ";
	const full = indent + parts.join(dim(" • "));
	const pad = " ".repeat(Math.max(0, innerW - visWidth(full)));
	write(dim("│") + full + pad + dim("│"));
}
