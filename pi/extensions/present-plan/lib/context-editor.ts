import { Markdown, matchesKey, Key, truncateToWidth, visibleWidth, decodeKittyPrintable, getEditorKeybindings } from "@mariozechner/pi-tui";
import { getMarkdownTheme } from "@mariozechner/pi-coding-agent";
import type { ExtensionContext } from "@mariozechner/pi-coding-agent";

// ─── Shared helpers ──────────────────────────────────────────

interface WrapSegment {
	text: string;
	startCol: number; // column offset in the original logical line
}

/** Wrap a plain-text line into segments that fit within maxWidth. */
function wrapPlainLine(line: string, maxWidth: number): WrapSegment[] {
	if (maxWidth <= 0 || line.length <= maxWidth) {
		return [{ text: line, startCol: 0 }];
	}
	const segments: WrapSegment[] = [];
	let pos = 0;
	while (pos < line.length) {
		const remaining = line.length - pos;
		if (remaining <= maxWidth) {
			segments.push({ text: line.slice(pos), startCol: pos });
			break;
		}
		let breakAt = pos + maxWidth;
		const chunk = line.slice(pos, breakAt);
		const lastSpace = chunk.lastIndexOf(" ");
		if (lastSpace > 0) {
			breakAt = pos + lastSpace + 1;
		}
		segments.push({ text: line.slice(pos, breakAt), startCol: pos });
		pos = breakAt;
	}
	return segments;
}

function wordBoundaryLeft(line: string, col: number): number {
	if (col <= 0) return 0;
	let pos = col - 1;
	while (pos > 0 && /\s/.test(line[pos])) pos--;
	while (pos > 0 && !/\s/.test(line[pos - 1])) pos--;
	return pos;
}

function wordBoundaryRight(line: string, col: number): number {
	const len = line.length;
	if (col >= len) return len;
	let pos = col;
	while (pos < len && !/\s/.test(line[pos])) pos++;
	while (pos < len && /\s/.test(line[pos])) pos++;
	return pos;
}

interface InputState {
	lines: string[];
	cursorRow: number;
	cursorCol: number;
	wrapWidth: number; // set during render, used for visual-line navigation
}

/** Find which wrap segment the cursor falls on. */
function findCursorSegment(segments: WrapSegment[], cursorCol: number): number {
	for (let i = 0; i < segments.length; i++) {
		const seg = segments[i];
		const isLast = i === segments.length - 1;
		if (cursorCol >= seg.startCol && cursorCol < seg.startCol + seg.text.length) return i;
		if (isLast && cursorCol >= seg.startCol) return i;
	}
	return segments.length - 1;
}

/** Clamp a visual column into the valid range for a target segment. */
function clampToSegment(segments: WrapSegment[], segIdx: number, visualCol: number, lineLength: number): number {
	const seg = segments[segIdx];
	const isLast = segIdx === segments.length - 1;
	// For non-last segments, max is the last char in the segment (one before next segment start).
	// For the last segment, cursor can sit one past the last char (end-of-line).
	const maxCol = isLast ? lineLength : seg.startCol + seg.text.length - 1;
	return Math.min(seg.startCol + visualCol, maxCol);
}

/**
 * Handle a keypress for the shared input buffer.
 * Returns what happened so the caller can act on save/cancel.
 */
