# Google Calendar Extension

Fetches upcoming events from Google Calendar. Used by the `triage` skill to include meetings in work prioritization.

## Tools

### `calendar__list_events`

List upcoming Google Calendar events. Returns event title, time, attendees, RSVP status, and whether it's recurring. Defaults to today's events.

| Param | Type | Required | Description |
|---|---|---|---|
| `timeMin` | string | no | Start of range as ISO 8601 string (default: now) |
| `timeMax` | string | no | End of range as ISO 8601 string (default: end of today) |
| `maxResults` | number | no | Max events to return (default: 25, max: 50) |

**Returns for each event:**

- Title, start/end time, all-day flag
- Location (if set)
- Attendees with names and RSVP status
- Whether you're the organizer
- Whether it's a recurring event
- Your RSVP status (accepted/declined/tentative)

## Auth Config

Reads Google OAuth2 credentials from `~/.pi/agent/auth.json` via `readAuth("google-calendar")`:

```json
{
  "google-calendar": {
    "client-id": "...",
    "client-secret": "...",
    "refresh-token": "..."
  }
}
```

Access tokens are refreshed automatically and cached in the same file.

### Setup

1. Create a Google Cloud project and enable the Google Calendar API
2. Create OAuth2 Desktop credentials (client ID + secret)
3. Run the OAuth consent flow to get a refresh token (needs `calendar.events.readonly` scope)
4. Add credentials to `~/.pi/agent/auth.json` as shown above

If not configured, tools throw an error with setup instructions. The `triage` skill handles this gracefully by skipping calendar when unavailable.
