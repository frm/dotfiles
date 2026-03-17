# gh — GitHub Singleton Service

GitHub data service built on the [singleton framework](../singleton/README.md). Runs one poller per tmux session; other instances connect as clients over a Unix socket. Polls the `gh` CLI for PR data and broadcasts updates via push events.

This is the **reference implementation** for the singleton pattern — see it alongside the singleton README when building new services.

## API

### `ghState`

The public API object. Import and use this — don't import from `singleton/` directly.

#### `ghState.start(pi, cwd)`

Starts the singleton. The instance that wins leader election runs the poller; others connect as clients.

| Param | Type | Description |
|---|---|---|
| `pi` | `ExtensionAPI` | pi extension API, used for `pi.exec` in the poller |
| `cwd` | string | Working directory, used to derive the session root |

On leader: starts polling immediately, then polls every 60s for `prView`, `prLists`, and `reviewComments`.  
On client: connects to the leader socket and fetches the current cached `prView`.

#### `ghState.stop()`

Stops the singleton, clears subscribers and cached state.

#### `ghState.get()`

Returns the currently cached `PrInfo | null`. On the leader, reads directly from the poller. On a client, returns the last push-event-cached value.

#### `ghState.subscribe(cb)`

Registers a callback for PR data changes. The callback is called immediately with the current value.

```typescript
const unsub = ghState.subscribe((pr: PrInfo | null) => {
  // called on every prView push event
});
unsub(); // stop listening
```

#### `ghState.fetchReviewComments()`

Returns `Promise<ReviewComment[]>`. Fetches the cached review comments from the leader (or local poller).

#### `ghState.refresh()`

Forces an immediate `prView` poll and returns `Promise<PrInfo | null>`. Useful after user-triggered actions (push, merge, etc.).

#### `ghState.status()`

Returns `Promise<GhStatus>` — diagnostic info including role, uptime, socket path, cached PR summary, and leader poller stats.

## Data Types

```typescript
interface PrInfo {
  number: number;
  title: string;
  body: string;
  state: string;
  baseRefName: string;
  headRefName: string;
  additions: number;
  deletions: number;
  mergeable: string;
  reviewDecision: string;
  url: string;
  mergedAt: string | null;
  mergedBy: { login: string } | null;
  statusCheckRollup: Array<{ name: string; status: string; conclusion: string }>;
  reviews: Array<{ author: { login: string }; state: string }>;
  comments: PrComment[];
}

interface ReviewComment {
  id: number;
  user: { login: string };
  body: string;
  path: string;
  line: number | null;
  diff_hunk: string;
  created_at: string;
}
```

## Out-of-Process Usage (Panels)

Panels and panes run in separate processes and can't share the in-memory singleton. Use the sync client:

```typescript
import { createClient } from "../../lib/gh/sync.ts";

const api = createClient(process.cwd());
const pr = api.request("prView");                        // PrInfo | null
const lists = api.request("prLists");                    // { reviewPrs, myPrs }
const positions = api.request("prMergeQueuePositions");  // Record<number, number>
```

`createClient(fallbackCwd)` returns a `SyncClient` that talks to the leader over the Unix socket. Requests time out at 700ms and return `null` on failure.

## Commands

Registers the `/gh` command in pi:

| Command | Description |
|---|---|
| `/gh` | Show role, uptime, session root, socket path, cached PR, and detailed poll stats (leader) or leader stats (client) |

## Poller Details

The leader runs a `createPoller` instance that:

- Polls `prView` every 60s via `gh pr view <branch> --json ...`
- Polls `prLists` every 60s — review-requested PRs and authored PRs, with merge queue positions for approved PRs
- Polls `reviewComments` every 60s via GitHub REST API (only when a PR is open)
- Caches `worktreePr` and `prChecks` on-demand with a 30s TTL

Push events: `"prView"`, `"prLists"`, `"reviewComments"` — emitted after each successful poll.

## Used By

The `panels/` extension consumes this service via the sync client to render PR status in tmux panes.
