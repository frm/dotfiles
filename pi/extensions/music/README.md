# Music Extension

Displays a live music widget in the terminal showing the currently playing Spotify track. The widget renders the track name, artist, album, playback state, a progress bar, and an animated visualizer. Lyrics can be toggled on and are fetched from [lrclib.net](https://lrclib.net) and synchronized to playback position. Spotify is polled every 200ms for playback state and every 1s for track metadata.

## Tools

None.

## Commands

| Command | Description |
|---|---|
| `/music` | Toggle the music widget on or off |

## Shortcuts

| Shortcut | Description |
|---|---|
| `alt+m` | Toggle the music widget |
| `alt+k` | Cycle through visualizer styles (classic / sparkline / waveform) |
| `alt+j` | Toggle lyrics display |

## Notable Behavior

- **Visualizer styles** — Three modes are available and cycle in order: `classic` (bar chart), `sparkline` (unicode braille), and `waveform` (oscilloscope-style).
- **Lyrics sync** — Lyrics are fetched from lrclib.net and highlighted in sync with the current playback position.
- **Progress bar** — Displays elapsed and total track duration, updated every 200ms.

## Config

No configuration options.
