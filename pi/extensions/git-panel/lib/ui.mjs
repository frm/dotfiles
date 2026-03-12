export const R = "\x1b[0m";
export const style = (codes, t) => `${codes}${t}${R}`;
export const bold = (t) => style("\x1b[1m", t);
export const dim = (t) => style("\x1b[2m", t);
export const yellow = (t) => style("\x1b[33m", t);
export const cyan = (t) => style("\x1b[36m", t);
export const green = (t) => style("\x1b[32m", t);
export const red = (t) => style("\x1b[31m", t);
export const magenta = (t) => style("\x1b[35m", t);
export const boldCyan = (t) => style("\x1b[1;36m", t);
export const bgCyan = (t) => style("\x1b[46;30m", t);

export const write = (s) => process.stdout.write(s);
export const enterAltScreen = () => write("\x1b[?1049h");
export const exitAltScreen = () => write("\x1b[?1049l");
export const hideCursor = () => write("\x1b[?25l");
export const showCursor = () => write("\x1b[?25h");
export const clearScreen = () => write("\x1b[2J\x1b[H");
export const moveTo = (r, c) => write(`\x1b[${r};${c}H`);

export function stripAnsi(s) { return s.replace(/\x1b\[[0-9;]*m/g, ""); }
export function visWidth(s) { return stripAnsi(s).length; }

export function truncate(s, maxW) {
	const plain = stripAnsi(s);
	if (plain.length <= maxW) return s;
	return plain.slice(0, maxW - 1) + "…";
}

export function smartTruncatePath(filePath, maxW) {
	if (filePath.length <= maxW) return filePath;
	const parts = filePath.split("/");
	if (parts.length === 1) return truncate(filePath, maxW);

	const fileName = parts[parts.length - 1];
	const dirs = parts.slice(0, -1);
	for (let i = 0; i < dirs.length; i++) {
		if (dirs[i].length > 1) dirs[i] = dirs[i][0];
		const candidate = dirs.join("/") + "/" + fileName;
		if (candidate.length <= maxW) return candidate;
	}
	const prefix = dirs.join("/") + "/";
	const remaining = maxW - prefix.length;
	if (remaining > 1) return prefix + truncate(fileName, remaining);
	return truncate(filePath, maxW);
}

export function emptyLine(innerW) {
	return dim("│") + " ".repeat(innerW) + dim("│");
}
