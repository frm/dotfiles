# Singleton — shared single-leader IPC

Generic library for running a single-leader service across multiple pi instances in a tmux session.
One instance wins leader election and runs the service; others connect as clients over a Unix socket.
Leader failover is automatic.

## Creating a new service

Each service is an **API wrapper** — a standalone module under `pi/extensions/lib/<name>/`.
Consumers import the wrapper directly. They never import from `singleton/`.

### Directory structure

```
pi/extensions/lib/<name>/
  index.ts   — public API: start(), stop(), named methods
  sync.ts    — createClient(cwd) for out-of-process consumers (panels, panes)
  lib/       — internal implementation (data fetching, caching, types)
```

### index.ts — the API wrapper

```typescript
import { createSingleton, type Singleton, type PushFn } from "../singleton/index.ts";
import { getSessionRoot } from "../singleton/lib/protocol.ts";

interface MyService {
  getData(): SomeType | null;
  fetchItem(params?: Record<string, unknown>): Promise<ItemType>;
}

let singleton: Singleton<MyService> | null = null;

export const myApi = {
  async start(pi, cwd) {
    const sessionRoot = getSessionRoot(cwd);
    singleton = createSingleton<MyService>({
      name: "my-service",       // unique name — used for socket/lock paths
      sessionRoot,
      createService(push) {     // only called on the leader
        // Set up polling, caching, etc.
        return {
          getData: () => cached,
          fetchItem: (p) => fetch(p?.id),
          [Symbol.dispose]: () => cleanup(),
        };
      },
    });
    await singleton.start();
  },

  stop() { singleton?.stop(); singleton = null; },

  async getData() { return singleton?.call("getData"); },
  async fetchItem(id) { return singleton?.call("fetchItem", { id }); },

  subscribe(event, cb) { return singleton?.subscribe(event, cb) ?? (() => {}); },
};
```

### sync.ts — for out-of-process consumers

Panels and panes run in separate processes. They can't share the in-memory
singleton. Provide a sync client that talks to the leader over the socket:

```typescript
import { createSyncClient, type SyncClient } from "../singleton/index.ts";

export function createClient(fallbackCwd: string): SyncClient {
  return createSyncClient("my-service", fallbackCwd);
}
```

Consumer usage:

```typescript
import { createClient } from "../../lib/my-service/sync.ts";
const api = createClient(process.cwd());
const data = api.request("getData");
```

### Key rules

- **One name per service** — the `name` in `createSingleton` must be unique across all services
- **Don't leak singleton** — consumers import your wrapper, not `singleton/`
- **Service methods receive `params?: Record<string, unknown>`** — named params, no positional args over the wire
- **Push events** — call `push(event, data)` from the service factory to notify all clients
- **Cleanup** — implement `[Symbol.dispose]` or a `stop()` method on the service object
