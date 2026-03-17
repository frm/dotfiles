# Pi Extensions

This directory contains pi extensions. Each extension is a folder with an `index.ts` entry point and an optional `lib/` directory for extracted modules.

When creating or modifying extensions, follow the patterns established by existing ones.

## Structure

Every extension exports a default function receiving `ExtensionAPI`:

```typescript
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) { ... }
```

Extract into `lib/` when `index.ts` exceeds ~200 lines. Keep registration and wiring in `index.ts`; move types, helpers, and domain logic into `lib/`.

## Naming

- Tool names: `snake_case` with `__` namespace — `linear__fetch_issue`
- Tool labels: title case — `"Linear: Fetch Issue"`
- Commands: `kebab-case` — `/self-improvement`
- Shortcuts: `alt+<key>`

## Config

Use `readConfig("namespace")` from `lib/config.ts` for settings. Use `~/.pi/agent/auth.json` for API credentials. Throw at use time, not load time.

## Notifications

Background extensions publish via `notificationsState` from `lib/notifications/index.ts`. Pass `source`, `fingerprint`, `snoozeDuration`, and a `suggestedAction` with a named handler.

## When creating a new extension

1. Create `<name>/index.ts` with default export
2. Create `<name>/README.md` — see `self-improvement/README.md` or `linear/README.md` for format
3. Extract `lib/` modules if `index.ts` > ~200 lines
4. Add config namespace in `.pi/config.json` if needed
5. **Update `pi/prompts/h.md`** with any new commands, tools, or shortcuts

## Reference

Read each extension's README for its API surface. Key shared libraries:

- `lib/config.ts` — config reader (walks CWD → $HOME)
- `lib/gh/` — GitHub state singleton
- `lib/notifications/` — notification publish/dismiss singleton
