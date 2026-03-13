import type { Visualizer } from "./types.ts";
import { SparklineVisualizer } from "./visualizers/sparkline.ts";
import { WaveformVisualizer } from "./visualizers/waveform.ts";
import { ClassicVisualizer } from "./visualizers/classic.ts";

const visualizers: Visualizer[] = [
  new SparklineVisualizer(),
  new WaveformVisualizer(),
  new ClassicVisualizer(),
];

export function getVisualizer(index: number): Visualizer {
  return visualizers[index % visualizers.length];
}

export function getVisualizerCount(): number {
  return visualizers.length;
}
