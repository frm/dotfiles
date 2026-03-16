// ─── ANSI Helpers & Shared Rendering ─────────────────────────────────────────

export const R = "\x1b[0m";
export const style = (codes, t) => `${codes}${t}${R}`;
export const bold = (t) => style("\x1b[1m", t);
export const dim = (t) => style("\x1b[2m", t);
export const yellow = (t) => style("\x1b[33m", t);
export const cyan = (t) => style("\x1b[36m", t);
export const green = (t) => style("\x1b[32m", t);
export const red = (t) => style("\x1b[31m", t);
export const magenta = (t) => style("\x1b[35m", t);
export const orange = (t) => style("\x1b[38;5;214m", t);
export const boldCyan = (t) => style("\x1b[1;36m", t);
export const boldRed = (t) => style("\x1b[1;31m", t);
export const bgCyan = (t) => style("\x1b[46;30m", t);
export const bgMuted = (t) => style("\x1b[48;5;238;37m", t);

export const write = (s) => process.stdout.write(s);
export const enterAltScreen = () => write("\x1b[?1049h");
export const exitAltScreen = () => write("\x1b[?1049l");
export const hideCursor = () => write("\x1b[?25l");
export const showCursor = () => write("\x1b[?25h");
export const clearScreen = () => write("\x1b[2J\x1b[H");
export const moveTo = (r, c) => write(`\x1b[${r};${c}H`);
export const enableFocusReporting = () => write("\x1b[?1004h");
export const disableFocusReporting = () => write("\x1b[?1004l");

// Pane focus state — set by panel, read by tabs/ui for muted rendering
export let paneActive = false;
export function setPaneActive(v) { paneActive = v; }
export function selColor(t) { return paneActive ? cyan(t) : dim(t); }

// Border characters — double-line cyan when focused, single-line dim when not
export function bTop()  { return paneActive ? cyan("═") : dim("─"); }
export function bSide() { return paneActive ? cyan("║") : dim("│"); }
export function bTL()   { return paneActive ? cyan("╔") : dim("╭"); }
export function bTR()   { return paneActive ? cyan("╗") : dim("╮"); }
export function bBL()   { return paneActive ? cyan("╚") : dim("╰"); }
export function bBR()   { return paneActive ? cyan("╝") : dim("╯"); }
export function bLT()   { return paneActive ? cyan("╠") : dim("├"); }
export function bRT()   { return paneActive ? cyan("╣") : dim("┤"); }
export function bTopN(n: number) { return paneActive ? cyan("═".repeat(n)) : dim("─".repeat(n)); }

