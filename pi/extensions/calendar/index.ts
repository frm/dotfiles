/**
 * Google Calendar Extension
 *
 * Tool: calendar__list_events — fetch upcoming events from Google Calendar
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readAuth } from "../lib/config.ts";

const AUTH_FILE = join(process.env.HOME || "", ".pi", "agent", "auth.json");
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

interface CalendarAuth {
	clientId: string | null;
	clientSecret: string | null;
	refreshToken: string | null;
	accessToken: string | null;
	expires: number;
}

function loadAuth(): CalendarAuth {
	const gc = readAuth("google-calendar");
	return {
		clientId: gc?.["client-id"] ?? null,
		clientSecret: gc?.["client-secret"] ?? null,
		refreshToken: gc?.["refresh-token"] ?? null,
		accessToken: gc?.["access-token"] ?? null,
		expires: gc?.expires ?? 0,
	};
}

function saveTokens(accessToken: string, expires: number) {
	try {
		const raw = readFileSync(AUTH_FILE, "utf-8");
		const data = JSON.parse(raw);
		if (!data["google-calendar"]) data["google-calendar"] = {};
		data["google-calendar"]["access-token"] = accessToken;
		data["google-calendar"].expires = expires;
		writeFileSync(AUTH_FILE, JSON.stringify(data, null, 2) + "\n");
	} catch {}
}

async function getAccessToken(): Promise<string> {
	const auth = loadAuth();
	if (!auth.clientId || !auth.clientSecret || !auth.refreshToken) {
		throw new Error(
			"Google Calendar not configured. Add to ~/.pi/agent/auth.json:\n" +
			'"google-calendar": { "client-id": "...", "client-secret": "...", "refresh-token": "..." }'
		);
	}

	// Return cached token if still valid (with 60s buffer)
	if (auth.accessToken && auth.expires > Date.now() + 60_000) {
		return auth.accessToken;
	}

	// Refresh
	const res = await fetch(TOKEN_URL, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			client_id: auth.clientId,
			client_secret: auth.clientSecret,
			refresh_token: auth.refreshToken,
			grant_type: "refresh_token",
		}),
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Failed to refresh Google Calendar token: ${res.status} ${text}`);
	}

	const json = (await res.json()) as any;
	const accessToken = json.access_token;
	const expiresIn = json.expires_in ?? 3600;
	const expires = Date.now() + expiresIn * 1000;

	saveTokens(accessToken, expires);
	return accessToken;
}

// ---------------------------------------------------------------------------
// Calendar API
// ---------------------------------------------------------------------------

interface CalendarEvent {
	id: string;
	title: string;
	start: string;
	end: string;
	allDay: boolean;
	location: string | null;
	attendees: { name: string; email: string; self: boolean; responseStatus: string }[];
	organizer: { name: string; email: string; self: boolean };
	recurring: boolean;
	status: string;
	htmlLink: string;
}

async function listEvents(accessToken: string, timeMin: string, timeMax: string, maxResults: number): Promise<CalendarEvent[]> {
	const params = new URLSearchParams({
		timeMin,
		timeMax,
		maxResults: String(maxResults),
		singleEvents: "true",
		orderBy: "startTime",
	});

	const res = await fetch(`${CALENDAR_API}/calendars/primary/events?${params}`, {
		headers: { Authorization: `Bearer ${accessToken}` },
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Google Calendar API ${res.status}: ${text}`);
	}

	const json = (await res.json()) as any;
	const items = json.items ?? [];

	return items.map((e: any) => ({
		id: e.id,
		title: e.summary ?? "(no title)",
		start: e.start?.dateTime ?? e.start?.date ?? "",
		end: e.end?.dateTime ?? e.end?.date ?? "",
		allDay: !!e.start?.date,
		location: e.location ?? null,
		attendees: (e.attendees ?? []).map((a: any) => ({
			name: a.displayName ?? a.email,
			email: a.email,
			self: a.self ?? false,
			responseStatus: a.responseStatus ?? "needsAction",
		})),
		organizer: {
			name: e.organizer?.displayName ?? e.organizer?.email ?? "",
			email: e.organizer?.email ?? "",
			self: e.organizer?.self ?? false,
		},
		recurring: !!e.recurringEventId,
		status: e.status ?? "confirmed",
		htmlLink: e.htmlLink ?? "",
	}));
}

function formatEvent(e: CalendarEvent): string {
	const time = e.allDay ? "All day" : `${new Date(e.start).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} – ${new Date(e.end).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
	const selfAttendee = e.attendees.find(a => a.self);
	const rsvp = selfAttendee?.responseStatus ?? "unknown";
	const attendeeCount = e.attendees.filter(a => !a.self).length;
	const recurring = e.recurring ? " (recurring)" : "";
	const location = e.location ? ` | ${e.location}` : "";
	return `${time}  ${e.title}${recurring}  [${rsvp}]  ${attendeeCount} others${location}`;
}

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------

export default function calendarExtension(pi: ExtensionAPI) {
	pi.registerTool({
		name: "calendar__list_events",
		label: "Calendar: List Events",
		description:
			"List upcoming Google Calendar events. Returns event title, time, attendees, " +
			"RSVP status, and whether it's recurring. Defaults to today's events.",
		parameters: Type.Object({
			timeMin: Type.Optional(Type.String({ description: "Start of range as ISO 8601 string (default: now)" })),
			timeMax: Type.Optional(Type.String({ description: "End of range as ISO 8601 string (default: end of today)" })),
			maxResults: Type.Optional(Type.Number({ description: "Max events to return (default: 25)" })),
		}),
		async execute(_id, params) {
			const accessToken = await getAccessToken();

			const now = new Date();
			const timeMin = params.timeMin ?? now.toISOString();
			const endOfDay = new Date(now);
			endOfDay.setHours(23, 59, 59, 999);
			const timeMax = params.timeMax ?? endOfDay.toISOString();
			const maxResults = Math.min(params.maxResults ?? 25, 50);

			const events = await listEvents(accessToken, timeMin, timeMax, maxResults);

			if (events.length === 0) {
				return { content: [{ type: "text", text: "No events found in the specified range." }], details: { events: [] } };
			}

			const lines = events.map(formatEvent);
			const text = `Found ${events.length} event${events.length > 1 ? "s" : ""}:\n\n${lines.join("\n")}`;
			return {
				content: [{ type: "text", text }],
				details: { events },
			};
		},
	});
}
