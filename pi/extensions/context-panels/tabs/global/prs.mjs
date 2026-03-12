import { extractIssueId } from "../../lib/data.mjs";
import { lookupIssue } from "../../lib/linear.mjs";
import { prList, getUsername } from "../../lib/gh.mjs";
import {
	dim, cyan, green, yellow, red,
	truncate, visWidth, write, moveTo, selColor,
	contentLine, dividerLine, renderSectionRow,
	buildSectionNav, buildSectionVisual,
} from "../../lib/ui.mjs";

// ─── PR JSON fields requested from gh ────────────────────────────────────────

const JSON_FIELDS = "number,title,headRefName,url,reviewDecision,latestReviews,reviewRequests,statusCheckRollup,mergeStateStatus,autoMergeRequest,mergeable";

// ─── Classification ──────────────────────────────────────────────────────────

function hasCheckFailure(pr) {
	return pr.statusCheckRollup?.some((c) =>
		c.conclusion === "FAILURE" || c.state === "FAILURE"
	) ?? false;
}

function checkSummary(pr) {
	const checks = pr.statusCheckRollup;
	if (!checks || checks.length === 0) return null;
	const total = checks.length;
	const passing = checks.filter((c) =>
		c.conclusion === "SUCCESS" || c.conclusion === "SKIPPED" || c.state === "SUCCESS"
	).length;
	const hasFail = checks.some((c) => c.conclusion === "FAILURE" || c.state === "FAILURE");
	const hasPending = checks.some((c) =>
		c.status === "IN_PROGRESS" || c.status === "QUEUED" || c.status === "PENDING" || c.state === "PENDING"
	);
	let status = null;
	if (hasFail) status = "fail";
	else if (hasPending) status = "pending";
	else if (passing === total) status = "pass";
	return { status, passing, total };
}

function classifyReviewerPr(pr, myLogin) {
	if (pr.autoMergeRequest && pr.reviewDecision === "APPROVED" && pr.mergeable !== "CONFLICTING") return "rv-queued";

	const stillRequested = pr.reviewRequests?.some((r) =>
		(r.__typename === "User" && r.login === myLogin) || r.__typename === "Team"
	);
	const myReview = pr.latestReviews?.find((r) => r.author?.login === myLogin);

	// If I still need to review, that takes priority over conflicts
	if (!myReview || stillRequested) return "rv-needs-review";

	// Conflicts only matter after I've done my part
	if (pr.mergeable === "CONFLICTING") return "rv-waiting-author";

	if (myReview.state === "APPROVED") {
		return pr.reviewDecision === "APPROVED" ? "rv-approved" : "rv-waiting-others";
	}
	if (myReview.state === "CHANGES_REQUESTED" || myReview.state === "COMMENTED") {
		return "rv-waiting-author";
	}
	return "rv-needs-review";
}

function classifyMyPr(pr) {
	if (pr.mergeable === "CONFLICTING") return "my-needs-attention";
	if (pr.autoMergeRequest && pr.reviewDecision === "APPROVED" && pr.mergeable !== "CONFLICTING") return "my-queued";
	if (pr.reviewDecision === "APPROVED") return "my-approved";

	const failed = hasCheckFailure(pr);
	// Only count reviews as needing attention if the reviewer is still an active reviewer
	const activeReviewerLogins = new Set((pr.reviewRequests ?? []).map((r) => r.login).filter(Boolean));
	const hasActiveNonApproval = pr.latestReviews?.some((r) =>
		(r.state === "CHANGES_REQUESTED" || r.state === "COMMENTED") && activeReviewerLogins.has(r.author?.login)
	);
	if (failed || hasActiveNonApproval) return "my-needs-attention";
	return "my-waiting-feedback";
}

// ─── Fetch ───────────────────────────────────────────────────────────────────

function buildEntry(pr, status) {
	const issueId = extractIssueId(pr.headRefName);
	const linearIssue = issueId ? lookupIssue(issueId) : null;
	const checks = checkSummary(pr);
	let attentionType = null;
	if (status === "my-needs-attention") {
		if (pr.mergeable === "CONFLICTING") attentionType = "conflicts";
		else if (hasCheckFailure(pr)) attentionType = "build";
		else attentionType = "review";
	}
	return { number: pr.number, title: pr.title, branch: pr.headRefName, url: pr.url, status, checks, linearIssue, attentionType };
}