function handleEditorKeyInput(
	state: InputState,
	data: string,
	requestRender: () => void,
): "save" | "cancel" | "changed" | "unhandled" {
	const kb = getEditorKeybindings();

	if (matchesKey(data, Key.escape)) return "cancel";
	if (kb.matches(data, "submit")) return "save";

	// ── New line (Shift+Enter) ──
	if (kb.matches(data, "newLine")) {
		const before = state.lines[state.cursorRow].slice(0, state.cursorCol);
		const after = state.lines[state.cursorRow].slice(state.cursorCol);
		state.lines[state.cursorRow] = before;
		state.lines.splice(state.cursorRow + 1, 0, after);
		state.cursorRow++;
		state.cursorCol = 0;
		requestRender();
		return "changed";
	}

	// ── Deletion ──

	if (kb.matches(data, "deleteToLineStart")) {
		if (state.cursorCol > 0) {
			state.lines[state.cursorRow] = state.lines[state.cursorRow].slice(state.cursorCol);
			state.cursorCol = 0;
		} else if (state.cursorRow > 0) {
			state.cursorCol = state.lines[state.cursorRow - 1].length;
			state.lines[state.cursorRow - 1] += state.lines[state.cursorRow];
			state.lines.splice(state.cursorRow, 1);
			state.cursorRow--;
		}
		requestRender();
		return "changed";
	}

	if (kb.matches(data, "deleteToLineEnd")) {
		if (state.cursorCol < state.lines[state.cursorRow].length) {
			state.lines[state.cursorRow] = state.lines[state.cursorRow].slice(0, state.cursorCol);
		} else if (state.cursorRow < state.lines.length - 1) {
			state.lines[state.cursorRow] += state.lines[state.cursorRow + 1];
			state.lines.splice(state.cursorRow + 1, 1);
		}
		requestRender();
		return "changed";
	}

	if (kb.matches(data, "deleteWordBackward")) {
		if (state.cursorCol > 0) {
			const newCol = wordBoundaryLeft(state.lines[state.cursorRow], state.cursorCol);
			state.lines[state.cursorRow] =
				state.lines[state.cursorRow].slice(0, newCol) +
				state.lines[state.cursorRow].slice(state.cursorCol);
			state.cursorCol = newCol;
		} else if (state.cursorRow > 0) {
			state.cursorCol = state.lines[state.cursorRow - 1].length;
			state.lines[state.cursorRow - 1] += state.lines[state.cursorRow];
			state.lines.splice(state.cursorRow, 1);
			state.cursorRow--;
		}
		requestRender();
		return "changed";
	}

	if (kb.matches(data, "deleteWordForward")) {
		if (state.cursorCol < state.lines[state.cursorRow].length) {
			const newCol = wordBoundaryRight(state.lines[state.cursorRow], state.cursorCol);
			state.lines[state.cursorRow] =
				state.lines[state.cursorRow].slice(0, state.cursorCol) +
				state.lines[state.cursorRow].slice(newCol);
		} else if (state.cursorRow < state.lines.length - 1) {
			state.lines[state.cursorRow] += state.lines[state.cursorRow + 1];
			state.lines.splice(state.cursorRow + 1, 1);
		}
		requestRender();
		return "changed";
	}

	if (kb.matches(data, "deleteCharBackward") || matchesKey(data, Key.shift("backspace"))) {
		if (state.cursorCol > 0) {
			state.lines[state.cursorRow] =
				state.lines[state.cursorRow].slice(0, state.cursorCol - 1) +
				state.lines[state.cursorRow].slice(state.cursorCol);
			state.cursorCol--;
		} else if (state.cursorRow > 0) {
			state.cursorCol = state.lines[state.cursorRow - 1].length;
			state.lines[state.cursorRow - 1] += state.lines[state.cursorRow];
			state.lines.splice(state.cursorRow, 1);
			state.cursorRow--;
		}
		requestRender();
		return "changed";
	}

	if (kb.matches(data, "deleteCharForward")) {
		if (state.cursorCol < state.lines[state.cursorRow].length) {
			state.lines[state.cursorRow] =
				state.lines[state.cursorRow].slice(0, state.cursorCol) +
				state.lines[state.cursorRow].slice(state.cursorCol + 1);
		} else if (state.cursorRow < state.lines.length - 1) {
			state.lines[state.cursorRow] += state.lines[state.cursorRow + 1];
			state.lines.splice(state.cursorRow + 1, 1);
		}
		requestRender();
		return "changed";
	}

	// ── Cursor movement ──

	if (kb.matches(data, "cursorLineStart")) {
		state.cursorCol = 0;
		requestRender();
		return "changed";
	}

	if (kb.matches(data, "cursorLineEnd")) {
		state.cursorCol = state.lines[state.cursorRow].length;
		requestRender();
		return "changed";
	}

	if (kb.matches(data, "cursorWordLeft")) {
		if (state.cursorCol > 0) {
			state.cursorCol = wordBoundaryLeft(state.lines[state.cursorRow], state.cursorCol);
		} else if (state.cursorRow > 0) {
			state.cursorRow--;
			state.cursorCol = state.lines[state.cursorRow].length;
		}
		requestRender();
		return "changed";
	}

	if (kb.matches(data, "cursorWordRight")) {
		if (state.cursorCol < state.lines[state.cursorRow].length) {
			state.cursorCol = wordBoundaryRight(state.lines[state.cursorRow], state.cursorCol);
		} else if (state.cursorRow < state.lines.length - 1) {
			state.cursorRow++;
			state.cursorCol = 0;
		}
		requestRender();
		return "changed";
	}

	if (kb.matches(data, "cursorLeft")) {
		if (state.cursorCol > 0) state.cursorCol--;
		else if (state.cursorRow > 0) {
			state.cursorRow--;
			state.cursorCol = state.lines[state.cursorRow].length;
		}
		requestRender();
		return "changed";
	}

	if (kb.matches(data, "cursorRight")) {
		if (state.cursorCol < state.lines[state.cursorRow].length) state.cursorCol++;
		else if (state.cursorRow < state.lines.length - 1) {
			state.cursorRow++;
			state.cursorCol = 0;
		}
		requestRender();
		return "changed";
	}

	if (kb.matches(data, "cursorUp")) {
		if (state.wrapWidth > 0) {
			const segments = wrapPlainLine(state.lines[state.cursorRow], state.wrapWidth);
			const segIdx = findCursorSegment(segments, state.cursorCol);
			const visualCol = state.cursorCol - segments[segIdx].startCol;
			if (segIdx > 0) {
				// Move to previous visual segment within the same logical line
				state.cursorCol = clampToSegment(segments, segIdx - 1, visualCol, state.lines[state.cursorRow].length);
			} else if (state.cursorRow > 0) {
				// Move to last visual segment of previous logical line
				state.cursorRow--;
				const prevSegs = wrapPlainLine(state.lines[state.cursorRow], state.wrapWidth);
				state.cursorCol = clampToSegment(prevSegs, prevSegs.length - 1, visualCol, state.lines[state.cursorRow].length);
			}
		} else if (state.cursorRow > 0) {
			state.cursorRow--;
			state.cursorCol = Math.min(state.cursorCol, state.lines[state.cursorRow].length);
		}
		requestRender();
		return "changed";
	}

	if (kb.matches(data, "cursorDown")) {
		if (state.wrapWidth > 0) {
			const segments = wrapPlainLine(state.lines[state.cursorRow], state.wrapWidth);
			const segIdx = findCursorSegment(segments, state.cursorCol);
			const visualCol = state.cursorCol - segments[segIdx].startCol;
			if (segIdx < segments.length - 1) {
				// Move to next visual segment within the same logical line
				state.cursorCol = clampToSegment(segments, segIdx + 1, visualCol, state.lines[state.cursorRow].length);
			} else if (state.cursorRow < state.lines.length - 1) {
				// Move to first visual segment of next logical line
				state.cursorRow++;
				const nextSegs = wrapPlainLine(state.lines[state.cursorRow], state.wrapWidth);
				state.cursorCol = clampToSegment(nextSegs, 0, visualCol, state.lines[state.cursorRow].length);
			}
		} else if (state.cursorRow < state.lines.length - 1) {
			state.cursorRow++;
			state.cursorCol = Math.min(state.cursorCol, state.lines[state.cursorRow].length);
		}
		requestRender();
		return "changed";
	}

	// ── Character input ──

	const kittyPrintable = decodeKittyPrintable(data);
	if (kittyPrintable !== undefined) {
		state.lines[state.cursorRow] =
			state.lines[state.cursorRow].slice(0, state.cursorCol) +
			kittyPrintable +
			state.lines[state.cursorRow].slice(state.cursorCol);
		state.cursorCol += kittyPrintable.length;
		requestRender();
		return "changed";
	}

	if (data.length === 1 && data.charCodeAt(0) >= 32) {
		state.lines[state.cursorRow] =
			state.lines[state.cursorRow].slice(0, state.cursorCol) +
			data +
			state.lines[state.cursorRow].slice(state.cursorCol);
		state.cursorCol++;
		requestRender();
		return "changed";
	}

	return "unhandled";
}

