import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { MusicWidget } from "./lib/widget.ts";

export default function music(pi: ExtensionAPI) {
	let widget: MusicWidget | null = null;

	pi.registerShortcut("alt+m", {
		description: "Toggle music widget",
		handler: async (ctx) => {
			if (!ctx.hasUI) return;

			if (widget) {
				widget.stop();
				widget = null;
				ctx.ui.setWidget("music", undefined);
				return;
			}

			ctx.ui.setWidget("music", (tui, theme) => {
				widget = new MusicWidget(tui, theme);
				widget.start();
				return {
					render: (width: number) => widget!.render(width),
					invalidate: () => widget!.invalidate(),
					dispose: () => {
						widget?.stop();
						widget = null;
					},
				};
			});
		},
	});

	pi.registerShortcut("alt+k", {
		description: "Cycle music visualizer",
		handler: async () => {
			widget?.cycleVisualizer();
		},
	});

	pi.registerShortcut("alt+j", {
		description: "Toggle music lyrics",
		handler: async () => {
			widget?.toggleLyrics();
		},
	});

	pi.registerCommand("music", {
		description: "Toggle music widget (same as alt+m)",
		handler: async (_args, ctx) => {
			if (!ctx.hasUI) return;

			if (widget) {
				widget.stop();
				widget = null;
				ctx.ui.setWidget("music", undefined);
				return;
			}

			ctx.ui.setWidget("music", (tui, theme) => {
				widget = new MusicWidget(tui, theme);
				widget.start();
				return {
					render: (width: number) => widget!.render(width),
					invalidate: () => widget!.invalidate(),
					dispose: () => {
						widget?.stop();
						widget = null;
					},
				};
			});
		},
	});
}
