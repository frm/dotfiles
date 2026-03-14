/**
 * Shared Config Library
 *
 * Resolves .pi/config.json by walking up the directory tree from CWD to $HOME.
 * Merges all found configs with nearest-wins precedence (like direnv/mise).
 * Falls back to ~/.pi/config.json as the global default.
 */

import { readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";

const HOME = process.env.HOME || "";

function findConfigFiles(startDir: string): string[] {
	const files: string[] = [];
	let dir = resolve(startDir);
	const homeResolved = resolve(HOME);

	while (true) {
		const candidate = join(dir, ".pi", "config.json");
		if (existsSync(candidate)) {
			files.push(candidate);
		}

		if (dir === homeResolved) break;

		const parent = dirname(dir);
		if (parent === dir) break; // filesystem root
		if (!dir.startsWith(homeResolved)) break; // don't go above $HOME
		dir = parent;
	}

	// Ensure ~/.pi/config.json is included as global fallback
	const globalConfig = join(HOME, ".pi", "config.json");
	if (!files.includes(globalConfig) && existsSync(globalConfig)) {
		files.push(globalConfig);
	}

	return files;
}

function deepMerge(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
	const result = { ...target };
	for (const key of Object.keys(source)) {
		if (source[key] == null) {
			result[key] = source[key];
		} else if (
			result[key] &&
			typeof result[key] === "object" &&
			!Array.isArray(result[key]) &&
			typeof source[key] === "object" &&
			!Array.isArray(source[key])
		) {
			result[key] = deepMerge(result[key], source[key]);
		} else {
			result[key] = source[key];
		}
	}
	return result;
}

function loadMergedConfig(startDir: string): Record<string, any> {
	const files = findConfigFiles(startDir);

	// Merge furthest-first so nearest-wins via overwrite
	let merged: Record<string, any> = {};
	for (const file of files.reverse()) {
		try {
			const content = JSON.parse(readFileSync(file, "utf-8"));
			merged = deepMerge(merged, content);
		} catch {
			// Skip malformed files
		}
	}

	return merged;
}

export function getByPath(obj: Record<string, any>, path: string): any {
	const keys = path.split(".");
	let current: any = obj;
	for (const key of keys) {
		if (current == null || typeof current !== "object") return undefined;
		current = current[key];
	}
	return current;
}

export function readConfig(): Record<string, any>;
export function readConfig(namespace: string): Record<string, any>;
export function readConfig(namespace?: string): Record<string, any> {
	const config = loadMergedConfig(process.cwd());
	if (!namespace) return config;
	return (getByPath(config, namespace) as Record<string, any>) ?? {};
}
