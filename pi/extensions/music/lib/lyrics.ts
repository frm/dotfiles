import type { LyricsProvider, LyricLine } from "./types.ts";
import { LrclibProvider } from "./lyrics/lrclib.ts";

const providers: LyricsProvider[] = [new LrclibProvider()];
const cache = new Map<string, LyricLine[] | null>();

function cacheKey(track: string, artist: string): string {
  return `${track}:::${artist}`.toLowerCase();
}

export async function fetchLyrics(track: string, artist: string, durationMs: number): Promise<LyricLine[] | null> {
  const key = cacheKey(track, artist);
  if (cache.has(key)) return cache.get(key)!;

  for (const provider of providers) {
    const lyrics = await provider.fetchLyrics(track, artist, durationMs);
    if (lyrics) {
      cache.set(key, lyrics);
      return lyrics;
    }
  }
  cache.set(key, null);
  return null;
}