/** Render input lines with word-wrapping and block cursor. */
function renderWrappedInput(
	state: InputState,
	contentWidth: number,
	theme: any,
): string[] {
	state.wrapWidth = contentWidth;
	const result: string[] = [];
	for (let r = 0; r < state.lines.length; r++) {
		const segments = wrapPlainLine(state.lines[r], contentWidth);
		let cursorRendered = false;
		for (let si = 0; si < segments.length; si++) {
			const seg = segments[si];
			const isLast = si === segments.length - 1;
			const isCursorRow = r === state.cursorRow;
			const cursorInSegment =
				isCursorRow &&
				((state.cursorCol >= seg.startCol && state.cursorCol < seg.startCol + seg.text.length) ||
					(isLast && state.cursorCol === seg.startCol + seg.text.length));

			let lineText: string;
			if (cursorInSegment) {
				const localCol = state.cursorCol - seg.startCol;
				if (localCol < seg.text.length) {
					// Cursor is on a character — replace it with block cursor
					const before = seg.text.slice(0, localCol);
					const after = seg.text.slice(localCol + 1);
					lineText = before + theme.fg("accent", "█") + after;
					cursorRendered = true;
				} else if (seg.text.length < contentWidth) {
					// Cursor at end, room to append block cursor
					lineText = seg.text + theme.fg("accent", "█");
					cursorRendered = true;
				} else {
					// Cursor at end of full-width segment — overflow to next visual line
					lineText = seg.text;
				}
			} else {
				lineText = seg.text;
			}

			const pad = " ".repeat(Math.max(0, contentWidth - visibleWidth(lineText)));
			result.push(theme.fg("dim", "│ ") + lineText + pad + theme.fg("dim", " │"));
		}
		// Cursor overflowed past a full-width segment — render on its own line
		if (r === state.cursorRow && !cursorRendered) {
			const cursorText = theme.fg("accent", "█");
			const pad = " ".repeat(Math.max(0, contentWidth - 1));
			result.push(theme.fg("dim", "│ ") + cursorText + pad + theme.fg("dim", " │"));
		}
	}
	return result;
}

