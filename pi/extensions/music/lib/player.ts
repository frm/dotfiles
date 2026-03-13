import type { PlayerProvider, TrackInfo } from "./types.ts";
import { SpotifyPlayer } from "./players/spotify.ts";

const providers: PlayerProvider[] = [new SpotifyPlayer()];

export async function getCurrentTrack(): Promise<TrackInfo | null> {
  for (const provider of providers) {
    const track = await provider.getCurrentTrack();
    if (track) return track;
  }
  return null;
}