export function fetchPrData(cwd) {
	if (!cwd) return { reviewPrs: [], myPrs: [] };
	const myLogin = getUsername();

	const rawReview = prList({ search: "review-requested:@me is:open", json: JSON_FIELDS, limit: 50 }, cwd);
	const rawMy = prList({ author: "@me", state: "open", json: JSON_FIELDS, limit: 50 }, cwd);

	const reviewPrs = rawReview.map((pr) => buildEntry(pr, classifyReviewerPr(pr, myLogin)));
	const myPrs = rawMy.map((pr) => buildEntry(pr, classifyMyPr(pr)));
	return { reviewPrs, myPrs };
}

// ─── Sections ────────────────────────────────────────────────────────────────

const REVIEW_SECTION_DEFS = [
	{ key: "rv-queued", label: "Queued", icon: "⧖", colorFn: cyan },
	{ key: "rv-approved", label: "Approved", icon: "✓", colorFn: green },
	{ key: "rv-needs-review", label: "Needs Review", icon: "●", colorFn: yellow },
	{ key: "rv-waiting-author", label: "Waiting for Author", icon: "◐", colorFn: dim },
	{ key: "rv-waiting-others", label: "Waiting for Others", icon: "◐", colorFn: dim },
];

const MY_SECTION_DEFS = [
	{ key: "my-queued", label: "Queued", icon: "⧖", colorFn: cyan },
	{ key: "my-approved", label: "Approved", icon: "✓", colorFn: green },
	{ key: "my-needs-attention", label: "Needs Attention", icon: "●", colorFn: red },
	{ key: "my-waiting-feedback", label: "Waiting for Feedback", icon: "◐", colorFn: dim },
];

// ─── State ───────────────────────────────────────────────────────────────────

export const state = {
	reviewSections: REVIEW_SECTION_DEFS.map((s) => ({ ...s, entries: [] })),
	mySections: MY_SECTION_DEFS.map((s) => ({ ...s, entries: [] })),
	navItems: [],
	visualRows: [],
	selectedIdx: 0,
	scrollOffset: 0,
};

function hasDetail(_entry) { return true; }

export function rebuildNav() {
	const { reviewSections, mySections } = state;

	// Review half
	const rvNav = buildSectionNav(reviewSections).map((item) => ({ ...item, half: "review" }));
	const rvVis = buildSectionVisual(rvNav, reviewSections, hasDetail).map((r) => ({ ...r, half: "review" }));

	// My half — nav indices offset by review count
	const myNav = buildSectionNav(mySections).map((item) => ({ ...item, half: "my" }));
	const myVis = buildSectionVisual(myNav, mySections, hasDetail).map((r) => ({
		...r,
		navIdx: r.navIdx + rvNav.length,
		half: "my",
	}));

	state.navItems = [...rvNav, ...myNav];
	state.visualRows = [...rvVis, { kind: "divider" }, ...myVis];

	if (state.selectedIdx >= state.navItems.length) state.selectedIdx = Math.max(0, state.navItems.length - 1);
	if (state.selectedIdx < 0) state.selectedIdx = 0;
}

export function applyData(reviewPrs, myPrs) {
	const { reviewSections, mySections } = state;

	const rvGroups = Object.fromEntries(REVIEW_SECTION_DEFS.map((s) => [s.key, []]));
	for (const pr of reviewPrs) if (rvGroups[pr.status]) rvGroups[pr.status].push(pr);
	for (const sec of reviewSections) sec.entries = rvGroups[sec.key] ?? [];

	const myGroups = Object.fromEntries(MY_SECTION_DEFS.map((s) => [s.key, []]));
	for (const pr of myPrs) if (myGroups[pr.status]) myGroups[pr.status].push(pr);
	for (const sec of mySections) sec.entries = myGroups[sec.key] ?? [];

	rebuildNav();
}

