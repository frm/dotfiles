import { Editor, type EditorTheme, Key, matchesKey, truncateToWidth, wrapTextWithAnsi } from "@mariozechner/pi-tui";
import type { Answer, Question, QuestionnaireResult, RenderOption } from "./types.ts";

export function createQuestionnaireOverlay(questions: Question[], isMulti: boolean) {
	const totalTabs = questions.length + 1; // questions + Submit

	return (tui: any, theme: any, _kb: any, done: (result: QuestionnaireResult) => void) => {
		// State
		let currentTab = 0;
		let optionIndex = 0;
		let inputMode = false;
		let inputQuestionId: string | null = null;
		let inputOptionLabel: string | undefined = undefined;
		let inputOptionValue: string | undefined = undefined;
		let cachedLines: string[] | undefined;
		const answers = new Map<string, Answer>();

		// Editor for "Type something" option
		const editorTheme: EditorTheme = {
			borderColor: (s) => theme.fg("accent", s),
			selectList: {
				selectedPrefix: (t) => theme.fg("accent", t),
				selectedText: (t) => theme.fg("accent", t),
				description: (t) => theme.fg("muted", t),
				scrollInfo: (t) => theme.fg("dim", t),
				noMatch: (t) => theme.fg("warning", t),
			},
		};
		const editor = new Editor(tui, editorTheme);

		// Helpers
		function refresh() {
			cachedLines = undefined;
			tui.requestRender();
		}

		function submit(cancelled: boolean) {
			done({ questions, answers: Array.from(answers.values()), cancelled });
		}

		function currentQuestion(): Question | undefined {
			return questions[currentTab];
		}

		function currentOptions(): RenderOption[] {
			const q = currentQuestion();
			if (!q) return [];
			const opts: RenderOption[] = [...q.options];
			if (q.allowOther) {
				opts.push({ value: "__other__", label: "Type something.", isOther: true });
			}
			return opts;
		}

		function allAnswered(): boolean {
			return questions.every((q) => answers.has(q.id));
		}

		function advanceAfterAnswer() {
			if (!isMulti) {
				submit(false);
				return;
			}
			if (currentTab < questions.length - 1) {
				currentTab++;
			} else {
				currentTab = questions.length; // Submit tab
			}
			optionIndex = 0;
			refresh();
		}

		function saveAnswer(questionId: string, value: string, label: string, wasCustom: boolean, index?: number) {
			answers.set(questionId, { id: questionId, value, label, wasCustom, index });
		}

		// Editor submit callback
		editor.onSubmit = (value) => {
			if (!inputQuestionId) return;
			const trimmed = value.trim() || "(no response)";
			if (inputOptionLabel) {
				// Option with allowInput: return "optionValue:userInput"
				saveAnswer(inputQuestionId, `${inputOptionValue}:${trimmed}`, `${inputOptionLabel}: ${trimmed}`, true);
			} else {
				saveAnswer(inputQuestionId, trimmed, trimmed, true);
			}
			inputMode = false;
			inputQuestionId = null;
			inputOptionLabel = undefined;
			inputOptionValue = undefined;
			editor.setText("");
			advanceAfterAnswer();
		};

		function handleInput(data: string) {
			// Input mode: route to editor
			if (inputMode) {
				if (matchesKey(data, Key.escape)) {
					inputMode = false;
					inputQuestionId = null;
					inputOptionLabel = undefined;
					inputOptionValue = undefined;
					editor.setText("");
					refresh();
					return;
				}
				editor.handleInput(data);
				refresh();
				return;
			}

			const q = currentQuestion();
			const opts = currentOptions();

			// Tab navigation (multi-question only)
			if (isMulti) {
				if (matchesKey(data, Key.tab) || matchesKey(data, Key.right)) {
					currentTab = (currentTab + 1) % totalTabs;
					optionIndex = 0;
					refresh();
					return;
				}
				if (matchesKey(data, Key.shift("tab")) || matchesKey(data, Key.left)) {
					currentTab = (currentTab - 1 + totalTabs) % totalTabs;
					optionIndex = 0;
					refresh();
					return;
				}
			}

			// Submit tab
			if (currentTab === questions.length) {
				if (matchesKey(data, Key.enter) && allAnswered()) {
					submit(false);
				} else if (matchesKey(data, Key.escape)) {
					submit(true);
				}
				return;
			}

			// Option navigation
			if (matchesKey(data, Key.up) || data === "k") {
				optionIndex = Math.max(0, optionIndex - 1);
				refresh();
				return;
			}
			if (matchesKey(data, Key.down) || data === "j") {
				optionIndex = Math.min(opts.length - 1, optionIndex + 1);
				refresh();
				return;
			}

			// Number keys to select option directly
			if (q && data >= "1" && data <= "9") {
				const idx = parseInt(data) - 1;
				if (idx < opts.length) {
					const opt = opts[idx];
					if (opt.isOther || opt.allowInput) {
						inputMode = true;
						inputQuestionId = q.id;
						inputOptionLabel = opt.isOther ? undefined : opt.label;
						inputOptionValue = opt.isOther ? undefined : opt.value;
						editor.setText(opt.inputPlaceholder ?? "");
						refresh();
						return;
					}
					saveAnswer(q.id, opt.value, opt.label, false, idx + 1);
					advanceAfterAnswer();
					return;
				}
			}

			// Select option
			if (matchesKey(data, Key.enter) && q) {
				const opt = opts[optionIndex];
				if (opt.isOther || opt.allowInput) {
					inputMode = true;
					inputQuestionId = q.id;
					inputOptionLabel = opt.isOther ? undefined : opt.label;
					inputOptionValue = opt.isOther ? undefined : opt.value;
					editor.setText(opt.inputPlaceholder ?? "");
					refresh();
					return;
				}
				saveAnswer(q.id, opt.value, opt.label, false, optionIndex + 1);
				advanceAfterAnswer();
				return;
			}

			// Cancel
			if (matchesKey(data, Key.escape)) {
				submit(true);
			}
		}

		function render(width: number): string[] {
			if (cachedLines) return cachedLines;

			const lines: string[] = [];
			const q = currentQuestion();
			const opts = currentOptions();

			const add = (s: string) => lines.push(truncateToWidth(s, width));
			const addWrapped = (s: string, indent = "") => {
				const wrapped = wrapTextWithAnsi(s, width);
				for (let i = 0; i < wrapped.length; i++) {
					lines.push(i > 0 && indent ? indent + wrapped[i] : wrapped[i]);
				}
			};

			add(theme.fg("accent", "─".repeat(width)));

			// Tab bar (multi-question only)
			if (isMulti) {
				const tabs: string[] = ["← "];
				for (let i = 0; i < questions.length; i++) {
					const isActive = i === currentTab;
					const isAnswered = answers.has(questions[i].id);
					const lbl = questions[i].label;
					const box = isAnswered ? "■" : "□";
					const color = isAnswered ? "success" : "muted";
					const text = ` ${box} ${lbl} `;
					const styled = isActive ? theme.bg("selectedBg", theme.fg("text", text)) : theme.fg(color, text);
					tabs.push(`${styled} `);
				}
				const canSubmit = allAnswered();
				const isSubmitTab = currentTab === questions.length;
				const submitText = " ✓ Submit ";
				const submitStyled = isSubmitTab
					? theme.bg("selectedBg", theme.fg("text", submitText))
					: theme.fg(canSubmit ? "success" : "dim", submitText);
				tabs.push(`${submitStyled} →`);
				add(` ${tabs.join("")}`);
				lines.push("");
			}

			// Helper to render options list
			function renderOptions() {
				for (let i = 0; i < opts.length; i++) {
					const opt = opts[i];
					const selected = i === optionIndex;
					const isOther = opt.isOther === true;
					const prefix = selected ? theme.fg("accent", "> ") : "  ";
					const color = selected ? "accent" : "text";
					// Mark "Type something" differently when in input mode
					if (isOther && inputMode) {
						add(prefix + theme.fg("accent", `${i + 1}. ${opt.label} ✎`));
					} else {
						add(prefix + theme.fg(color, `${i + 1}. ${opt.label}`));
					}
					if (opt.description) {
						addWrapped(`     ${theme.fg("muted", opt.description)}`, "     ");
					}
				}
			}

			// Content
			if (inputMode && q) {
				addWrapped(theme.fg("text", ` ${q.prompt}`), " ");
				lines.push("");
				// Show options for reference
				renderOptions();
				lines.push("");
				add(theme.fg("muted", " Your answer:"));
				for (const line of editor.render(width - 2)) {
					add(` ${line}`);
				}
				lines.push("");
				add(theme.fg("dim", " Enter to submit • Esc to cancel"));
			} else if (currentTab === questions.length) {
				add(theme.fg("accent", theme.bold(" Ready to submit")));
				lines.push("");
				for (const question of questions) {
					const answer = answers.get(question.id);
					if (answer) {
						const prefix = answer.wasCustom ? "(wrote) " : "";
						add(`${theme.fg("muted", ` ${question.label}: `)}${theme.fg("text", prefix + answer.label)}`);
					}
				}
				lines.push("");
				if (allAnswered()) {
					add(theme.fg("success", " Press Enter to submit"));
				} else {
					const missing = questions
						.filter((q) => !answers.has(q.id))
						.map((q) => q.label)
						.join(", ");
					add(theme.fg("warning", ` Unanswered: ${missing}`));
				}
			} else if (q) {
				addWrapped(theme.fg("text", ` ${q.prompt}`), " ");
				lines.push("");
				renderOptions();
			}

			lines.push("");
			if (!inputMode) {
				const help = isMulti
					? " Tab/←→ navigate • ↑↓ select • 1-9 pick • Enter confirm • Esc cancel"
					: " ↑↓ navigate • 1-9 pick • Enter select • Esc cancel";
				add(theme.fg("dim", help));
			}
			add(theme.fg("accent", "─".repeat(width)));

			cachedLines = lines;
			return lines;
		}

		return {
			render,
			invalidate: () => {
				cachedLines = undefined;
			},
			handleInput,
		};
	};
}
