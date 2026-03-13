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

const DIFF_BG = "\x1b[48;5;22m"; // dark green background
const RESET = "\x1b[0m";

function stripAnsi(s: string): string {
	return s.replace(/\x1b\[[0-9;]*m/g, "");
}

/** LCS-based diff: returns set of indices in newLines that are added/changed */
function computeChangedLines(oldLines: string[], newLines: string[]): Set<number> {
	const oldStripped = oldLines.map(stripAnsi);
	const newStripped = newLines.map(stripAnsi);
	const m = oldStripped.length;
	const n = newStripped.length;

	// Build LCS table
	const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
	for (let i = 1; i <= m; i++) {
		for (let j = 1; j <= n; j++) {
			if (oldStripped[i - 1] === newStripped[j - 1]) {
				dp[i][j] = dp[i - 1][j - 1] + 1;
			} else {
				dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
			}
		}
	}

	// Backtrack to find matched lines in newLines
	const matched = new Set<number>();
	let i = m, j = n;
	while (i > 0 && j > 0) {
		if (oldStripped[i - 1] === newStripped[j - 1]) {
			matched.add(j - 1);
			i--; j--;
		} else if (dp[i - 1][j] > dp[i][j - 1]) {
			i--;
		} else {
			j--;
		}
	}

	const changed = new Set<number>();
	for (let k = 0; k < n; k++) {
		if (!matched.has(k)) changed.add(k);
	}
	return changed;
}

async function showPlanOverlay(
	plan: string,
	ctx: ExtensionContext,
	previousPlan?: string | null,
): Promise<PlanOverlayResult> {
	const comments = new Map<number, string>(); // rendered line index → comment text
	let cursorLine = 0;
	let scrollOffset = 0;
	let showDiff = !!previousPlan;

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
							const firstPrefix = "↳ ";  // 3 chars
							const contPrefix = "   ";   // 3 chars, aligns with text after ↳
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
			const input = await ctx.ui.editor(prompt, existing ?? "");

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
	let previousPlan: string | null = null;
	let hasPresentedThisSession = false;

	// Restore latest plan from session on start
	pi.on("session_start", async (_event, ctx) => {
		latestPlan = null;
		previousPlan = null;
		hasPresentedThisSession = false;
		for (const entry of ctx.sessionManager.getEntries()) {
			if (entry.type === "custom" && entry.customType === ENTRY_TYPE) {
				latestPlan = (entry as any).data?.plan ?? null;
			}
		}
	});

	pi.on("session_switch", async (_event, ctx) => {
		latestPlan = null;
		previousPlan = null;
		hasPresentedThisSession = false;
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

			// Track previous for diff — only from plans shown this session
			previousPlan = hasPresentedThisSession ? latestPlan : null;
			hasPresentedThisSession = true;

			// Persist
			latestPlan = plan;
			pi.appendEntry(ENTRY_TYPE, { plan });

			// Show overlay
			const result = await showPlanOverlay(plan, ctx, previousPlan);

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
			await showPlanOverlay(latestPlan, ctx, previousPlan);
		},
	});
}
