import type { LyricsProvider, LyricLine } from "../types.ts";

function parseLrc(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];
  for (const line of lrc.split("\n")) {
    const match = line.match(/^\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)$/);
    if (!match) continue;
    const minutes = parseInt(match[1], 10);
    const seconds = parseInt(match[2], 10);
    const centis = match[3].length === 2 ? parseInt(match[3], 10) * 10 : parseInt(match[3], 10);
    const timeMs = minutes * 60000 + seconds * 1000 + centis;
    const text = match[4].trim();
    if (text) lines.push({ timeMs, text });
  }
  return lines;
}

export class LrclibProvider implements LyricsProvider {
  async fetchLyrics(track: string, artist: string, durationMs: number): Promise<LyricLine[] | null> {
    try {
      const params = new URLSearchParams({
        track_name: track,
        artist_name: artist,
        duration: String(Math.round(durationMs / 1000)),
      });
      const resp = await fetch(`https://lrclib.net/api/get?${params}`, {
        headers: { "User-Agent": "pi-music-extension/1.0" },
        signal: AbortSignal.timeout(5000),
      });
      if (!resp.ok) return null;
      const data = await resp.json() as { syncedLyrics?: string };
      if (!data.syncedLyrics) return null;
      const lines = parseLrc(data.syncedLyrics);
      return lines.length > 0 ? lines : null;
    } catch {
      return null;
    }
  }
}
