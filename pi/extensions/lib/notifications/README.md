# notifications — Notification Store Singleton

Persistent notification store built on the [singleton framework](../singleton/README.md). Maintains a shared list of notifications across all pi instances in a tmux session. Deduplicates by `source + fingerprint`, sorts by priority, and persists to disk.

## API

### `notificationsState`

The public API object. Import and use this — don't import from `singleton/` directly.

#### `notificationsState.start(pi, cwd)`

Starts the singleton. The leader owns the store and handles all mutations; clients route calls over the socket.

| Param | Type | Description |
|---|---|---|
| `pi` | `ExtensionAPI` | pi extension API |
| `cwd` | string | Working directory, used to derive the session root |

On leader start: restores persisted notifications from `~/.pi/agent/notifications.json`.

#### `notificationsState.stop()`

Stops the singleton and clears the store reference.

#### `notificationsState.publish(params)`

Publishes a notification. Returns `Promise<Notification | null>`.

Deduplication: if a notification with the same `source + fingerprint` already exists, it is updated in place (title, summary, priority, action, expiry) and its `count` is incremented. New notifications are appended and immediately persisted.

| Param | Type | Required | Description |
|---|---|---|---|
| `title` | string | yes | Short notification title |
| `summary` | string | no | Optional longer description |
| `source` | string | yes | Identifier for the producing extension (e.g. `"gh"`, `"ci"`) |
| `fingerprint` | string | yes | Stable key for dedup within the source (e.g. `"pr-123-failing"`) |
| `priority` | `Priority` | yes | See priority levels below |
| `expiresAt` | number | no | Unix timestamp (ms) after which the notification is auto-filtered from `list()` |
| `suggestedAction` | `SuggestedAction` | no | Optional action the user can execute |

#### `notificationsState.dismiss(id)`

Removes a notification by ID. Returns `Promise<boolean>` — `true` if found and removed.

#### `notificationsState.dismissByFingerprint(source, fingerprint)`

Removes a notification by `source + fingerprint`. Returns `Promise<boolean>`.

#### `notificationsState.list()`

Returns `Promise<Notification[]>`. Filters expired notifications, then sorts by priority (blocked first) then by `updatedAt` descending.

#### `notificationsState.requestAction(id)`

Broadcasts an `action-request` event to all connected pi instances. The instance matching the target pane ID (passed from the panel) claims and executes the action, then dismisses the notification on completion.

Returns `Promise<{ ok: boolean; dispatched?: boolean; error?: string }>`.

#### `notificationsState.registerHandler(name, fn)`

Registers an action handler. Must be called before `executeAction` is invoked for that handler name.

| Param | Type | Description |
|---|---|---|
| `name` | string | Handler name matching `suggestedAction.handler` (convention: `"source:action"`) |
| `fn` | `(params: Record<string, unknown>) => Promise<void>` | Handler implementation |

Handlers are stored in-process — register them in your extension's `start()` before calling `notificationsState.start()`.

## Data Types

```typescript
type Priority = "info" | "suggestion" | "needs-decision" | "blocked";

interface Notification {
  id: string;
  title: string;
  summary?: string;
  source: string;
  fingerprint: string;
  priority: Priority;
  count: number;           // incremented on each publish() for same source+fingerprint
  createdAt: number;
  updatedAt: number;
  expiresAt?: number;
  suggestedAction?: SuggestedAction;
}

interface SuggestedAction {
  label: string;
  handler: string;                       // namespaced: "source:action-name"
  params: Record<string, unknown>;
  confirm?: {                            // if set, panel shows y/n dialog before dispatching
    title: string;
    body: string;
  };
}

interface PublishParams {
  title: string;
  summary?: string;
  source: string;
  fingerprint: string;
  priority: Priority;
  expiresAt?: number;
  suggestedAction?: SuggestedAction;
}
```

## Priority Levels

Sorted highest-to-lowest priority in `list()` output:

| Priority | Use for |
|---|---|
| `"blocked"` | Agent is stuck and needs user intervention |
| `"needs-decision"` | A choice is required before work can proceed |
| `"suggestion"` | Recommended action, non-blocking |
| `"info"` | Informational status update |

## Out-of-Process Usage (Panels)

```typescript
import { createClient } from "../../lib/notifications/sync.ts";

const api = createClient(process.cwd());
const notifications = api.request("list");
```

`createClient(fallbackCwd)` returns a `SyncClient` that talks to the leader over the socket. Requests time out at 700ms and return `null` on failure.

## Persistence

- Notifications are persisted to `~/.pi/agent/notifications.json`
- Writes are **rate-limited to one write per key per 60s** for coalesced updates (first publish always writes immediately)
- Writes use an atomic rename (`<path>.tmp.<pid>` → `<path>`) to avoid corruption
- Restored on leader startup — clients do not restore from disk directly

## Usage Example

```typescript
// Publish a notification with an action
await notificationsState.publish({
  source: "ci",
  fingerprint: "build-failed-main",
  title: "CI build failed on main",
  summary: "3 checks failing. View logs to investigate.",
  priority: "blocked",
  suggestedAction: {
    label: "Open build logs",
    handler: "ci:open-logs",
    params: { url: "https://ci.example.com/build/123" },
  },
});

// Register the handler
notificationsState.registerHandler("ci:open-logs", async ({ url }) => {
  await openBrowser(url as string);
});

// Dismiss when resolved
await notificationsState.dismissByFingerprint("ci", "build-failed-main");
```
