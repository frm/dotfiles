import { createSyncClient, type SyncClient } from "../singleton/index.ts";

export function createClient(fallbackCwd: string): SyncClient {
	return createSyncClient("gh", fallbackCwd);
}
