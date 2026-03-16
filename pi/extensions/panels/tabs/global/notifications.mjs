import { listNotifications, dismissNotification, dismissAll, executeAction } from "../../lib/notifications.ts";
import {
	dim, cyan, yellow, red, style,
	truncate, visWidth, write, moveTo, selColor,
	emptyLine, contentLine, wrapText,
	bSide,
} from "../../lib/ui.ts";

const subdued = (t) => style("\x1b[38;5;238m", t);

// ── State ────────────────────────────────────────────────────────────────────

export const state = {
	notifications: [],
	navItems: [],
	visualRows: [],
	selectedIdx: 0,
	scrollOffset: 0,
	expandedId: null,
};

// ── Priority Rendering ───────────────────────────────────────────────────────

const PRIORITY_INDICATOR = {
	blocked: () => red("●"),
	"needs-decision": () => yellow("●"),
	suggestion: () => cyan("●"),
	info: () => dim("○"),
};

const PRIORITY_BADGE = {
	blocked: () => red("[blocked]"),
	"needs-decision": () => yellow("[decision]"),
	suggestion: () => cyan("[suggestion]"),
	info: () => dim("[info]"),
};

// ── Data ─────────────────────────────────────────────────────────────────────

export function fetchNotifications() {
	return listNotifications();
}

export function applyData(notifications) {
	state.notifications = notifications ?? [];
	rebuildNav();
}

export function rebuildNav() {
	state.navItems = state.notifications.map((n, i) => ({ type: "entry", idx: i }));

	const rows = [];
	for (let i = 0; i < state.notifications.length; i++) {
		const n = state.notifications[i];
		rows.push({ kind: "entry", navIdx: i, data: n });

		// Detail line: action label + count
		const parts = [];
		if (n.suggestedAction) parts.push(n.suggestedAction.label);
		if (n.count > 1) parts.push(`(${n.count}x)`);
		if (parts.length > 0) {
			rows.push({ kind: "detail", navIdx: i, text: parts.join("  ") });
		}

		// Expanded summary (wrapped at render time)
		if (state.expandedId === n.id && n.summary) {
			rows.push({ kind: "summary", navIdx: i, text: n.summary });
		}
	}
	state.visualRows = rows;

	if (state.selectedIdx >= state.navItems.length) {
		state.selectedIdx = Math.max(0, state.navItems.length - 1);
	}
}

export function getSelectedEntry() {
	const n = state.notifications[state.selectedIdx];
	return n ?? null;
}

// ── Actions ──────────────────────────────────────────────────────────────────

export function toggleExpand() {
	const entry = getSelectedEntry();
	if (!entry) return;
	state.expandedId = state.expandedId === entry.id ? null : entry.id;
	rebuildNav();
}

export function dismissSelected() {
	const entry = getSelectedEntry();
	if (!entry) return;
	dismissNotification(entry.id);
	state.notifications = state.notifications.filter(n => n.id !== entry.id);
	rebuildNav();
}

export function dismissAllNotifications() {
	dismissAll(state.notifications);
	state.notifications = [];
	rebuildNav();
}

export function acceptAction() {
	const entry = getSelectedEntry();
	if (!entry?.suggestedAction) return { ok: false, error: "No action available" };
	const result = executeAction(entry.id);
	if (result?.ok) {
		state.notifications = state.notifications.filter(n => n.id !== entry.id);
		rebuildNav();
	}
	return result ?? { ok: false, error: "Action failed" };
}

// ── Render ───────────────────────────────────────────────────────────────────

export function renderTab(startRow, innerW, contentHeight) {
	let row = startRow;
	let contentRow = 0;

	if (state.visualRows.length === 0) {
		moveTo(row, 1); write(contentLine(dim(" No notifications"), innerW));
		return 1;
	}

	// Scroll: find first visual row for selected entry
	const selFirst = state.visualRows.findIndex(r => r.navIdx === state.selectedIdx);
	const selLast = state.visualRows.findLastIndex(r => r.navIdx === state.selectedIdx);
	if (selFirst !== -1) {
		if (selFirst < state.scrollOffset) state.scrollOffset = selFirst;
		if (selLast >= state.scrollOffset + contentHeight) state.scrollOffset = selLast - contentHeight + 1;
	}
	state.scrollOffset = Math.max(0, Math.min(state.scrollOffset, Math.max(0, state.visualRows.length - contentHeight)));

	const visibleCount = Math.min(state.visualRows.length - state.scrollOffset, contentHeight);

	for (let vi = 0; vi < visibleCount; vi++) {
		if (contentRow >= contentHeight) break;
		const vr = state.visualRows[state.scrollOffset + vi];
		const selected = vr.navIdx === state.selectedIdx;

		if (vr.kind === "entry") {
			moveTo(row++, 1); contentRow++;
			renderEntryRow(vr.data, selected, innerW);
		} else if (vr.kind === "detail") {
			moveTo(row++, 1); contentRow++;
			renderDetailRow(vr.text, innerW);
		} else if (vr.kind === "summary") {
			const indent = "     ";
			const wrapW = Math.max(1, innerW - indent.length);
			const lines = wrapText(vr.text, wrapW);
			for (const line of lines) {
				if (contentRow >= contentHeight) break;
				moveTo(row++, 1); contentRow++;
				write(contentLine(subdued(indent + line), innerW));
			}
		}
	}

	return contentRow;
}

function renderEntryRow(n, selected, innerW) {
	const indicator = (PRIORITY_INDICATOR[n.priority] ?? PRIORITY_INDICATOR.info)();
	const badge = (PRIORITY_BADGE[n.priority] ?? PRIORITY_BADGE.info)();
	const cursor = selected ? selColor("▶ ") : "  ";
	const badgeW = visWidth(badge);
	const titleW = Math.max(1, innerW - 4 - badgeW - 1);
	const title = truncate(n.title, titleW);
	const usedW = visWidth(cursor + indicator + " " + title);
	const gap = " ".repeat(Math.max(1, innerW - usedW - badgeW));
	const line = cursor + indicator + " " + title + gap + badge;
	write(bSide() + line + " ".repeat(Math.max(0, innerW - visWidth(line))) + bSide());
}

function renderDetailRow(text, innerW) {
	const indent = "     ";
	const full = dim(truncate(indent + text, innerW));
	write(contentLine(full, innerW));
}


