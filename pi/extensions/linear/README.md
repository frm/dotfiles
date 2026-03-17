# Linear Extension

Integrates with the [Linear](https://linear.app) project management API. Provides a slash command for loading issues into the agent context and five LLM-callable tools for reading and writing issues and projects.

## Commands

| Command | Description |
|---|---|
| `/linear <issue-id> [notes]` | Fetch a Linear issue by identifier and send it to the agent as a user message. Optional notes are appended as additional context. Example: `/linear ENG-123 check edge cases` |

## Tools

### `linear__fetch_issue`

Fetch a single issue by identifier. Returns full details including description, state, assignee, labels, relations, and parent.

| Param | Type | Required | Description |
|---|---|---|---|
| `identifier` | string | yes | Issue identifier, e.g. `ENG-123` |

### `linear__create_issue`

Create a new issue. Resolves team by key and state by name before submitting.

| Param | Type | Required | Description |
|---|---|---|---|
| `title` | string | yes | Issue title |
| `description` | string | no | Issue description (markdown) |
| `teamKey` | string | no | Team key, e.g. `ENG`. Falls back to `default-team` from auth.json. |
| `parentIdentifier` | string | no | Parent issue identifier for sub-issues, e.g. `ENG-123` |
| `stateName` | string | no | Workflow state name, e.g. `In Progress`, `Backlog` |
| `assigneeId` | string | no | Assignee user ID |
| `priority` | number | no | `0`=None, `1`=Urgent, `2`=High, `3`=Medium, `4`=Low |

### `linear__update_issue`

Update an existing issue. Only include fields you want to change.

| Param | Type | Required | Description |
|---|---|---|---|
| `identifier` | string | yes | Issue identifier, e.g. `ENG-123` |
| `title` | string | no | New title |
| `description` | string | no | New description (markdown). Replaces the entire description. |
| `stateName` | string | no | Workflow state name, e.g. `In Progress`, `Done` |
| `assigneeId` | string | no | New assignee user ID |
| `priority` | number | no | `0`=None, `1`=Urgent, `2`=High, `3`=Medium, `4`=Low |

### `linear__list_issues`

List issues with filters. Defaults to issues assigned to the current user. Filters combine with AND logic.

| Param | Type | Required | Description |
|---|---|---|---|
| `assignedToMe` | boolean | no | Filter to issues assigned to the current user. Defaults to `true`. |
| `stateName` | string | no | Filter by workflow state name, e.g. `In Progress` |
| `stateType` | string | no | Filter by state type: `triage`, `backlog`, `unstarted`, `started`, `completed`, `cancelled` |
| `teamKey` | string | no | Filter by team key, e.g. `ENG` |
| `projectId` | string | no | Filter by Linear project ID |
| `unassigned` | boolean | no | When `true`, filter to issues with no assignee |
| `limit` | number | no | Max results (default 25, max 50) |

### `linear__list_my_projects`

List Linear projects where the current user is a member or lead.

| Param | Type | Required | Description |
|---|---|---|---|
| `limit` | number | no | Max results (default 25, max 50) |

## Auth Config

Credentials are read from `~/.pi/agent/auth.json` under the `"linear"` key:

```json
{
  "linear": {
    "api-key": "lin_api_...",
    "default-team": "ENG",
    "user-id": "..."
  }
}
```

| Field | Required | Description |
|---|---|---|
| `api-key` | yes | Linear personal API key — generate at [linear.app/settings/api](https://linear.app/settings/api) |
| `default-team` | no | Team key used when `teamKey` is omitted from `create_issue` |
| `user-id` | no | Your Linear user ID (currently unused by the extension, reserved for future use) |

If `api-key` is missing, all tools and the `/linear` command will throw an error with instructions on how to add it.
