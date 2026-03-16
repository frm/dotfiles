/**
 * Playwright Extension
 *
 * Exposes browser control tools for manual testing.
 * Manages a single browser instance per session (lazy launch, auto-cleanup).
 *
 * Tools: browser_launch, browser_navigate, browser_click, browser_type,
 *        browser_screenshot, browser_read_page, browser_close
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { readConfig } from "../lib/config.ts";

// ── State ────────────────────────────────────────────────────────────────────

let browser: Browser | null = null;
let context: BrowserContext | null = null;
let page: Page | null = null;
let screenshotDir: string | null = null;
let screenshotCounter = 0;

// ── Helpers ──────────────────────────────────────────────────────────────────

function ensureScreenshotDir(): string {
	if (!screenshotDir) {
		screenshotDir = join("/tmp", `manual-test-${Date.now()}`);
	}
	if (!existsSync(screenshotDir)) mkdirSync(screenshotDir, { recursive: true });
	return screenshotDir;
}

async function takeScreenshot(fullPage = false): Promise<{ data: string; path: string }> {
	if (!page) throw new Error("No browser page open");
	const dir = ensureScreenshotDir();
	const filename = `step-${String(++screenshotCounter).padStart(3, "0")}.png`;
	const filepath = join(dir, filename);
	const buffer = await page.screenshot({ path: filepath, fullPage });
	return { data: buffer.toString("base64"), path: filepath };
}

async function cleanup() {
	try { if (context) await context.close(); } catch {}
	try { if (browser) await browser.close(); } catch {}
	page = null;
	context = null;
	browser = null;
	screenshotDir = null;
	screenshotCounter = 0;
}

function getBaseUrl(): string {
	const config = readConfig("manual-testing");
	return config.baseUrl || "http://localhost:4000";
}

// ── Detect second screen (macOS) ─────────────────────────────────────────────

function detectSecondScreen(): { x: number; y: number } | null {
	try {
		const out = execSync("system_profiler SPDisplaysDataType -json 2>/dev/null", {
			encoding: "utf-8",
			timeout: 3000,
		});
		const data = JSON.parse(out);
		const displays: any[] = [];
		for (const gpu of data.SPDisplaysDataType ?? []) {
			for (const d of gpu.spdisplays_ndrvs ?? []) {
				if (d._spdisplays_resolution) displays.push(d);
			}
		}
		if (displays.length >= 2) {
			const second = displays[1];
			const res = second._spdisplays_resolution?.match(/(\d+)\s*x\s*(\d+)/);
			if (res) return { x: parseInt(res[1]), y: 0 };
		}
	} catch {}
	return null;
}

// ── Extension ────────────────────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {

	// ── browser_launch ──────────────────────────────────────────────────

	pi.registerTool({
		name: "browser_launch",
		label: "Browser: Launch",
		description:
			"Launch a browser for manual testing. Reuses existing browser if already open. " +
			"Set headless=false for guided mode or when the user needs to see the browser.",
		parameters: Type.Object({
			headless: Type.Optional(Type.Boolean({ description: "Run headless (default: true). Set false for guided mode." })),
			url: Type.Optional(Type.String({ description: "Starting URL. Defaults to manual-testing.baseUrl config or http://localhost:4000." })),
		}),
		async execute(_id, params) {
			if (browser && page) {
				const url = params.url || getBaseUrl();
				await page.goto(url, { waitUntil: "networkidle", timeout: 15000 }).catch(() => {});
				const shot = await takeScreenshot();
				return {
					content: [
						{ type: "text", text: `Browser already open. Navigated to ${url}` },
						{ type: "image", data: shot.data, mimeType: "image/png" },
					],
					details: { screenshotPath: shot.path, reused: true },
				};
			}

			const headless = params.headless ?? true;
			const url = params.url || getBaseUrl();
			const launchOptions: any = { headless };

			if (!headless) {
				const secondScreen = detectSecondScreen();
				if (secondScreen) {
					launchOptions.args = [`--window-position=${secondScreen.x},${secondScreen.y}`];
				}
			}

			browser = await chromium.launch(launchOptions);
			context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
			page = await context.newPage();

			await page.goto(url, { waitUntil: "networkidle", timeout: 15000 }).catch(() => {});
			const shot = await takeScreenshot();

			return {
				content: [
					{ type: "text", text: `Browser launched (${headless ? "headless" : "headed"}). Loaded ${url}` },
					{ type: "image", data: shot.data, mimeType: "image/png" },
				],
				details: { screenshotPath: shot.path, headless, url },
			};
		},
	});

	// ── browser_navigate ────────────────────────────────────────────────

	pi.registerTool({
		name: "browser_navigate",
		label: "Browser: Navigate",
		description: "Navigate to a URL in the open browser. Returns a screenshot.",
		parameters: Type.Object({
			url: Type.String({ description: "URL to navigate to" }),
		}),
		async execute(_id, params) {
			if (!page) throw new Error("No browser open. Call browser_launch first.");
			await page.goto(params.url, { waitUntil: "networkidle", timeout: 15000 }).catch(() => {});
			const shot = await takeScreenshot();
			return {
				content: [
					{ type: "text", text: `Navigated to ${params.url}` },
					{ type: "image", data: shot.data, mimeType: "image/png" },
				],
				details: { screenshotPath: shot.path, url: params.url },
			};
		},
	});

	// ── browser_click ───────────────────────────────────────────────────

	pi.registerTool({
		name: "browser_click",
		label: "Browser: Click",
		description:
			"Click an element. Use a CSS selector or text content to find the element. Returns a screenshot after clicking.",
		parameters: Type.Object({
			selector: Type.Optional(Type.String({ description: "CSS selector to click" })),
			text: Type.Optional(Type.String({ description: "Text content of the element to click" })),
		}),
		async execute(_id, params) {
			if (!page) throw new Error("No browser open. Call browser_launch first.");
			if (!params.selector && !params.text) throw new Error("Provide either selector or text");

			if (params.text) {
				await page.getByText(params.text, { exact: false }).first().click({ timeout: 5000 });
			} else {
				await page.click(params.selector!, { timeout: 5000 });
			}

			await page.waitForLoadState("networkidle").catch(() => {});
			const shot = await takeScreenshot();
			const target = params.selector || `text="${params.text}"`;
			return {
				content: [
					{ type: "text", text: `Clicked: ${target}` },
					{ type: "image", data: shot.data, mimeType: "image/png" },
				],
				details: { screenshotPath: shot.path, target },
			};
		},
	});

	// ── browser_type ────────────────────────────────────────────────────

	pi.registerTool({
		name: "browser_type",
		label: "Browser: Type",
		description:
			"Type text into an input field. Optionally specify a selector to focus first. Returns a screenshot after typing.",
		parameters: Type.Object({
			text: Type.String({ description: "Text to type" }),
			selector: Type.Optional(Type.String({ description: "CSS selector of the input to focus first" })),
			pressEnter: Type.Optional(Type.Boolean({ description: "Press Enter after typing (default: false)" })),
		}),
		async execute(_id, params) {
			if (!page) throw new Error("No browser open. Call browser_launch first.");

			if (params.selector) {
				await page.click(params.selector, { timeout: 5000 });
			}
			await page.keyboard.type(params.text, { delay: 30 });
			if (params.pressEnter) {
				await page.keyboard.press("Enter");
				await page.waitForLoadState("networkidle").catch(() => {});
			}

			const shot = await takeScreenshot();
			return {
				content: [
					{ type: "text", text: `Typed: "${params.text}"${params.pressEnter ? " + Enter" : ""}${params.selector ? ` into ${params.selector}` : ""}` },
					{ type: "image", data: shot.data, mimeType: "image/png" },
				],
				details: { screenshotPath: shot.path },
			};
		},
	});

	// ── browser_screenshot ──────────────────────────────────────────────

	pi.registerTool({
		name: "browser_screenshot",
		label: "Browser: Screenshot",
		description: "Take a screenshot of the current page.",
		parameters: Type.Object({
			fullPage: Type.Optional(Type.Boolean({ description: "Capture full scrollable page (default: false)" })),
		}),
		async execute(_id, params) {
			if (!page) throw new Error("No browser open. Call browser_launch first.");
			const shot = await takeScreenshot(params.fullPage ?? false);
			return {
				content: [
					{ type: "text", text: `Screenshot taken: ${shot.path}` },
					{ type: "image", data: shot.data, mimeType: "image/png" },
				],
				details: { screenshotPath: shot.path, fullPage: params.fullPage ?? false },
			};
		},
	});

	// ── browser_read_page ───────────────────────────────────────────────

	pi.registerTool({
		name: "browser_read_page",
		label: "Browser: Read Page",
		description:
			"Read the current page content. Returns visible text and a simplified DOM " +
			"structure (links, buttons, forms, inputs with labels). Use this to understand " +
			"page structure before interacting.",
		parameters: Type.Object({}),
		async execute() {
			if (!page) throw new Error("No browser open. Call browser_launch first.");

			const pageContent = await page.evaluate(() => {
				const result = {
					title: document.title,
					url: window.location.href,
					links: [] as { text: string; href: string }[],
					buttons: [] as string[],
					inputs: [] as { type: string; name: string; label: string; value: string }[],
					headings: [] as { level: number; text: string }[],
					visibleText: "",
				};

				for (const h of document.querySelectorAll("h1,h2,h3,h4,h5,h6")) {
					const text = (h as HTMLElement).innerText?.trim();
					if (text) result.headings.push({ level: parseInt(h.tagName[1]), text });
				}

				for (const a of document.querySelectorAll("a[href]")) {
					const text = (a as HTMLElement).innerText?.trim();
					const href = (a as HTMLAnchorElement).href;
					if (text && href) result.links.push({ text: text.substring(0, 100), href });
				}

				for (const btn of document.querySelectorAll("button, input[type=submit], input[type=button]")) {
					const text = (btn as HTMLElement).innerText?.trim() || (btn as HTMLInputElement).value;
					if (text) result.buttons.push(text);
				}

				for (const input of document.querySelectorAll("input, textarea, select")) {
					const el = input as HTMLInputElement;
					const label = document.querySelector(`label[for="${el.id}"]`);
					result.inputs.push({
						type: el.type || el.tagName.toLowerCase(),
						name: el.name || el.id || "",
						label: label?.textContent?.trim() || el.placeholder || "",
						value: el.value || "",
					});
				}

				result.visibleText = (document.body.innerText || "").substring(0, 3000);
				return result;
			});

			const summary = [
				`**${pageContent.title}** (${pageContent.url})`,
				"",
				pageContent.headings.length ? `**Headings:** ${pageContent.headings.map((h) => `${"#".repeat(h.level)} ${h.text}`).join(", ")}` : "",
				pageContent.buttons.length ? `**Buttons:** ${pageContent.buttons.join(", ")}` : "",
				pageContent.inputs.length ? `**Inputs:** ${pageContent.inputs.map((i) => `${i.label || i.name} (${i.type})`).join(", ")}` : "",
				pageContent.links.length ? `**Links (${pageContent.links.length}):** ${pageContent.links.slice(0, 15).map((l) => `[${l.text}](${l.href})`).join(", ")}${pageContent.links.length > 15 ? "..." : ""}` : "",
				"",
				"**Visible text (excerpt):**",
				pageContent.visibleText.substring(0, 1500),
			].filter(Boolean).join("\n");

			return {
				content: [{ type: "text", text: summary }],
				details: pageContent,
			};
		},
	});

	// ── browser_close ───────────────────────────────────────────────────

	pi.registerTool({
		name: "browser_close",
		label: "Browser: Close",
		description: "Close the browser and clean up.",
		parameters: Type.Object({}),
		async execute() {
			const dir = screenshotDir;
			await cleanup();
			return {
				content: [{ type: "text", text: `Browser closed.${dir ? ` Screenshots saved in ${dir}` : ""}` }],
				details: { screenshotDir: dir },
			};
		},
	});

	// ── session_shutdown ────────────────────────────────────────────────

	pi.on("session_shutdown", async () => {
		await cleanup();
	});
}
