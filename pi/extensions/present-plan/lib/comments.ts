/** Map rendered line indices back to nearest section heading in the raw plan */
export function findSectionForLine(lineIdx: number, allLines: string[]): string | null {
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

export function formatCommentsAsFeedback(comments: Map<number, string>, allLines: string[]): string {
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
