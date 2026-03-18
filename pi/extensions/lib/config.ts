/**
 * Shared Config Library
 *
 * Resolves .pi/config.json and .pi/agent/auth.json by walking up the directory
 * tree from CWD to $HOME. Merges all found files with nearest-wins precedence
 * (like direnv/mise). Falls back to ~/.pi/ as the global default.
 */

import { readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";

const HOME = process.env.HOME || "";

function findJsonFiles(startDir: string, relativePath: string): string[] {
	const files: string[] = [];
	let dir = resolve(startDir);
	const homeResolved = resolve(HOME);

	while (true) {
		const candidate = join(dir, ".pi", relativePath);
		if (existsSync(candidate)) {
			files.push(candidate);
		}

		if (dir === homeResolved) break;

		const parent = dirname(dir);
		if (parent === dir) break; // filesystem root
		if (!dir.startsWith(homeResolved)) break; // don't go above $HOME
		dir = parent;
	}

	// Ensure global fallback is included
	const globalFile = join(HOME, ".pi", relativePath);
	if (!files.includes(globalFile) && existsSync(globalFile)) {
		files.push(globalFile);
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

function loadMerged(relativePath: string): Record<string, any> {
	const files = findJsonFiles(process.cwd(), relativePath);

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
	const config = loadMerged("config.json");
	if (!namespace) return config;
	return (getByPath(config, namespace) as Record<string, any>) ?? {};
}

export function readAuth(): Record<string, any>;
export function readAuth(namespace: string): Record<string, any>;
export function readAuth(namespace?: string): Record<string, any> {
	const auth = loadMerged("agent/auth.json");
	if (!namespace) return auth;
	return (getByPath(auth, namespace) as Record<string, any>) ?? {};
}
