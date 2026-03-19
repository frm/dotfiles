import { listNotifications, dismissNotification, dismissAll, snoozeNotification, requestAction } from "../../lib/notifications.ts";
import {
	dim, cyan, yellow, red, style,
	visWidth, write, moveTo, selColor,
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
	expandedIds: new Set(),
};

// ── Priority Rendering ───────────────────────────────────────────────────────

const PRIORITY_INDICATOR = {
	blocked: () => red("●"),
	"needs-decision": () => yellow("●"),
	suggestion: () => cyan("●"),
	info: () => dim("○"),
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
		const expanded = state.expandedIds.has(n.id);

		rows.push({ kind: "entry", navIdx: i, data: n });

		// When expanded: wrapped continuation of title + summary
		if (expanded) {
			// Title continuation lines are added at render time (first line is in entry row)
			rows.push({ kind: "title-wrap", navIdx: i, text: n.title });
			if (n.summary) {
				rows.push({ kind: "summary", navIdx: i, text: n.summary });
			}
		}

		// Detail line: action label
		if (n.suggestedAction) {
			rows.push({ kind: "detail", navIdx: i, text: n.suggestedAction.label });
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
	if (state.expandedIds.has(entry.id)) {
		state.expandedIds.delete(entry.id);
	} else {
		state.expandedIds.add(entry.id);
	}
	rebuildNav();
}

export function dismissSelected() {
	const entry = getSelectedEntry();
	if (!entry) return;
	dismissNotification(entry.id);
	state.expandedIds.delete(entry.id);
	state.notifications = state.notifications.filter(n => n.id !== entry.id);
	rebuildNav();
}

export function snoozeSelected() {
	const entry = getSelectedEntry();
	if (!entry) return;
	snoozeNotification(entry.id);
	state.expandedIds.delete(entry.id);
	state.notifications = state.notifications.filter(n => n.id !== entry.id);
	rebuildNav();
}

export function dismissAllNotifications() {
	dismissAll(state.notifications);
	state.notifications = [];
	state.expandedIds.clear();
	rebuildNav();
}

export function acceptAction(targetPaneId) {
	const entry = getSelectedEntry();
	if (!entry?.suggestedAction) return { ok: false, error: "No action available" };
	const result = requestAction(entry.id, targetPaneId);
	// Don't remove locally — the notification is dismissed server-side
	// after the handler finishes executing (via completeAction → dismiss).
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

		if (vr.kind === "entry") {
			moveTo(row++, 1); contentRow++;
			renderEntryRow(vr.data, vr.navIdx === state.selectedIdx, innerW);
		} else if (vr.kind === "detail") {
			const indent = "     ";
			const wrapW = Math.max(1, innerW - indent.length);
			const lines = wrapText(vr.text, wrapW);
			for (const line of lines) {
				if (contentRow >= contentHeight) break;
				moveTo(row++, 1); contentRow++;
				write(contentLine(dim(indent + line), innerW));
			}
		} else if (vr.kind === "title-wrap") {
			// Render continuation lines of the title (line 1 is already in the entry row)
			const prefix = "    "; // aligns with text after "→ ● "
			const wrapW = Math.max(1, innerW - visWidth(prefix));
			const lines = wrapText(vr.text, wrapW);
			for (let li = 1; li < lines.length; li++) {
				if (contentRow >= contentHeight) break;
				moveTo(row++, 1); contentRow++;
				write(contentLine(prefix + lines[li], innerW));
			}
		} else if (vr.kind === "summary") {
			const indent = "     ";
			const wrapW = Math.max(1, innerW - indent.length);
			// Split on newlines first, then wrap each paragraph
			const paragraphs = vr.text.split("\n");
			for (const para of paragraphs) {
				const lines = wrapText(para, wrapW);
				for (const line of lines) {
					if (contentRow >= contentHeight) break;
					moveTo(row++, 1); contentRow++;
					write(contentLine(subdued(indent + line), innerW));
				}
			}
		}
	}

	return contentRow;
}

function renderEntryRow(n, selected, innerW) {
	const indicator = (PRIORITY_INDICATOR[n.priority] ?? PRIORITY_INDICATOR.info)();
	const cursor = selected ? selColor("→ ") : "  ";
	const prefixW = visWidth(cursor + indicator + " ");
	const titleW = Math.max(1, innerW - prefixW);
	// Use wrapText for first line so it splits consistently with continuation lines
	const lines = wrapText(n.title, titleW);
	const firstLine = lines[0] ?? "";
	const pad = " ".repeat(Math.max(0, innerW - prefixW - visWidth(firstLine)));
	write(bSide() + cursor + indicator + " " + firstLine + pad + bSide());
}


