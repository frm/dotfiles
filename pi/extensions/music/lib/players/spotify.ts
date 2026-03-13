import { execFile } from "child_process";
import type { PlayerProvider, TrackInfo } from "../types.ts";

const SCRIPT = `
tell application "System Events"
  if not (exists process "Spotify") then
    return "NOT_RUNNING"
  end if
end tell
tell application "Spotify"
  if player state is stopped then
    return "STOPPED"
  end if
  set trackName to name of current track
  set trackArtist to artist of current track
  set trackAlbum to album of current track
  set trackDuration to duration of current track
  set playerPos to player position
  set isPlaying to (player state is playing)
  return trackName & "\n" & trackArtist & "\n" & trackAlbum & "\n" & trackDuration & "\n" & playerPos & "\n" & isPlaying
end tell
`;

function runOsascript(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile("osascript", ["-e", script], { timeout: 3000 }, (err, stdout) => {
      if (err) reject(err);
      else resolve(stdout.trim());
    });
  });
}

export class SpotifyPlayer implements PlayerProvider {
  async getCurrentTrack(): Promise<TrackInfo | null> {
    try {
      const result = await runOsascript(SCRIPT);

      if (result === "NOT_RUNNING" || result === "STOPPED" || !result) {
        return null;
      }

      const lines = result.split("\n");
      if (lines.length < 6) return null;

      return {
        name: lines[0],
        artist: lines[1],
        album: lines[2],
        durationMs: parseInt(lines[3], 10),
        positionMs: Math.round(parseFloat(lines[4]) * 1000),
        isPlaying: lines[5] === "true",
      };
    } catch {
      return null;
    }
  }
}
