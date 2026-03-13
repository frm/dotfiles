import { execFileSync } from "node:child_process";

export function copyToClipboard(text: string): boolean {
	try {
		execFileSync("pbcopy", [], { input: text, timeout: 3000, stdio: ["pipe", "pipe", "pipe"] });
		return true;
	} catch {
		return false;
	}
}
