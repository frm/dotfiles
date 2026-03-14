import { Markdown, matchesKey, Key, truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";
import { getMarkdownTheme } from "@mariozechner/pi-coding-agent";
import type { ExtensionContext } from "@mariozechner/pi-coding-agent";

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
			let inputLines: string[] = (existing ?? "").split("\n");
			let inputCursorRow = inputLines.length - 1;
			let inputCursorCol = inputLines[inputCursorRow].length;

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

					// Input area
					for (let r = 0; r < inputLines.length; r++) {
						const rawLine = inputLines[r];
						let lineText: string;
						if (r === inputCursorRow) {
							const before = rawLine.slice(0, inputCursorCol);
							const after = rawLine.slice(inputCursorCol + 1);
							lineText = before + theme.fg("accent", "█") + after;
						} else {
							lineText = rawLine;
						}
						const truncated = truncateToWidth(lineText, contentWidth);
						const pad = " ".repeat(Math.max(0, contentWidth - visibleWidth(truncated)));
						lines.push(theme.fg("dim", "│ ") + truncated + pad + theme.fg("dim", " │"));
					}

					// Footer
					const keys = theme.fg("muted", " Enter: save • Esc: cancel ");
					const fFill = "─".repeat(Math.max(0, width - visibleWidth(keys) - 2));
					lines.push(theme.fg("dim", "╰") + theme.fg("dim", fFill) + keys + theme.fg("dim", "╯"));

					return lines;
				},

				handleInput(data: string) {
					if (matchesKey(data, Key.escape)) {
						done(undefined);
						return;
					}
					if (matchesKey(data, Key.enter)) {
						done(inputLines.join("\n"));
						return;
					}
					if (matchesKey(data, Key.shift("enter"))) {
						const before = inputLines[inputCursorRow].slice(0, inputCursorCol);
						const after = inputLines[inputCursorRow].slice(inputCursorCol);
						inputLines[inputCursorRow] = before;
						inputLines.splice(inputCursorRow + 1, 0, after);
						inputCursorRow++;
						inputCursorCol = 0;
						tui.requestRender();
						return;
					}
					if (data === "\x7f" || data === "\b") {
						if (inputCursorCol > 0) {
							inputLines[inputCursorRow] =
								inputLines[inputCursorRow].slice(0, inputCursorCol - 1) +
								inputLines[inputCursorRow].slice(inputCursorCol);
							inputCursorCol--;
						} else if (inputCursorRow > 0) {
							inputCursorCol = inputLines[inputCursorRow - 1].length;
							inputLines[inputCursorRow - 1] += inputLines[inputCursorRow];
							inputLines.splice(inputCursorRow, 1);
							inputCursorRow--;
						}
						tui.requestRender();
						return;
					}
					if (matchesKey(data, Key.left)) {
						if (inputCursorCol > 0) inputCursorCol--;
						else if (inputCursorRow > 0) { inputCursorRow--; inputCursorCol = inputLines[inputCursorRow].length; }
						tui.requestRender();
						return;
					}
					if (matchesKey(data, Key.right)) {
						if (inputCursorCol < inputLines[inputCursorRow].length) inputCursorCol++;
						else if (inputCursorRow < inputLines.length - 1) { inputCursorRow++; inputCursorCol = 0; }
						tui.requestRender();
						return;
					}
					if (matchesKey(data, Key.up)) {
						if (inputCursorRow > 0) { inputCursorRow--; inputCursorCol = Math.min(inputCursorCol, inputLines[inputCursorRow].length); }
						tui.requestRender();
						return;
					}
					if (matchesKey(data, Key.down)) {
						if (inputCursorRow < inputLines.length - 1) { inputCursorRow++; inputCursorCol = Math.min(inputCursorCol, inputLines[inputCursorRow].length); }
						tui.requestRender();
						return;
					}
					if (data.length === 1 && data.charCodeAt(0) >= 32) {
						inputLines[inputCursorRow] =
							inputLines[inputCursorRow].slice(0, inputCursorCol) +
							data +
							inputLines[inputCursorRow].slice(inputCursorCol);
						inputCursorCol++;
						tui.requestRender();
						return;
					}
				},

				invalidate() { lastWidth = 0; },
			};
		}).then(resolve);
	});
}
