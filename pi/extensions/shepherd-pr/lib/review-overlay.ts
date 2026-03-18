import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Key, matchesKey, truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";

import type { AmbiguousReview } from "./types.ts";

const REVIEW_OVERLAY_WIDTH = 95;

function wrap(raw: string, width: number): string[] {
	if (width <= 0) return [raw];
	const out: string[] = [];
	for (const piece of raw.split("\n")) {
		if (piece.length <= width) {
			out.push(piece);
			continue;
		}
		let left = piece;
		while (left.length > width) {
			let split = left.lastIndexOf(" ", width);
			if (split <= 0) split = width;
			out.push(left.slice(0, split));
			left = left.slice(split).trimStart();
		}
		if (left) out.push(left);
	}
	return out.length > 0 ? out : [""];
}

export async function pickCommentFromOverlay(ctx: ExtensionContext, comments: AmbiguousReview[]): Promise<number | null> {
	return await ctx.ui.custom<number | null>(
		(tui, theme, _kb, done) => {
			let scrollOffset = 0;
			let selected = 0;
			let blockLineOffsets: number[] = [];

			function renderLines(innerWidth: number): string[] {
				const lines: string[] = [];
				blockLineOffsets = [];

				lines.push(theme.fg("accent", theme.bold("Ambiguous Review Comments")));
				lines.push(theme.fg("muted", "Enter: actions   j/k: scroll   n/p: select   q: close"));
				lines.push("");

				for (let i = 0; i < comments.length; i++) {
					const item = comments[i];
					const isSelected = i === selected;
					blockLineOffsets.push(lines.length);

					const marker = isSelected ? theme.fg("warning", "▶") : " ";
					const lineNo = item.comment.line ?? item.comment.original_line ?? "?";
					const header = `${marker} #${item.comment.id} ${item.comment.path}:${lineNo}  @${item.comment.user.login}`;
					lines.push(theme.fg(isSelected ? "warning" : "accent", header));
					lines.push(theme.fg("dim", "  reason: ") + theme.fg("muted", item.reason));
					lines.push(theme.fg("dim", "  comment:"));
					for (const line of wrap(item.comment.body.trim(), Math.max(20, innerWidth - 4))) {
						lines.push("    " + line);
					}
					if (item.comment.diff_hunk?.trim()) {
						lines.push(theme.fg("dim", "  diff hunk:"));
						for (const hunkLine of wrap(item.comment.diff_hunk.trim(), Math.max(20, innerWidth - 4)).slice(0, 10)) {
							lines.push(theme.fg("muted", "    " + hunkLine));
						}
					}
					lines.push("");
				}

				return lines;
			}

			return {
				render(width: number) {
					const maxHeight = Math.max(12, Math.floor((tui as any).height * 0.88));
					const boxWidth = Math.max(80, Math.floor((width * REVIEW_OVERLAY_WIDTH) / 100));
					const innerWidth = boxWidth - 4;
					const all = renderLines(innerWidth);
					const contentHeight = maxHeight - 2;
					const maxScroll = Math.max(0, all.length - contentHeight);
					scrollOffset = Math.min(scrollOffset, maxScroll);

					const out: string[] = [];
					const topTitle = ` shepherd review (${comments.length}) `;
					const topFill = "─".repeat(Math.max(0, innerWidth - visibleWidth(topTitle)));
					out.push(theme.fg("dim", "╭─") + theme.fg("accent", theme.bold(topTitle)) + theme.fg("dim", topFill + "─╮"));

					const window = all.slice(scrollOffset, scrollOffset + contentHeight);
					for (const line of window) {
						const truncated = truncateToWidth(line, innerWidth);
						const pad = " ".repeat(Math.max(0, innerWidth - visibleWidth(truncated)));
						out.push(theme.fg("dim", "│ ") + truncated + pad + theme.fg("dim", " │"));
					}
					for (let i = window.length; i < contentHeight; i++) {
						out.push(theme.fg("dim", "│ ") + " ".repeat(innerWidth) + theme.fg("dim", " │"));
					}

					const end = Math.min(scrollOffset + contentHeight, all.length);
					const pos = `${scrollOffset + 1}-${end}/${all.length}`;
					const footer = " q close  Enter actions  n/p select ";
					const fill = "─".repeat(Math.max(0, innerWidth - visibleWidth(footer) - visibleWidth(pos) - 1));
					out.push(theme.fg("dim", "╰─") + theme.fg("muted", footer) + theme.fg("dim", fill) + theme.fg("muted", ` ${pos} `) + theme.fg("dim", "─╯"));

					return out.map((line) => truncateToWidth(line, width));
				},
				handleInput(data: string) {
					const termHeight = (tui as any).height ?? 30;
					const contentHeight = Math.max(5, Math.floor(termHeight * 0.88) - 2);
					const allLineCount = renderLines(80).length;
					const maxScroll = Math.max(0, allLineCount - contentHeight);

					if (matchesKey(data, Key.escape) || data === "q") {
						done(null);
						return;
					}
					if (data === "j" || matchesKey(data, Key.down)) {
						scrollOffset = Math.min(maxScroll, scrollOffset + 1);
					} else if (data === "k" || matchesKey(data, Key.up)) {
						scrollOffset = Math.max(0, scrollOffset - 1);
					} else if (data === "n" || matchesKey(data, Key.tab)) {
						selected = (selected + 1) % comments.length;
					} else if (data === "p") {
						selected = (selected - 1 + comments.length) % comments.length;
					} else if (matchesKey(data, Key.enter)) {
						done(selected);
						return;
					}

					const selectedLine = blockLineOffsets[selected] ?? 0;
					if (selectedLine < scrollOffset + 2) scrollOffset = Math.max(0, selectedLine - 2);
					if (selectedLine > scrollOffset + contentHeight - 4) {
						scrollOffset = Math.min(maxScroll, selectedLine - Math.floor(contentHeight / 2));
					}
					tui.requestRender();
				},
				invalidate() {},
			};
		},
		{ overlay: true, overlayOptions: { width: `${REVIEW_OVERLAY_WIDTH}%`, minWidth: 90 } },
	);
}
