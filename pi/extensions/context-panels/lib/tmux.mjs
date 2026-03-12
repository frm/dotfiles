import { execFileSync } from "node:child_process";

const PIPE = ["pipe", "pipe", "pipe"];

export function tmuxRun(...args) {
	execFileSync("tmux", args, { timeout: 3000, stdio: PIPE });
}

export function tmuxQuery(...args) {
	let timeout = 3000;
	const last = args[args.length - 1];
	if (typeof last === "object" && last !== null) {
		args.pop();
		if (last.timeout) timeout = last.timeout;
	}
	return execFileSync("tmux", args, {
		timeout, encoding: "utf-8", stdio: PIPE,
	}).trim();
}

export function tmuxFormat(format, target) {
	const args = ["display-message"];
	if (target) args.push("-t", target);
	args.push("-p", format);
	return tmuxQuery(...args);
}

export function tmuxInteractive(...args) {
	execFileSync("tmux", args, { stdio: "inherit" });
}
