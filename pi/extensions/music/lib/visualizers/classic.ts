import type { Visualizer, ThemeAPI } from "../types.ts";

const BLOCKS = [" ", "\u2581", "\u2582", "\u2583", "\u2584", "\u2585", "\u2586", "\u2587", "\u2588"];
const NUM_BARS = 16;

// Simple hash for pseudo-random per-bar energy
function hash(a: number, b: number): number {
  let h = (a * 2654435761) ^ (b * 2246822519);
  h = ((h >>> 16) ^ h) * 0x45d9f3b;
  h = ((h >>> 16) ^ h) * 0x45d9f3b;
  return ((h >>> 16) ^ h) >>> 0;
}

export class ClassicVisualizer implements Visualizer {
  name = "classic";
  private levels: number[] = new Array(NUM_BARS).fill(0);
  private targets: number[] = new Array(NUM_BARS).fill(0);

  render(width: number, frame: number, _progress: number, theme: ThemeAPI): string[] {
    // Each bar picks a new target on its own cycle, staggered
    for (let i = 0; i < NUM_BARS; i++) {
      const period = 3 + (i % 4); // bars update every 3-6 frames
      const offset = hash(i, 0) % period; // stagger the phase
      if ((frame + offset) % period === 0) {
        this.targets[i] = hash(frame, i) % 9; // 0-8, full range
      }
    }

    // Smoothly move levels toward targets
    for (let i = 0; i < NUM_BARS; i++) {
      const diff = this.targets[i] - this.levels[i];
      if (diff > 0) {
        this.levels[i] += Math.min(diff, 2); // rise fast
      } else if (diff < 0) {
        this.levels[i] += Math.max(diff, -1); // fall slower
      }
    }

    const barWidth = Math.max(1, Math.floor(width / NUM_BARS));
    let line = "";
    for (let i = 0; i < NUM_BARS; i++) {
      const lvl = Math.min(BLOCKS.length - 1, Math.max(0, this.levels[i]));
      line += BLOCKS[lvl].repeat(barWidth);
    }
    const target = Math.max(4, width);
    if (line.length < target) line += " ".repeat(target - line.length);
    else if (line.length > target) line = line.slice(0, target);

    return [theme.fg("accent", line)];
  }
}
