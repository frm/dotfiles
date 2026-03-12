import {
	dim, cyan, green, red, boldCyan,
	visWidth, truncate, write, moveTo,
	clearScreen, hideCursor,
} from "../../lib/ui.mjs";

// ─── State ───────────────────────────────────────────────────────────────────

export let active = false;
export let lines = [];
export let title = "";
export let scroll = 0;

export function open(newTitle, newLines) {
	title = newTitle;
	lines = newLines;
	scroll = 0;
	active = true;
}

export function close() {
	active = false;
	lines = [];
	title = "";
	scroll = 0;
}

// ─── Rendering ───────────────────────────────────────────────────────────────

export function render() {
	const width = process.stdout.columns || 30;
	const height = process.stdout.rows || 24;
	const innerW = Math.max(1, width - 2);

	clearScreen();
	hideCursor();

	let row = 1;

	// Header
	const hTitle = boldCyan(` ${title} `);
	const hFill = "─".repeat(Math.max(0, innerW - visWidth(hTitle)));
	moveTo(row++, 1);
	write(dim("╭") + hTitle + dim(hFill + "╮"));

	const contentHeight = Math.max(1, height - 2);
	const maxScroll = Math.max(0, lines.length - contentHeight);
	if (scroll > maxScroll) scroll = maxScroll;
	if (scroll < 0) scroll = 0;

	const visibleCount = Math.min(lines.length - scroll, contentHeight);
	let contentRow = 0;

	for (let i = 0; i < visibleCount; i++) {
		const line = lines[scroll + i];
		moveTo(row++, 1);
		contentRow++;
		renderLine(line, innerW);
	}

	while (contentRow < contentHeight) {
		moveTo(row++, 1);
		write(dim("│") + " ".repeat(innerW) + dim("│"));
		contentRow++;
	}

	// Footer
	const pos = lines.length > 0
		? `${scroll + 1}-${scroll + visibleCount}/${lines.length}`
		: "0/0";
	const hint = dim(` ${pos}  q:back  j/k:scroll  g/G:top/bottom `);
	const fFill = "─".repeat(Math.max(0, innerW - visWidth(hint)));
	moveTo(row++, 1);
	write(dim("╰") + hint + dim(fFill + "╯"));
}

function renderLine(line, innerW) {
	const content = " " + truncate(line, innerW - 1);
	const pad = " ".repeat(Math.max(0, innerW - visWidth(content)));

	let colored;
	if (line.startsWith("+++") || line.startsWith("---")) colored = dim(content);
	else if (line.startsWith("+")) colored = green(content);
	else if (line.startsWith("-")) colored = red(content);
	else if (line.startsWith("@@")) colored = cyan(content);
	else if (line.startsWith("diff ") || line.startsWith("index ")) colored = dim(content);
	else colored = content;

	write(dim("│") + colored + pad + dim("│"));
}

// ─── Input ───────────────────────────────────────────────────────────────────

export function handleInput(buf, ch) {
	if (buf.length === 3 && buf[0] === 0x1b && buf[1] === 0x5b) {
		if (buf[2] === 0x41) { scroll = Math.max(0, scroll - 1); render(); return true; }
		if (buf[2] === 0x42) { scroll++; render(); return true; }
	}
	if (ch === "k") { scroll = Math.max(0, scroll - 1); render(); return true; }
	if (ch === "j") { scroll++; render(); return true; }
	if (ch === "g") { scroll = 0; render(); return true; }
	if (ch === "G") {
		const contentHeight = Math.max(1, (process.stdout.rows || 24) - 2);
		scroll = Math.max(0, lines.length - contentHeight);
		render();
		return true;
	}
	if (ch === "d") {
		const jump = Math.max(3, (process.stdout.rows || 24) - 4);
		scroll += jump;
		render();
		return true;
	}
	if (ch === "u") {
		const jump = Math.max(3, (process.stdout.rows || 24) - 4);
		scroll = Math.max(0, scroll - jump);
		render();
		return true;
	}
	if (ch === "q" || (buf.length === 1 && buf[0] === 0x1b)) {
		close();
		return true; // caller should re-render
	}
	return false;
}