export function getSelectedEntry() {
	const item = state.navItems[state.selectedIdx];
	if (!item || item.type !== "entry") return null;
	const sections = item.half === "review" ? state.reviewSections : state.mySections;
	return sections[item.sectionIdx].entries[item.entryIdx];
}

export function getSelectedSections() {
	const item = state.navItems[state.selectedIdx];
	if (!item) return state.reviewSections;
	return item.half === "review" ? state.reviewSections : state.mySections;
}

// ─── Rendering ───────────────────────────────────────────────────────────────

export function renderTab(startRow, innerW, contentHeight) {
	let row = startRow;
	let contentRow = 0;
	const { navItems, visualRows } = state;
	let { selectedIdx, scrollOffset } = state;

	const totalEntries = state.reviewSections.reduce((n, s) => n + s.entries.length, 0)
		+ state.mySections.reduce((n, s) => n + s.entries.length, 0);

	if (totalEntries === 0) {
		moveTo(row++, 1); write(contentLine(dim(" No pull requests"), innerW));
		return 1;
	}

	// Scroll
	const selFirst = visualRows.findIndex((r) => r.navIdx === selectedIdx);
	const selLast = visualRows.findLastIndex((r) => r.navIdx === selectedIdx);
	if (selFirst !== -1) {
		if (selFirst < scrollOffset) scrollOffset = selFirst;
		if (selLast >= scrollOffset + contentHeight) scrollOffset = selLast - contentHeight + 1;
	}
	scrollOffset = Math.max(0, Math.min(scrollOffset, Math.max(0, visualRows.length - contentHeight)));
	state.scrollOffset = scrollOffset;

	const visibleCount = Math.min(visualRows.length - scrollOffset, contentHeight);
	for (let vi = 0; vi < visibleCount; vi++) {
		const vr = visualRows[scrollOffset + vi];
		moveTo(row++, 1); contentRow++;

		if (vr.kind === "divider") {
			write(dividerLine(innerW));
		} else if (vr.kind === "section") {
			const sections = vr.half === "review" ? state.reviewSections : state.mySections;
			renderSectionRow(sections, navItems[vr.navIdx], vr.navIdx === selectedIdx, innerW);
		} else if (vr.kind === "entry") {
			const sections = vr.half === "review" ? state.reviewSections : state.mySections;
			renderEntryRow(sections, navItems[vr.navIdx], vr.navIdx === selectedIdx, innerW);
		} else if (vr.kind === "detail") {
			const sections = vr.half === "review" ? state.reviewSections : state.mySections;
			renderDetailRow(sections, navItems[vr.navIdx], innerW);
		}
	}
	return contentRow;
}

function renderEntryRow(sections, item, selected, innerW) {
	const entry = sections[item.sectionIdx].entries[item.entryIdx];
	const cursor = selected ? selColor("→ ") : "  ";
	const title = truncate(entry.title, innerW - 3);
	const pad = " ".repeat(Math.max(0, innerW - 3 - visWidth(title)));
	write(dim("│") + " " + cursor + title + pad + dim("│"));
}

function renderDetailRow(sections, item, innerW) {
	const entry = sections[item.sectionIdx].entries[item.entryIdx];
	const parts = [];

	let prefix = "";
	if (entry.attentionType === "conflicts") prefix = red("⇄") + " ";
	else if (entry.attentionType === "build") prefix = red("✗") + " ";
	else if (entry.attentionType === "review") prefix = yellow("✎") + " ";
	else if (entry.checks?.status === "fail") prefix = red("✗") + " ";
	else if (entry.checks?.status === "pass") prefix = green("✓") + " ";
	else if (entry.checks?.status === "pending") prefix = "⧖ ";

	let prPart = prefix + cyan(`#${entry.number}`);
	if (entry.checks?.total > 0) prPart += dim(` (${entry.checks.passing}/${entry.checks.total})`);
	parts.push(prPart);

	if (entry.linearIssue) parts.push(dim(entry.linearIssue.identifier));

	const indent = "     ";
	const full = indent + parts.join(dim(" • "));
	const pad = " ".repeat(Math.max(0, innerW - visWidth(full)));
	write(dim("│") + full + pad + dim("│"));
}
