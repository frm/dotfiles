export interface TrackInfo {
  name: string;
  artist: string;
  album: string;
  durationMs: number;
  positionMs: number;
  isPlaying: boolean;
}

export interface LyricLine {
  timeMs: number;
  text: string;
}

export interface PlayerProvider {
  getCurrentTrack(): Promise<TrackInfo | null>;
}

export interface LyricsProvider {
  fetchLyrics(track: string, artist: string, durationMs: number): Promise<LyricLine[] | null>;
}

export type ThemeAPI = {
  fg: (color: string, text: string) => string;
  bold: (text: string) => string;
  italic: (text: string) => string;
};

export interface Visualizer {
  name: string;
  render(width: number, frame: number, progress: number, theme: ThemeAPI): string[];
}

export interface MusicState {
  track: TrackInfo | null;
  lyrics: LyricLine[] | null;
  lyricsLoading: boolean;
  activeVisualizer: number;
  lyricsExpanded: boolean;
  frame: number;
  lyricsScrollOffset: number;
}
