import { Markdown, matchesKey, Key, truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";
import { getMarkdownTheme } from "@mariozechner/pi-coding-agent";
import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import type { PlanContext, PlanOverlayResult, OverlayExitState } from "./types.ts";
import { buildRawToRenderedMap, mapContextsToRendered, findContextForLine, type RenderedContext } from "./context.ts";
import { showContextEditor } from "./context-editor.ts";
import { DIFF_BG, RESET, computeChangedLines } from "./diff.ts";
import { formatCommentsAsFeedback } from "./comments.ts";

export async function showPlanOverlay(
	plan: string,
	ctx: ExtensionContext,
	previousPlan?: string | null,
	contexts?: PlanContext[],
): Promise<PlanOverlayResult> {
	const comments = new Map<number, string>(); // rendered line index → comment text
	let renderedContexts: RenderedContext[] = [];
	let cursorLine = 0;
	let scrollOffset = 0;
	let showDiff = !!previousPlan;

	// Loop: overlay → comment input → overlay, preserving state
	while (true) {
		const savedScroll = scrollOffset;
		const savedCursor = cursorLine;

		const exitState = await ctx.ui.custom<OverlayExitState>((tui, theme, _kb, done) => {
			const mdTheme = getMarkdownTheme();
			let allLines: string[] = [];
			let changedLines: Set<number> = new Set();
			let lastWidth = 0;
			let cachedHeight = 0;
			let usableHeight = 20;
			let pendingG = false;
			scrollOffset = savedScroll;
			cursorLine = savedCursor;

			function renderMarkdown(width: number) {
				if (width !== lastWidth) {
					const contentWidth = Math.max(20, width - 5); // 5 = gutter(2) + borders(3: │ + ` │`)
					const md = new Markdown(plan, 1, 0, mdTheme);
					allLines = md.render(contentWidth);
					lastWidth = width;

					// Compute diff against previous plan
					if (previousPlan) {
						const prevMd = new Markdown(previousPlan, 1, 0, mdTheme);
						const prevLines = prevMd.render(contentWidth);
						changedLines = computeChangedLines(prevLines, allLines);
					} else {
						changedLines = new Set();
					}

					// Map raw contexts to rendered line ranges
					if (contexts && contexts.length > 0) {
						const renderForMapping = (mdText: string) => {
							const m = new Markdown(mdText, 1, 0, mdTheme);
							return m.render(contentWidth);
						};
						const rawToRendered = buildRawToRenderedMap(plan, renderForMapping);
						renderedContexts = mapContextsToRendered(contexts, rawToRendered, allLines.length);
					}
				}
			}

			return {
				render(width: number): string[] {
					renderMarkdown(width);
					const gutterWidth = 2;
					const contentWidth = Math.max(20, width - 3 - gutterWidth);
					const screenH = tui.screenHeight > 0 ? tui.screenHeight : 40;
					// Lock height on first render to prevent oscillation
					if (cachedHeight === 0) cachedHeight = Math.max(5, screenH - 2);
					usableHeight = cachedHeight;

					// Clamp cursor
					if (cursorLine >= allLines.length) cursorLine = Math.max(0, allLines.length - 1);
					if (cursorLine < 0) cursorLine = 0;

					// Auto-scroll to keep cursor visible
					if (cursorLine < scrollOffset) scrollOffset = cursorLine;
					if (cursorLine >= scrollOffset + usableHeight) scrollOffset = cursorLine - usableHeight + 1;

					const maxScroll = Math.max(0, allLines.length - usableHeight);
					if (scrollOffset > maxScroll) scrollOffset = maxScroll;
					if (scrollOffset < 0) scrollOffset = 0;

					const visibleLines = allLines.slice(scrollOffset, scrollOffset + usableHeight);

					// Header
					const commentCount = comments.size;
					const commentBadge = commentCount > 0 ? theme.fg("warning", ` ${commentCount} comment${commentCount > 1 ? "s" : ""} `) : "";
					const diffBadge = showDiff && previousPlan ? theme.fg("success", " diff ") : "";
					const title = theme.fg("accent", theme.bold(" Plan Review ")) + commentBadge + diffBadge;
					const rangeEnd = Math.min(scrollOffset + usableHeight, allLines.length);
					const scrollInfo = theme.fg("dim", ` ${scrollOffset + 1}-${rangeEnd}/${allLines.length} `);
					const headerFill = "─".repeat(Math.max(0, width - visibleWidth(title) - visibleWidth(scrollInfo) - 4));
					const header = truncateToWidth(
						theme.fg("dim", "╭─") + title + theme.fg("dim", headerFill) + scrollInfo + theme.fg("dim", "─╮"),
						width,
					);

					// Content lines with gutter + cursor
					const bordered: string[] = [];
					for (let i = 0; i < visibleLines.length; i++) {
						const absIdx = scrollOffset + i;
						const isCursor = absIdx === cursorLine;
						const hasComment = comments.has(absIdx);

						// Gutter: cursor marker or comment marker
						let gutter: string;
						if (isCursor && hasComment) {
							gutter = theme.fg("warning", "▶•");
						} else if (isCursor) {
							gutter = theme.fg("accent", "▶ ");
						} else if (hasComment) {
							gutter = theme.fg("warning", " •");
						} else {
							gutter = "  ";
						}

						const line = visibleLines[i];
						const isChanged = showDiff && changedLines.has(absIdx);
						const pad = " ".repeat(Math.max(0, contentWidth - visibleWidth(line)));
						const content = isChanged
							? DIFF_BG + gutter + line + pad + RESET
							: gutter + line + pad;
						bordered.push(truncateToWidth(
							theme.fg("dim", "│") + content + theme.fg("dim", " │"),
							width,
						));

						// Show inline comment preview below the line, wrapping long comments
						if (hasComment) {
							const commentText = comments.get(absIdx)!;
							const firstPrefix = "↳  ";  // 3 visual cols (↳=1 + 2 spaces)
							const contPrefix = "   ";   // 3 visual cols, aligns with text after ↳
							const wrapWidth = contentWidth - 3; // account for prefix width
							const commentLines = commentText.split("\n");
							const wrappedLines: string[] = [];
							for (const cl of commentLines) {
								if (cl.length <= wrapWidth) {
									wrappedLines.push(cl);
								} else {
									let remaining = cl;
									while (remaining.length > 0) {
										if (remaining.length <= wrapWidth) { wrappedLines.push(remaining); break; }
										let breakAt = remaining.lastIndexOf(" ", wrapWidth);
										if (breakAt <= 0) breakAt = wrapWidth;
										wrappedLines.push(remaining.slice(0, breakAt));
										remaining = remaining.slice(breakAt).replace(/^ /, "");
									}
								}
							}
							for (let ci = 0; ci < wrappedLines.length; ci++) {
								const prefix = ci === 0 ? firstPrefix : contPrefix;
								const cl = prefix + wrappedLines[ci];
								const commentLine = theme.fg("dim", "│  ") +
									theme.fg("warning", cl) +
									" ".repeat(Math.max(0, contentWidth - visibleWidth(cl))) +
									theme.fg("dim", " │");
								bordered.push(commentLine);
							}
						}
					}

					// Ensure exactly usableHeight lines (pad or truncate)
					while (bordered.length < usableHeight) {
						bordered.push(
							truncateToWidth(
								theme.fg("dim", "│") + " ".repeat(contentWidth + gutterWidth) + theme.fg("dim", " │"),
								width,
							),
						);
					}
					bordered.length = usableHeight;

					// Footer
					const diffKey = previousPlan ? "d diff • " : "";
					const keys = theme.fg("muted", ` ${diffKey}c comment • Enter submit • S-Enter approve • Esc reject `);
					const footerFill = "─".repeat(Math.max(0, width - visibleWidth(keys) - 2));
					const footer = truncateToWidth(
						theme.fg("dim", "╰") + theme.fg("dim", footerFill) + keys + theme.fg("dim", "╯"),
						width,
					);

					return [header, ...bordered, footer];
				},

				handleInput(data: string) {
					if (matchesKey(data, "j") || matchesKey(data, Key.down)) {
						cursorLine = Math.min(cursorLine + 1, allLines.length - 1);
					} else if (matchesKey(data, "k") || matchesKey(data, Key.up)) {
						cursorLine = Math.max(0, cursorLine - 1);
					} else if (matchesKey(data, "d")) {
						if (previousPlan) { showDiff = !showDiff; }
					} else if (matchesKey(data, Key.ctrl("d")) || matchesKey(data, "pagedown") || matchesKey(data, Key.shift("down"))) {
						cursorLine = Math.min(cursorLine + Math.floor(usableHeight / 2), allLines.length - 1);
					} else if (matchesKey(data, Key.ctrl("u")) || matchesKey(data, "pageup") || matchesKey(data, Key.shift("up"))) {
						cursorLine = Math.max(0, cursorLine - Math.floor(usableHeight / 2));
					} else if (matchesKey(data, "g")) {
						if (pendingG) { cursorLine = 0; pendingG = false; }
						else { pendingG = true; setTimeout(() => { pendingG = false; }, 500); }
						if (pendingG) { return; }
					} else if (matchesKey(data, Key.shift("g")) || matchesKey(data, Key.end)) {
						cursorLine = allLines.length - 1;
						pendingG = false;
					} else if (matchesKey(data, Key.home)) {
						cursorLine = 0;
					} else if (matchesKey(data, "c") || matchesKey(data, Key.shift("c"))) {
						done({ action: "comment", cursorLine, scrollOffset });
						return;
					} else if (matchesKey(data, Key.shift("enter"))) {
						done({ action: "approve", cursorLine, scrollOffset });
						return;
					} else if (matchesKey(data, Key.enter)) {
						done({ action: "submit", cursorLine, scrollOffset });
						return;
					} else if (matchesKey(data, "f") || matchesKey(data, Key.shift("f"))) {
						done({ action: "feedback", cursorLine, scrollOffset });
						return;
					} else if (matchesKey(data, Key.escape)) {
						done({ action: "reject", cursorLine, scrollOffset });
						return;
					}
					tui.requestRender();
				},

				invalidate() {
					lastWidth = 0;
					cachedHeight = 0;
				},
			};
		});

		if (!exitState) return { approved: false };

		scrollOffset = exitState.scrollOffset;
		cursorLine = exitState.cursorLine;

		if (exitState.action === "submit") {
			if (comments.size > 0) {
				// Enter with comments = iterate (regenerate plan with feedback)
				const md = new Markdown(plan, 1, 0, getMarkdownTheme());
				const finalLines = md.render(80);
				const feedback = formatCommentsAsFeedback(comments, finalLines);
				return { approved: false, feedback };
			}
			return { approved: true };
		}

		if (exitState.action === "approve") {
			if (comments.size > 0) {
				const md = new Markdown(plan, 1, 0, getMarkdownTheme());
				const finalLines = md.render(80);
				const feedback = formatCommentsAsFeedback(comments, finalLines);
				return { approved: true, feedback };
			}
			return { approved: true };
		}

		if (exitState.action === "reject") {
			return { approved: false };
		}

		if (exitState.action === "feedback") {
			// General feedback via editor (existing behavior)
			const md = new Markdown(plan, 1, 0, getMarkdownTheme());
			const finalLines = md.render(80);
			const inlineComments = comments.size > 0 ? formatCommentsAsFeedback(comments, finalLines) : "";

			const editorFeedback = await ctx.ui.editor("Plan feedback:", "");
			if (editorFeedback !== undefined && editorFeedback.trim()) {
				const combined = inlineComments
					? `${inlineComments}\n\n---\n\nGeneral feedback:\n${editorFeedback.trim()}`
					: editorFeedback.trim();
				return { approved: false, feedback: combined };
			}
			if (inlineComments) {
				return { approved: false, feedback: inlineComments };
			}
			return { approved: false };
		}

		if (exitState.action === "comment") {
			const existing = comments.get(cursorLine);
			const contextBlock = findContextForLine(cursorLine, renderedContexts);

			let input: string | undefined;
			if (contextBlock) {
				input = await showContextEditor(ctx, contextBlock.content, existing);
			} else {
				const prompt = existing ? "Edit comment (empty to remove):" : "Add comment:";
				input = await ctx.ui.editor(prompt, existing ?? "");
			}

			if (input !== undefined) {
				if (input.trim()) {
					comments.set(cursorLine, input.trim());
				} else {
					comments.delete(cursorLine);
				}
			}
			// Loop back to overlay
			continue;
		}
	}
}
