/**
 * Custom Instructions Extension
 *
 * Reads ~/.pi/agent/instructions.md and appends it to the system prompt.
 * Edit the markdown file to change agent behavior without touching code.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
	const instructionsPath = join(process.env.HOME || "~", ".pi", "agent", "instructions.md");

	pi.on("before_agent_start", async (event) => {
		if (!existsSync(instructionsPath)) return;

		const instructions = readFileSync(instructionsPath, "utf-8").trim();
		if (!instructions) return;

		return {
			systemPrompt: event.systemPrompt + "\n\n" + instructions,
		};
	});
}
