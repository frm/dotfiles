import { spawn } from "node:child_process";

export interface PiRunResult {
	exitCode: number;
	stderr: string;
	messages: string[];
}

const FIX_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export async function runPi(
	prompt: string,
	cwd: string,
	onProgress?: (line: string) => void,
): Promise<PiRunResult> {
	return await new Promise((resolve, reject) => {
		const child = spawn("pi", [
			"--mode", "json",
			"-p",
			"--no-session",
			`Task: ${prompt}`,
		], {
			cwd,
			stdio: ["ignore", "pipe", "pipe"],
		});

		const timeout = setTimeout(() => {
			child.kill("SIGTERM");
			setTimeout(() => child.kill("SIGKILL"), 5000);
		}, FIX_TIMEOUT_MS);

		let stderr = "";
		let buffer = "";
		const messages: string[] = [];

		child.stdout.on("data", (data: Buffer) => {
			buffer += data.toString();
			const lines = buffer.split("\n");
			buffer = lines.pop() ?? "";

			for (const line of lines) {
				const trimmed = line.trim();
				if (!trimmed) continue;
				let event: Record<string, any>;
				try {
					event = JSON.parse(trimmed);
				} catch {
					continue;
				}

				// Pi emits message_end events with the full message
				if (event.type === "message_end" && event.message?.role === "assistant") {
					for (const part of event.message.content ?? []) {
						if (part.type === "text" && part.text) {
							messages.push(part.text);
							onProgress?.(`💬 ${part.text.split("\n")[0]}`);
						}
						if (part.type === "toolCall") {
							const name = part.name ?? "tool";
							const args = part.arguments ?? {};
							if (name === "bash" && args.command) {
								onProgress?.(`▶ ${args.command.split("\n")[0]}`);
							} else if (name === "edit" && args.path) {
								onProgress?.(`✎ ${args.path}`);
							} else if (name === "write" && args.path) {
								onProgress?.(`✎ ${args.path}`);
							} else if (name === "read" && args.path) {
								onProgress?.(`📖 ${args.path}`);
							} else {
								onProgress?.(`🔧 ${name}`);
							}
						}
					}
				}

				// Pi emits error events on failure
				if (event.type === "error") {
					onProgress?.(`✗ ${event.message ?? "failed"}`);
				}
			}
		});

		child.stderr.on("data", (data: Buffer) => {
			stderr += data.toString();
		});

		child.on("error", (err) => {
			clearTimeout(timeout);
			reject(err);
		});
		child.on("close", (code) => {
			clearTimeout(timeout);
			resolve({
				exitCode: code ?? 1,
				stderr,
				messages,
			});
		});
	});
}
