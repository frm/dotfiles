# Singleton — Generic Leader-Election IPC Framework

Generic library for running a single-leader service across multiple pi instances sharing a tmux session. One instance wins leader election via Unix socket + lock file; others connect as clients. Leader failover is automatic.

For guidance on building new services with this library, see [AGENTS.md](./AGENTS.md).

## API

### `createSingleton<T>(options)`

Creates a singleton that manages leader election and IPC for a named service.

| Param | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Unique service name — used to derive socket and lock paths |
| `sessionRoot` | string | yes | Session directory (from `getSessionRoot`) — scopes the socket to a tmux session |
| `createService` | `(push: PushFn) => T` | yes | Factory called only on the leader. Returns the service implementation. |

Returns a `Singleton<T>` instance. The service type `T` must be `Record<string, Function>` — all methods receive `params?: Record<string, unknown>`.

#### `createService(push)`

The factory receives a `push` function for broadcasting events to all clients:

```typescript
createService(push: PushFn): MyService {
  return {
    getData: () => cached,
    fetchItem: (p) => fetch(p?.id as string),
    [Symbol.dispose]: () => cleanup(),   // or stop(): void
  };
}
```

`push(event, data)` — sends an event to all connected clients and to local `subscribe()` callbacks.

### `Singleton<T>` interface

| Method | Signature | Description |
|---|---|---|
| `start()` | `() => Promise<void>` | Run leader election and connect. Idempotent. |
| `stop()` | `() => void` | Disconnect, release the lock, shut down server/client |
| `call(method, params?)` | `(method: keyof T, params?: Record<string, unknown>) => Promise<unknown>` | Invoke a service method. Routes to local service on leader, over socket on client. |
| `subscribe(event, cb)` | `(event: string, cb: (data: unknown) => void) => () => void` | Listen for push events. Returns an unsubscribe function. |
| `role()` | `() => "leader" \| "client" \| null` | Current role. `null` before `start()` or after `stop()`. |
| `status()` | `() => SingletonStatus` | Diagnostic snapshot — uptime, role, socket path, client count. |

#### `SingletonStatus`

```typescript
interface SingletonStatus {
  role: "leader" | "client" | null;
  sessionRoot: string;
  socketPath: string;
  lockPath: string;
  uptime: number | null;       // ms since start()
  clients?: number;            // leader only: connected client count
  subscribers?: number;        // leader only: push subscriber count
  connected?: boolean;         // client only: socket connection state
  leaderStats?: Record<string, unknown>;
}
```

### `getSessionRoot(cwd)`

Resolves the session root for scoping singletons to a tmux session.

```typescript
import { getSessionRoot } from "../singleton/index.ts";
const sessionRoot = getSessionRoot(cwd); // tmux session_path, or cwd if not in tmux
```

### `createSyncClient(name, fallbackCwd)`

Creates a synchronous (blocking) client for out-of-process consumers like panels and panes. Sends a single RPC request over the socket and waits for the response.

| Param | Type | Description |
|---|---|---|
| `name` | string | Service name (must match `createSingleton` name) |
| `fallbackCwd` | string | Used to derive session root when tmux is unavailable |

Returns a `SyncClient`:

```typescript
interface SyncClient {
  request(method: string, params?: Record<string, unknown>): unknown | null;
}
```

Returns `null` on error or timeout (700ms). Uses a Node.js child process to make the blocking socket call.

## Leader Election

- Election is via **lock file** (`/tmp/<name>-<hash>.lock`) containing `{ pid, ts }`
- First instance to atomically create the lock wins leader
- Leader **heartbeats every 30s** by updating the lock file timestamp
- Lock is considered **stale after 90s** — clients poll every 60s and attempt takeover when stale
- Socket path: `/tmp/<name>-<hash>.sock` (hash is a 12-char SHA-256 of `sessionRoot`)
- On leader exit, the next client to detect the stale lock takes over automatically

## Usage Pattern

Each service is a wrapper module — consumers never import from `singleton/` directly.

```typescript
// lib/my-service/index.ts
import { createSingleton, getSessionRoot } from "../singleton/index.ts";

let singleton: Singleton<MyService> | null = null;

export const myService = {
  async start(pi, cwd) {
    const sessionRoot = getSessionRoot(cwd);
    singleton = createSingleton<MyService>({
      name: "my-service",
      sessionRoot,
      createService(push) {
        // leader-only setup: polling, caching, etc.
        return {
          getData: () => cache,
          [Symbol.dispose]: () => cleanup(),
        };
      },
    });
    singleton.subscribe("update", (data) => handleUpdate(data));
    await singleton.start();
  },

  stop() { singleton?.stop(); singleton = null; },

  async getData() { return singleton?.call("getData"); },
  subscribe(event, cb) { return singleton?.subscribe(event, cb) ?? (() => {}); },
};
```

```typescript
// lib/my-service/sync.ts — for panels/panes (out-of-process)
import { createSyncClient } from "../singleton/index.ts";

export function createClient(fallbackCwd: string) {
  return createSyncClient("my-service", fallbackCwd);
}
```

## Service Cleanup

Implement `[Symbol.dispose]` or a `stop()` method on the service object returned from `createService`. The singleton calls this on the leader when `stop()` is invoked.
