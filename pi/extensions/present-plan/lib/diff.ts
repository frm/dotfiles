export const DIFF_BG = "\x1b[48;5;22m"; // dark green background
export const RESET = "\x1b[0m";

export function stripAnsi(s: string): string {
	return s.replace(/\x1b\[[0-9;]*m/g, "");
}

/** LCS-based diff: returns set of indices in newLines that are added/changed */
export function computeChangedLines(oldLines: string[], newLines: string[]): Set<number> {
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
