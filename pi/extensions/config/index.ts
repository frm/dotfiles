/**
 * Config Extension
 *
 * Exposes a fetch_config tool so the LLM can read .pi/config.json values.
 * Config is resolved by walking up from CWD to $HOME, nearest wins.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { readConfig, getByPath } from "../lib/config.ts";

export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "fetch_config",
		label: "Fetch Config",
		description:
			"Read a value from .pi/config.json. Config files are resolved by walking up the directory " +
			"tree from CWD to $HOME (nearest wins). Pass a dot-notation key to read a specific value, " +
			"or omit to get the full config.",
		parameters: Type.Object({
			key: Type.Optional(
				Type.String({
					description: 'Dot-notation key path, e.g. "self-improvement.enabled"',
				})
			),
		}),
		async execute(_id, params) {
			const config = readConfig();
			const value = params.key ? getByPath(config, params.key) : config;
			return {
				content: [{ type: "text", text: JSON.stringify(value ?? null, null, 2) }],
				details: { key: params.key ?? null, value: value ?? null },
			};
		},
	});
}
