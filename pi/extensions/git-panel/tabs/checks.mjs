import { execFileSync } from "node:child_process";
import { gitRoot } from "../lib/git.mjs";
import { dim, cyan, green, yellow, red, visWidth, truncate, write, selColor } from "../lib/ui.mjs";

// ─── Data Fetching ───────────────────────────────────────────────────────────

export function fetchPrInfo() {
	try {
		const raw = execFileSync("gh",
			["pr", "view", "--json", "number,title,state,statusCheckRollup"],
			{ timeout: 15000, encoding: "utf-8", cwd: gitRoot, stdio: ["pipe", "pipe", "pipe"] },
		).trim();
		if (!raw) return null;

		const data = JSON.parse(raw);
		if (data.state !== "OPEN") return null;

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
	} catch { return null; }
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
