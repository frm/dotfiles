import { gitRoot } from "../../lib/git.mjs";
import { prView } from "../../lib/gh.mjs";
import { dim, cyan, green, yellow, red, visWidth, truncate, write, selColor } from "../../lib/ui.mjs";

// ─── Data Fetching ───────────────────────────────────────────────────────────

export function fetchPrInfo() {
	const data = prView("number,title,state,statusCheckRollup", gitRoot);
	if (!data || data.state !== "OPEN") return null;

	const checks = [];
	if (Array.isArray(data.statusCheckRollup)) {
		for (const item of data.statusCheckRollup) {
			const name = item.name || item.context || "Unknown";
			const conclusion = (item.conclusion || "").toLowerCase();
			const checkStatus = (item.status || "").toLowerCase();

			let status;
			if (["success", "neutral", "skipped"].includes(conclusion)) status = "pass";
			else if (["failure", "timed_out", "cancelled", "action_required"].includes(conclusion)) status = "fail";
			else if (checkStatus === "completed" && !conclusion) status = "pass";
			else status = "pending";

			checks.push({ name, status, conclusion: conclusion || checkStatus || "unknown", detailsUrl: item.detailsUrl || item.targetUrl });
		}
	}
	return { number: data.number, title: data.title, checks };
}

// ─── Rendering ───────────────────────────────────────────────────────────────

export function renderCheckEntry(check, selected, innerW) {
	let icon, colorFn;
	switch (check.status) {
		case "pass": icon = "✓"; colorFn = green; break;
		case "fail": icon = "✗"; colorFn = red; break;
		case "pending": icon = "●"; colorFn = yellow; break;
		default: icon = "?"; colorFn = dim;
	}
	const prefix = selected ? selColor(" → ") : "   ";
	const statusStr = colorFn(icon) + " ";
	const prefixW = visWidth(prefix) + visWidth(statusStr);
	const name = truncate(check.name, innerW - prefixW);
	const pad = " ".repeat(Math.max(0, innerW - prefixW - visWidth(name)));
	const border = selected ? selColor("▐") : dim("│");
	write(border + prefix + statusStr + name + pad + dim("│"));
}
