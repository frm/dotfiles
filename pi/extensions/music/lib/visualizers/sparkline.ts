import type { Visualizer, ThemeAPI } from "../types.ts";

const BARS = "\u2581\u2582\u2583\u2584\u2585\u2586\u2587\u2588";

export class SparklineVisualizer implements Visualizer {
  name = "sparkline";

  render(width: number, frame: number, _progress: number, theme: ThemeAPI): string[] {
    const count = Math.max(4, width);
    let line = "";
    for (let i = 0; i < count; i++) {
      const val = Math.sin((i * 0.4) + (frame * 0.3)) * 0.5
        + Math.sin((i * 0.7) + (frame * 0.2)) * 0.3
        + Math.sin((i * 1.1) + (frame * 0.5)) * 0.2;
      const normalized = (val + 1) / 2;
      const idx = Math.min(BARS.length - 1, Math.max(0, Math.floor(normalized * BARS.length)));
      line += BARS[idx];
    }
    return [theme.fg("accent", line)];
  }
}
