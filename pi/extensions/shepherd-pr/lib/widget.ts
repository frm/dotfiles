import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import { truncateToWidth } from "@mariozechner/pi-tui";

import type { PrInfo } from "../../lib/gh/index.ts";

import type { WidgetMode } from "./types.ts";
import { summarizeChecks } from "./checks.ts";
import type { StatusCheckLike } from "./checks.ts";
import { pendingReviewCount } from "./reviews.ts";

type Theme = ExtensionContext["ui"]["theme"];

const WIDGET_ID = "shepherd-pr";

export interface WidgetState {
	enabled: boolean;
	widgetMode: WidgetMode;
	latestPr: PrInfo | null;
	widgetFixLabel: string;
	widgetFixProgress: string;
	ambiguousReviewCount: number;
}

export function renderWidget(ctx: ExtensionContext, state: WidgetState): void {
	if (!ctx.hasUI) return;

	ctx.ui.setWidget(
		WIDGET_ID,
		(_tui, theme) => ({
			render(width: number): string[] {
				const line = widgetLine(state, theme);
				return [truncateToWidth(line, width)];
			},
			invalidate() {},
		}),
		{ placement: "aboveEditor" },
	);
}

function widgetLine(state: WidgetState, theme: Theme): string {
	if (!state.enabled) {
		return theme.fg("muted", "not shepherding");
	}
	if (state.widgetMode === "merged") {
		return theme.fg("success", "⟐  ✓ merged!");
	}
	if (state.widgetMode === "fixing") {
		const right = state.widgetFixProgress ? theme.fg("dim", ` · ${state.widgetFixProgress}`) : "";
		return theme.fg("accent", `⟐  fixing ${state.widgetFixLabel} …`) + right;
	}
	if (state.ambiguousReviewCount > 0) {
		return theme.fg("warning", `⟐  ⚠ ${state.ambiguousReviewCount} needs review`);
	}
	const checks = summarizeChecks((state.latestPr?.statusCheckRollup ?? []) as StatusCheckLike[]);
	const reviewCount = state.latestPr ? pendingReviewCount(state.latestPr) : 0;
	return theme.fg("accent", "⟐  watching") + theme.fg("dim", ` · ✓ ${checks.passed} · ✗ ${checks.failed} · ⟡  ${reviewCount}`);
}
