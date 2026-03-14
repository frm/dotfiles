# TypeScript Patterns

### Factory functions over classes

Prefer `createX()` functions that return an interface over `class X`. Use closures for private state instead of private fields. Classes are fine for providers that implement an interface (e.g., `SpotifyPlayer implements PlayerProvider`).

```typescript
// Good: factory with closure
export function createFocusManager({ shared, render }) {
  let active = false;
  // ...
  return { get active() { return active; }, processInput };
}

// Fine: class implementing a provider interface
export class SpotifyPlayer implements PlayerProvider {
  async getCurrentTrack(): Promise<TrackInfo | null> { ... }
}
```

### Thin wrapper modules for external tools

When calling external CLIs (git, tmux, gh), create a thin wrapper module with typed functions. Keep the `execFileSync`/`execFile` calls in one place with consistent timeout/stdio options.

```typescript
// git.ts — all git operations go through here
const PIPE = ["pipe", "pipe", "pipe"];

export function git(...args) {
  return execFileSync("git", args, {
    timeout: 5000, encoding: "utf-8", cwd: gitRoot, stdio: PIPE,
  }).replace(/\n$/, "");
}
```

### Types live next to their consumers

`types.ts` sits in the same `lib/` directory as the code that uses the types. Don't create a top-level `types/` directory.

### Explicit return types on public APIs, inferred on internals

Exported functions that form a module boundary get explicit return types. Internal helpers use inference.
