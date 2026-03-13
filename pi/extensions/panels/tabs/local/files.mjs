import { statSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { git, gitRaw, gitRoot, absPath } from "../../lib/git.ts";
import {
	dim, cyan, green, yellow, red, magenta,
	visWidth, smartTruncatePath, truncate, write, selColor,
	bSide,
} from "../../lib/ui.ts";

// ─── Data Fetching ───────────────────────────────────────────────────────────

export function fetchChangedFiles() {
	try {
		const raw = git("status", "--porcelain");
		if (!raw) return [];

		const stagedPaths = new Set();
		try {
			const stagedRaw = git("diff", "--cached", "--name-only");
			if (stagedRaw) for (const p of stagedRaw.split("\n")) if (p) stagedPaths.add(p);
		} catch {}

		const files = [];
		for (const line of raw.split("\n")) {
			if (!line) continue;
			const x = line[0], y = line[1], xy = line.substring(0, 2).trim();
			const rest = line.substring(3);
			let status, path = rest, origPath;

			if (x === "R" || y === "R") {
				const parts = rest.split(" -> ");
				status = "R"; path = parts[1]?.trim() ?? rest; origPath = parts[0]?.trim();
			} else if (xy === "??") { status = "??"; }
			else if (xy.includes("U") || xy === "AA" || xy === "DD") { status = "U"; }
			else if (y === "M") { status = "M"; }
			else if (y === "D") { status = "D"; }
			else if (x === "A" && y === " ") { status = "A"; }
			else if (x === "D" && y === " ") { status = "D"; }
			else if (x === "M" && y === " ") { status = "M"; }
			else { status = "M"; }

			const staged = stagedPaths.has(path);
			const hasWorkingTreeChanges = y !== " " && y !== "?";
			let isDir = false;
			if (path.endsWith("/")) { isDir = true; path = path.replace(/\/$/, ""); }
			else { try { isDir = statSync(absPath(path)).isDirectory(); } catch {} }

			files.push({ status, path, origPath, isDir, expanded: false, children: null, staged, hasWorkingTreeChanges, xy });
		}
		return files;
	} catch { return []; }
}

export function listDirChildren(dirPath) {
	try {
		const entries = readdirSync(absPath(dirPath), { withFileTypes: true });
		return entries
			.filter((e) => !e.name.startsWith("."))
			.sort((a, b) => {
				if (a.isDirectory() && !b.isDirectory()) return -1;
				if (!a.isDirectory() && b.isDirectory()) return 1;
				return a.name.localeCompare(b.name);
			})
			.map((e) => ({
				name: e.name,
				fullPath: join(dirPath, e.name),
				isDir: e.isDirectory(),
				expanded: false,
				children: null,
			}));
	} catch { return []; }
}

export function fetchFileDiff(file) {
	try {
		let raw;
		if (file.status === "??") {
			try { raw = git("diff", "--no-index", "/dev/null", file.path); }
			catch (err) { raw = err.stdout ?? ""; }
		} else {
			raw = git("diff", "HEAD", "--", file.path);
			if (!raw.trim()) raw = git("diff", "--cached", "--", file.path);
		}
		const lines = raw.split("\n");
		if (lines.length > 500) return [...lines.slice(0, 500), "", `... (${lines.length - 500} more lines truncated)`];
		return lines;
	} catch { return ["(unable to generate diff)"]; }
}

// ─── Nav Building ────────────────────────────────────────────────────────────

export function buildNavItems(files) {
	const items = [];
	for (const file of files) {
		items.push({ node: file, depth: 0, isDir: file.isDir, path: file.path, isTopLevel: true });
		if (file.isDir && file.expanded && file.children) {
			appendChildren(items, file.children, 1);
		}
	}
	return items;
}

function appendChildren(items, children, depth) {
	for (const child of children) {
		items.push({ node: child, depth, isDir: child.isDir, path: child.fullPath, isTopLevel: false });
		if (child.isDir && child.expanded && child.children) {
			appendChildren(items, child.children, depth + 1);
		}
	}
}

// ─── Staging ─────────────────────────────────────────────────────────────────

export function stage(nav) {
	try { gitRaw("add", "--", nav.path); } catch {}
}

export function unstage(nav) {
	try { gitRaw("restore", "--staged", "--", nav.path); } catch {}
}

export function stageAll() {
	try { gitRaw("add", "."); } catch {}
}

// ─── Rendering ───────────────────────────────────────────────────────────────

export function renderFileEntry(file, selected, innerW) {
	let icon, colorFn;
	if (file.isDir) {
		icon = file.expanded ? "▾" : "▸";
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
	const prefix = selected ? selColor(" → ") : "   ";
	const stagedMark = file.staged ? green("● ") : "  ";
	const statusStr = colorFn(icon) + " ";
	const prefixW = visWidth(prefix) + visWidth(stagedMark) + visWidth(statusStr);
	const displayPath = file.isDir ? file.path + "/" : file.path;
	const path = smartTruncatePath(displayPath, innerW - prefixW);
	const pad = " ".repeat(Math.max(0, innerW - prefixW - visWidth(path)));
	const border = selected ? selColor("▐") : bSide();
	write(border + prefix + stagedMark + statusStr + path + pad + bSide());
}

export function renderTreeNodeEntry(node, depth, selected, innerW) {
	const indent = "  ".repeat(depth);
	const prefix = selected ? selColor(indent + " → ") : indent + "   ";
	const icon = node.isDir ? (node.expanded ? dim("▾ ") : dim("▸ ")) : dim("· ");
	const prefixW = visWidth(prefix) + visWidth(icon);
	const displayName = node.isDir ? node.name + "/" : node.name;
	const name = truncate(displayName, innerW - prefixW);
	const pad = " ".repeat(Math.max(0, innerW - prefixW - visWidth(name)));
	const border = selected ? selColor("▐") : bSide();
	write(border + prefix + icon + name + pad + bSide());
}