export function stripAnsi(s) { return s.replace(/\x1b\[[0-9;]*m/g, ""); }
export function visWidth(s) { return stripAnsi(s).length; }

export function truncate(s, maxW) {
	if (maxW <= 0) return "";
	const plain = stripAnsi(s);
	if (plain.length <= maxW) return s;
	return plain.slice(0, maxW - 1) + "…";
}

// ─── Path Truncation ─────────────────────────────────────────────────────────

export function smartTruncatePath(filePath, maxW) {
	if (filePath.length <= maxW) return filePath;
	const parts = filePath.split("/");
	if (parts.length === 1) return truncate(filePath, maxW);

	const fileName = parts[parts.length - 1];
	const dirs = parts.slice(0, -1);
	for (let i = 0; i < dirs.length; i++) {
		if (dirs[i].length > 1) dirs[i] = dirs[i][0];
		const candidate = dirs.join("/") + "/" + fileName;
		if (candidate.length <= maxW) return candidate;
	}
	const prefix = dirs.join("/") + "/";
	const remaining = maxW - prefix.length;
	if (remaining > 1) return prefix + truncate(fileName, remaining);
	return truncate(filePath, maxW);
}

// ─── Text Wrapping ───────────────────────────────────────────────────────────

export function wrapText(text, maxW) {
	if (text.length <= maxW) return [text];
	const indent = text.match(/^(\s*)/)[1];
	const lines = [];
	let remaining = text;
	while (remaining.length > 0) {
		if (remaining.length <= maxW) { lines.push(remaining); break; }
		let breakAt = remaining.lastIndexOf(" ", maxW);
		if (breakAt <= 0) breakAt = maxW;
		lines.push(remaining.slice(0, breakAt));
		remaining = indent + remaining.slice(breakAt).replace(/^ /, "");
	}
	return lines;
}

// ─── Spinner ─────────────────────────────────────────────────────────────

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export function createSpinner(onRender) {
	let frame = 0;
	let timer = null;
	let _message = "";
	let _colorFn = cyan;
	return {
		get frame() { return SPINNER_FRAMES[frame]; },
		get message() { return _message; },
		get colorFn() { return _colorFn; },
		start(message = "", colorFn = cyan) {
			frame = 0;
			_message = message;
			_colorFn = colorFn;
			timer = setInterval(() => { frame = (frame + 1) % SPINNER_FRAMES.length; onRender(); }, 80);
		},
		update(message, colorFn) {
			_message = message;
			if (colorFn) _colorFn = colorFn;
		},
		stop() {
			if (timer) { clearInterval(timer); timer = null; }
			_message = "";
		},
	};
}

// ─── Flash Messages ──────────────────────────────────────────────────────────

let _flashMessage: string | null = null;
let _flashColor: ((s: string) => string) | null = null;
let _flashTimer: ReturnType<typeof setTimeout> | null = null;

export function flash(msg: string, renderFn: () => void, duration = 1500, colorFn?: (s: string) => string) {
	_flashMessage = msg;
	_flashColor = colorFn ?? null;
	if (_flashTimer) clearTimeout(_flashTimer);
	_flashTimer = setTimeout(() => { _flashMessage = null; _flashColor = null; _flashTimer = null; renderFn(); }, duration);
	renderFn();
}

export function getFlashMessage(): string | null { return _flashMessage; }

export function bottomBorder(innerW: number) {
	const msg = _flashMessage;
	if (msg) {
		const colorFn = _flashColor ?? green;
		const label = ` ${msg} `;
		const dashes = Math.max(0, innerW - visWidth(label));
		return bBL() + colorFn(label) + bTopN(dashes) + bBR();
	}
	return bBL() + bTopN(innerW) + bBR();
}

// ─── Line Builders ───────────────────────────────────────────────────────────

export function emptyLine(innerW) {
	return bSide() + " ".repeat(innerW) + bSide();
}

export function contentLine(content, innerW) {
	const pad = " ".repeat(Math.max(0, innerW - visWidth(content)));
	return bSide() + content + pad + bSide();
}

export function dividerLine(innerW) {
	return bLT() + bTopN(innerW) + bRT();
}

// ─── Section Rendering ──────────────────────────────────────────────────────

export function renderSectionRow(sections, item, selected, innerW) {
	const sec = sections[item.sectionIdx];
	const arrow = sec.collapsed ? "▸" : "▾";
	const icon = sec.colorFn(sec.icon);
	const content = ` ${arrow} ${icon} ${bold(sec.label)} ${dim(`(${sec.entries.length})`)}`;
	const contentW = visWidth(content);
	const pad = " ".repeat(Math.max(0, innerW - contentW));
	const border = selected ? selColor("▐") : bSide();
	write(border + content + pad + bSide());
}

// ─── Navigation Builders ────────────────────────────────────────────────────

export function buildSectionNav(sections) {
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

export function buildSectionVisual(navItems, sections, hasDetailFn) {
	const rows = [];
	for (let i = 0; i < navItems.length; i++) {
		const item = navItems[i];
		if (item.type === "section") {
			rows.push({ navIdx: i, kind: "section" });
		} else {
			rows.push({ navIdx: i, kind: "entry" });
			const entry = sections[item.sectionIdx].entries[item.entryIdx];
			if (hasDetailFn(entry)) {
				rows.push({ navIdx: i, kind: "detail" });
			}
		}
	}
	return rows;
}