// ─── Exported editors ────────────────────────────────────────

export async function showSimpleEditor(
	ctx: ExtensionContext,
	title: string,
	existing?: string,
): Promise<string | undefined> {
	return new Promise<string | undefined>((resolve) => {
		ctx.ui.custom<string | undefined>((tui, theme, _kb, done) => {
			const state: InputState = {
				lines: (existing ?? "").split("\n"),
				cursorRow: 0,
				cursorCol: 0,
				wrapWidth: 0,
			};
			state.cursorRow = state.lines.length - 1;
			state.cursorCol = state.lines[state.cursorRow].length;

			return {
				render(width: number): string[] {
					const contentWidth = Math.max(20, width - 4);
					const lines: string[] = [];

					// Header
					const titleText = theme.fg("accent", theme.bold(` ${title} `));
					const hFill = "─".repeat(Math.max(0, width - visibleWidth(titleText) - 4));
					lines.push(theme.fg("dim", "╭─") + titleText + theme.fg("dim", hFill + "─╮"));

					// Input area (wrapped)
					lines.push(...renderWrappedInput(state, contentWidth, theme));

					// Footer
					const keys = theme.fg("muted", " Enter: save • Esc: cancel ");
					const fFill = "─".repeat(Math.max(0, width - visibleWidth(keys) - 2));
					lines.push(theme.fg("dim", "╰") + theme.fg("dim", fFill) + keys + theme.fg("dim", "╯"));

					return lines;
				},

				handleInput(data: string) {
					const result = handleEditorKeyInput(state, data, () => tui.requestRender());
					if (result === "cancel") { done(undefined); return; }
					if (result === "save") { done(state.lines.join("\n")); return; }
				},

				invalidate() {},
			};
		}).then(resolve);
	});
}

export async function showContextEditor(
	ctx: ExtensionContext,
	contextMarkdown: string,
	existing?: string,
): Promise<string | undefined> {
	return new Promise<string | undefined>((resolve) => {
		ctx.ui.custom<string | undefined>((tui, theme, _kb, done) => {
			const mdTheme = getMarkdownTheme();
			let contextLines: string[] = [];
			let lastWidth = 0;
			const state: InputState = {
				lines: (existing ?? "").split("\n"),
				cursorRow: 0,
				cursorCol: 0,
				wrapWidth: 0,
			};
			state.cursorRow = state.lines.length - 1;
			state.cursorCol = state.lines[state.cursorRow].length;

			function renderContext(width: number) {
				if (width !== lastWidth) {
					const contentWidth = Math.max(20, width - 4);
					const md = new Markdown(contextMarkdown, 1, 0, mdTheme);
					contextLines = md.render(contentWidth);
					lastWidth = width;
				}
			}

			return {
				render(width: number): string[] {
					renderContext(width);
					const contentWidth = Math.max(20, width - 4);
					const lines: string[] = [];

					// Header
					const title = theme.fg("accent", theme.bold(" Comment "));
					const hFill = "─".repeat(Math.max(0, width - visibleWidth(title) - 4));
					lines.push(theme.fg("dim", "╭─") + title + theme.fg("dim", hFill + "─╮"));

					// Context section
					for (const cl of contextLines) {
						const truncated = truncateToWidth(cl, contentWidth);
						const pad = " ".repeat(Math.max(0, contentWidth - visibleWidth(truncated)));
						lines.push(theme.fg("dim", "│ ") + truncated + pad + theme.fg("dim", " │"));
					}

					// Separator
					const sep = "─".repeat(Math.max(0, width - 2));
					lines.push(theme.fg("dim", "├" + sep + "┤"));

					// Input area (wrapped)
					lines.push(...renderWrappedInput(state, contentWidth, theme));

					// Footer
					const keys = theme.fg("muted", " Enter: save • Esc: cancel ");
					const fFill = "─".repeat(Math.max(0, width - visibleWidth(keys) - 2));
					lines.push(theme.fg("dim", "╰") + theme.fg("dim", fFill) + keys + theme.fg("dim", "╯"));

					return lines;
				},

				handleInput(data: string) {
					const result = handleEditorKeyInput(state, data, () => tui.requestRender());
					if (result === "cancel") { done(undefined); return; }
					if (result === "save") { done(state.lines.join("\n")); return; }
				},

				invalidate() { lastWidth = 0; },
			};
		}).then(resolve);
	});
}
