/**
 * Present Plan Extension
 *
 * Custom tool: present_plan — agent calls with markdown plan, user sees scrollable overlay.
 * Command: /plan — reopens the last presented plan.
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { Markdown, matchesKey, Key, truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";
import { getMarkdownTheme } from "@mariozechner/pi-coding-agent";

const ENTRY_TYPE = "present-plan";

interface PlanOverlayResult {
	approved: boolean;
	feedback?: string;
}

interface OverlayExitState {
	action: "approve" | "submit" | "reject" | "feedback" | "comment";
	cursorLine: number;
	scrollOffset: number;
}

async function showPlanOverlay(
	plan: string,
	ctx: ExtensionContext,
): Promise<PlanOverlayResult> {
	const comments = new Map<number, string>(); // rendered line index → comment text
	let cursorLine = 0;
	let scrollOffset = 0;

	// Map rendered line indices back to nearest section heading in the raw plan
	function findSectionForLine(lineIdx: number, allLines: string[]): string | null {
		// Walk backwards from lineIdx to find the nearest heading-like line
		for (let i = lineIdx; i >= 0; i--) {
			const raw = allLines[i];
			if (!raw) continue;
			// Strip ANSI codes for matching
			const plain = raw.replace(/\x1b\[[0-9;]*m/g, "").trim();
			if (plain.startsWith("# ") || plain.startsWith("## ") || plain.startsWith("### ")) {
				return plain;
			}
		}
		return null;
	}

	function formatCommentsAsFeedback(allLines: string[]): string {
		const entries: string[] = [];
		const sortedLines = [...comments.keys()].sort((a, b) => a - b);
		for (const lineIdx of sortedLines) {
			const comment = comments.get(lineIdx)!;
			const section = findSectionForLine(lineIdx, allLines);
			const lineContent = allLines[lineIdx]?.replace(/\x1b\[[0-9;]*m/g, "").trim() ?? "";
			const header = section ? `Line ${lineIdx + 1} (${section}):` : `Line ${lineIdx + 1}:`;
			entries.push(`${header}\n> ${lineContent}\n${comment}`);
		}
		return entries.join("\n\n");
	}

	// Loop: overlay → comment input → overlay, preserving state
	while (true) {
		const savedScroll = scrollOffset;
		const savedCursor = cursorLine;

		const exitState = await ctx.ui.custom<OverlayExitState>((tui, theme, _kb, done) => {
			const mdTheme = getMarkdownTheme();
			let allLines: string[] = [];
			let lastWidth = 0;
			let cachedHeight = 0;
			scrollOffset = savedScroll;
			cursorLine = savedCursor;

			function renderMarkdown(width: number) {
				if (width !== lastWidth) {
					const contentWidth = Math.max(20, width - 6); // 6 = gutter(2) + borders(4)
					const md = new Markdown(plan, 1, 0, mdTheme);
					allLines = md.render(contentWidth);
					lastWidth = width;
				}
			}

			return {
				render(width: number): string[] {
					renderMarkdown(width);
					const gutterWidth = 2;
					const contentWidth = Math.max(20, width - 4 - gutterWidth);
					const screenH = tui.screenHeight > 0 ? tui.screenHeight : 40;
					// Lock height on first render to prevent oscillation
					if (cachedHeight === 0) cachedHeight = Math.max(5, screenH - 2);
					const usableHeight = cachedHeight;

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
					const commentBadge = commentCount > 0 ? theme.fg("warning", ` 💬 ${commentCount} `) : "";
					const title = theme.fg("accent", theme.bold(" Plan Review ")) + commentBadge;
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
							gutter = theme.fg("warning", "▶💬");
						} else if (isCursor) {
							gutter = theme.fg("accent", "▶ ");
						} else if (hasComment) {
							gutter = theme.fg("warning", "💬");
						} else {
							gutter = "  ";
						}

						const line = visibleLines[i];
						const pad = " ".repeat(Math.max(0, contentWidth - visibleWidth(line)));
						bordered.push(truncateToWidth(
							theme.fg("dim", "│") + gutter + line + pad + theme.fg("dim", " │"),
							width,
						));

						// Show inline comment preview below the line
						if (hasComment) {
							const commentText = comments.get(absIdx)!;
							const preview = commentText.length > contentWidth - 4
								? commentText.slice(0, contentWidth - 7) + "..."
								: commentText;
							const commentLine = theme.fg("dim", "│  ") +
								theme.fg("warning", "↳ " + preview) +
								" ".repeat(Math.max(0, contentWidth - visibleWidth("↳ " + preview))) +
								theme.fg("dim", " │");
							bordered.push(truncateToWidth(commentLine, width));
						}
					}

					// Ensure exactly usableHeight lines (pad or truncate)
					while (bordered.length < usableHeight) {
						bordered.push(
							truncateToWidth(
								theme.fg("dim", "│ ") + " ".repeat(contentWidth + gutterWidth) + theme.fg("dim", " │"),
								width,
							),
						);
					}
					bordered.length = usableHeight;

					// Footer
					const keys = theme.fg("muted", " j/k scroll • c comment • Enter submit • Shift+Enter accept w/ comments • Esc reject ");
					const footerFill = "─".repeat(Math.max(0, width - visibleWidth(keys) - 2));
					const footer = truncateToWidth(
						theme.fg("dim", "╰") + theme.fg("dim", footerFill) + keys + theme.fg("dim", "╯"),
						width,
					);

					return [header, ...bordered, footer];
				},

				handleInput(data: string) {
					if (data === "j" || matchesKey(data, Key.down)) {
						cursorLine = Math.min(cursorLine + 1, allLines.length - 1);
					} else if (data === "k" || matchesKey(data, Key.up)) {
						cursorLine = Math.max(0, cursorLine - 1);
					} else if (data === "d" || matchesKey(data, "pagedown") || matchesKey(data, Key.shift("down"))) {
						cursorLine = Math.min(cursorLine + 10, allLines.length - 1);
					} else if (data === "u" || matchesKey(data, "pageup") || matchesKey(data, Key.shift("up"))) {
						cursorLine = Math.max(0, cursorLine - 10);
					} else if (data === "g" || matchesKey(data, Key.home)) {
						cursorLine = 0;
					} else if (data === "G" || matchesKey(data, Key.end)) {
						cursorLine = allLines.length - 1;
					} else if (data === "c" || data === "C") {
						done({ action: "comment", cursorLine, scrollOffset });
						return;
					} else if (matchesKey(data, Key.shift("enter"))) {
						done({ action: "approve", cursorLine, scrollOffset });
						return;
					} else if (matchesKey(data, Key.enter)) {
						done({ action: "submit", cursorLine, scrollOffset });
						return;
					} else if (data === "f" || data === "F") {
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
				const feedback = formatCommentsAsFeedback(finalLines);
				return { approved: false, feedback };
			}
			return { approved: true };
		}

		if (exitState.action === "approve") {
			if (comments.size > 0) {
				const md = new Markdown(plan, 1, 0, getMarkdownTheme());
				const finalLines = md.render(80);
				const feedback = formatCommentsAsFeedback(finalLines);
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
			const inlineComments = comments.size > 0 ? formatCommentsAsFeedback(finalLines) : "";

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
			const prompt = existing ? "Edit comment (empty to remove):" : "Add comment:";
			const input = await ctx.ui.input(prompt, existing ?? "");

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

export default function presentPlan(pi: ExtensionAPI) {
	let latestPlan: string | null = null;

	// Restore latest plan from session on start
	pi.on("session_start", async (_event, ctx) => {
		latestPlan = null;
		for (const entry of ctx.sessionManager.getEntries()) {
			if (entry.type === "custom" && entry.customType === ENTRY_TYPE) {
				latestPlan = (entry as any).data?.plan ?? null;
			}
		}
	});

	pi.on("session_switch", async (_event, ctx) => {
		latestPlan = null;
		for (const entry of ctx.sessionManager.getEntries()) {
			if (entry.type === "custom" && entry.customType === ENTRY_TYPE) {
				latestPlan = (entry as any).data?.plan ?? null;
			}
		}
	});

	pi.registerTool({
		name: "present_plan",
		label: "Present Plan",
		description:
			"Present an implementation plan to the user for review and approval. " +
			"Use this when you have a complete plan ready for the user to review. " +
			"The plan will be displayed in a scrollable overlay. " +
			"The user will approve or reject it. Returns their decision.",
		promptGuidelines: [
			"Use present_plan when you have a complete implementation plan to show the user.",
			"Write the plan in markdown format with clear sections and structure.",
			"Wait for the user's approval before proceeding with implementation.",
		],
		parameters: Type.Object({
			plan: Type.String({ description: "The full implementation plan in markdown format" }),
		}),
		async execute(toolCallId, params, signal, onUpdate, ctx) {
			const { plan } = params;

			// Persist
			latestPlan = plan;
			pi.appendEntry(ENTRY_TYPE, { plan });

			// Show overlay
			const result = await showPlanOverlay(plan, ctx);

			let text: string;
			if (result.approved && result.feedback) {
				text = `User APPROVED the plan with inline comments. Review the comments and adjust before implementing:\n\n${result.feedback}`;
			} else if (result.approved) {
				text = "User APPROVED the plan. Proceed with implementation.";
			} else if (result.feedback) {
				text = `User provided FEEDBACK on the plan. Address this feedback and present a revised plan:\n\n${result.feedback}`;
			} else {
				// Reject without feedback — abort the agent loop so no LLM turn fires.
				// The user can follow up in their own words when ready.
				ctx.abort();
				text = "User rejected the plan.";
			}

			return {
				content: [{ type: "text", text }],
				details: { approved: result.approved, feedback: result.feedback },
			};
		},

		renderCall(args, theme) {
			const { Text } = require("@mariozechner/pi-tui");
			return new Text(
				theme.fg("toolTitle", theme.bold("present_plan ")) +
					theme.fg("dim", "Presenting plan for review..."),
				0, 0,
			);
		},

		renderResult(result, { expanded }, theme) {
			const { Text } = require("@mariozechner/pi-tui");
			const approved = result.details?.approved;
			const feedback = result.details?.feedback;
			let icon: string, color: string, label: string;
			if (approved) {
				icon = "✓"; color = "success"; label = "Plan approved";
			} else if (feedback) {
				icon = "✎"; color = "warning"; label = "Feedback provided";
			} else {
				icon = "✗"; color = "error"; label = "Plan rejected";
			}
			let text = theme.fg(color, `${icon} ${label}`) +
				theme.fg("dim", "  /plan to review again");
			if (expanded && feedback) {
				text += "\n" + theme.fg("muted", feedback);
			}
			return new Text(text, 0, 0);
		},
	});

	pi.registerCommand("plan", {
		description: "Reopen the last presented plan",
		handler: async (_args, ctx) => {
			if (!latestPlan) {
				ctx.ui.notify("No plan has been presented yet", "warning");
				return;
			}
			await showPlanOverlay(latestPlan, ctx);
		},
	});
}
