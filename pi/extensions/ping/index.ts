import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { execFile } from "child_process";

export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "ping",
		label: "Ping",
		description:
			"Notify the user with a sound and macOS notification. Use when the user says 'ping me when ready' or similar.",
		parameters: {
			message: { type: "string", description: "Short message describing what's done", required: true },
		},
		execute: async (_event, params) => {
			const message = params?.message ?? "Ready";
			execFile("afplay", ["/System/Library/Sounds/Purr.aiff"]);
			execFile("osascript", ["-e", `display notification "${String(message).replace(/"/g, '\\"')}" with title "pi"`]);
			return { content: [{ type: "text", text: "Notification sent" }] };
		},
	});
}
