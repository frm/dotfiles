import { truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";
import type { TrackInfo, MusicState, ThemeAPI } from "./types.ts";
import { getCurrentTrack } from "./player.ts";
import { fetchLyrics } from "./lyrics.ts";
import { getVisualizer, getVisualizerCount } from "./visualizer.ts";

const POLL_INTERVAL_MS = 200;
const TRACK_POLL_EVERY = 5;
const LYRICS_VISIBLE_COUNT = 8;

type Tui = { requestRender: () => void };

// Persisted across toggles
let persistedVisualizer = 0;
let persistedLyricsExpanded = false;

export class MusicWidget {
	private tui: Tui;
	private theme: ThemeAPI;
	private interval: ReturnType<typeof setInterval> | null = null;
	private tickCount = 0;
	private disposed = false;

	private state: MusicState = {
		track: null,
		lyrics: null,
		lyricsLoading: false,
		activeVisualizer: persistedVisualizer,
		lyricsExpanded: persistedLyricsExpanded,
		frame: 0,
		lyricsScrollOffset: 0,
	};

	private lastTrackKey = "";

	constructor(tui: Tui, theme: ThemeAPI) {
		this.tui = tui;
		this.theme = theme;
	}

	start() {
		this.pollTrack();

		this.interval = setInterval(() => {
			this.tickCount++;

			if (this.state.track?.isPlaying) {
				this.state.frame++;
				this.state.track.positionMs = Math.min(
					this.state.track.positionMs + POLL_INTERVAL_MS,
					this.state.track.durationMs,
				);
			}

			if (this.tickCount % TRACK_POLL_EVERY === 0) {
				this.pollTrack();
			}

			this.tui.requestRender();
		}, POLL_INTERVAL_MS);
	}

	stop() {
		this.persist();
		this.disposed = true;
		if (this.interval) {
			clearInterval(this.interval);
			this.interval = null;
		}
	}

	cycleVisualizer() {
		this.state.activeVisualizer = (this.state.activeVisualizer + 1) % getVisualizerCount();
		this.persist();
		this.tui.requestRender();
	}

	toggleLyrics() {
		this.state.lyricsExpanded = !this.state.lyricsExpanded;
		this.state.lyricsScrollOffset = 0;
		this.persist();
		this.tui.requestRender();
	}

	private persist() {
		persistedVisualizer = this.state.activeVisualizer;
		persistedLyricsExpanded = this.state.lyricsExpanded;
	}

	private async pollTrack() {
		const track = await getCurrentTrack();
		if (this.disposed) return;

		const newKey = track ? `${track.name}:::${track.artist}` : "";

		if (newKey !== this.lastTrackKey) {
			this.lastTrackKey = newKey;
			this.state.lyrics = null;
			this.state.lyricsScrollOffset = 0;

			if (track) {
				this.state.lyricsLoading = true;
				fetchLyrics(track.name, track.artist, track.durationMs).then((lyrics) => {
					if (this.disposed) return;
					this.state.lyrics = lyrics;
					this.state.lyricsLoading = false;
					this.tui.requestRender();
				});
			}
		}

		this.state.track = track;
	}

	// ─── Rendering ───────────────────────────────────────────────────────

	render(width: number): string[] {
		return this.buildLines(width);
	}

	invalidate() {}

	private buildLines(width: number): string[] {
		const { theme } = this;
		const lines: string[] = [];
		const { track } = this.state;

		// Separator
		lines.push(theme.fg("dim", "\u2500".repeat(width)));

		if (!track) {
			lines.push(this.pad(theme.fg("muted", "  Spotify is not running"), width));
		} else {
			// Track info
			const icon = track.isPlaying ? "\u266b" : "\u23f8";
			lines.push(this.pad(
				`  ${theme.fg("accent", icon)} ${theme.bold(truncateToWidth(track.name, width - 6))}`,
				width,
			));
			lines.push(this.pad(
				`  ${theme.fg("muted", truncateToWidth(`${track.artist} \u2014 ${track.album}`, width - 4))}`,
				width,
			));

			// Blank line
			lines.push("");

			// Visualizer
			const progress = track.durationMs > 0
				? Math.min(1, track.positionMs / track.durationMs)
				: 0;
			const viz = getVisualizer(this.state.activeVisualizer);
			const vizWidth = Math.max(4, width - 4);
			const vizLines = viz.render(vizWidth, this.state.frame, progress, theme);
			for (const vl of vizLines) {
				lines.push(this.pad(`  ${vl}`, width));
			}

			// Blank line
			lines.push("");

			// Progress bar
			lines.push(this.pad(this.renderProgress(track, width - 4), width));

			// Lyrics
			if (this.state.lyricsExpanded) {
				lines.push("");
				lines.push(theme.fg("dim", "  " + "\u2500".repeat(Math.max(1, width - 4))));
				lines.push("");
				this.renderLyrics(lines, width, track);
			}
		}

		// Bottom separator
		lines.push(theme.fg("dim", "\u2500".repeat(width)));

		return lines;
	}

	private renderProgress(track: TrackInfo, barWidth: number): string {
		const { theme } = this;
		const progress = Math.min(1, track.durationMs > 0 ? track.positionMs / track.durationMs : 0);
		const timeLeft = this.formatTime(track.positionMs);
		const timeRight = this.formatTime(track.durationMs);

		const available = Math.max(1, barWidth - timeLeft.length - timeRight.length - 4);
		const filled = Math.round(progress * available);
		const empty = available - filled;
		const bar = theme.fg("accent", "\u2588".repeat(filled)) + theme.fg("dim", "\u2591".repeat(empty));

		return `  ${theme.fg("muted", timeLeft)} ${bar} ${theme.fg("muted", timeRight)}`;
	}

	private renderLyrics(lines: string[], width: number, track: TrackInfo) {
		const { theme, state } = this;

		if (state.lyricsLoading) {
			lines.push(this.pad(theme.fg("muted", "  Loading lyrics..."), width));
			return;
		}

		if (!state.lyrics) {
			lines.push(this.pad(theme.fg("muted", "  No lyrics available"), width));
			return;
		}

		let currentIdx = 0;
		for (let i = 0; i < state.lyrics.length; i++) {
			if (state.lyrics[i].timeMs <= track.positionMs) {
				currentIdx = i;
			} else {
				break;
			}
		}

		let startIdx = currentIdx - Math.floor(LYRICS_VISIBLE_COUNT / 2) + state.lyricsScrollOffset;
		startIdx = Math.max(0, Math.min(startIdx, state.lyrics.length - LYRICS_VISIBLE_COUNT));
		const endIdx = Math.min(state.lyrics.length, startIdx + LYRICS_VISIBLE_COUNT);

		for (let i = startIdx; i < endIdx; i++) {
			const text = truncateToWidth(state.lyrics[i].text, width - 4);
			if (i === currentIdx) {
				lines.push(this.pad(`  ${theme.fg("accent", theme.bold(text))}`, width));
			} else if (i < currentIdx) {
				lines.push(this.pad(`  ${theme.fg("dim", text)}`, width));
			} else {
				lines.push(this.pad(`  ${theme.fg("muted", text)}`, width));
			}
		}
	}

	private formatTime(ms: number): string {
		const totalSec = Math.max(0, Math.floor(ms / 1000));
		const min = Math.floor(totalSec / 60);
		const sec = totalSec % 60;
		return `${min}:${sec.toString().padStart(2, "0")}`;
	}

	private pad(content: string, width: number): string {
		const w = visibleWidth(content);
		if (w >= width) return truncateToWidth(content, width);
		return content + " ".repeat(width - w);
	}
}
