import type { Visualizer, ThemeAPI } from "../types.ts";

const BRAILLE = [" ", "\u2840", "\u28c0", "\u28e0", "\u28f0", "\u28f8", "\u28fc", "\u28fe", "\u28ff"];

export class WaveformVisualizer implements Visualizer {
  name = "waveform";

  render(width: number, frame: number, progress: number, theme: ThemeAPI): string[] {
    const count = Math.max(4, width);
    const cursor = Math.floor(progress * count);

    const accentRadius = 2; // 2 on each side of cursor = ~5 columns of accent
    let past = "";
    let accent = "";
    let future = "";

    for (let i = 0; i < count; i++) {
      const val = Math.sin((i * 0.5) + (frame * 0.25)) * 0.4
        + Math.cos((i * 0.3) + (frame * 0.15)) * 0.3
        + Math.sin((i * 0.9) + (frame * 0.4)) * 0.3;
      const normalized = (val + 1) / 2;
      const idx = Math.min(BRAILLE.length - 1, Math.max(0, Math.floor(normalized * BRAILLE.length)));
      const char = BRAILLE[idx];

      const dist = Math.abs(i - cursor);
      if (dist <= accentRadius) {
        accent += char;
      } else if (i < cursor - accentRadius) {
        past += char;
      } else {
        future += char;
      }
    }

    return [
      theme.fg("dim", past) + theme.fg("accent", theme.bold(accent)) + theme.fg("muted", future),
    ];
  }
}
