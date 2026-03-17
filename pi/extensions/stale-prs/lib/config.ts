import { readConfig } from "../../lib/config.ts";
import type { StalePrConfig } from "./types.ts";

export function loadConfig(): StalePrConfig {
	const raw = readConfig("stale-prs");
	return {
		enabled: raw.enabled ?? true,
		reviewOwedHours: raw.reviewOwedHours ?? 24,
		ownPrStaleHours: raw.ownPrStaleHours ?? 48,
		pollIntervalMinutes: raw.pollIntervalMinutes ?? 60,
		snoozeDurationHours: raw.snoozeDurationHours ?? 4,
	};
}
