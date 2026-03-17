# Playwright Extension

Provides browser automation tools for manual UI testing. The agent can launch a real browser, navigate pages, interact with elements, and capture screenshots — enabling hands-on verification of UI changes without leaving the terminal. Screenshots are saved to a timestamped directory under `/tmp/`. The browser is automatically closed on `session_shutdown`.

## Tools

### `browser_launch`

Launch a browser (or reuse an existing one).

| Param | Type | Required | Description |
|---|---|---|---|
| `url` | string | no | Starting URL. Defaults to `manual-testing.baseUrl` config or `http://localhost:4000`. |
| `headless` | boolean | no | Run headless (default: `true`). Set `false` for guided/visible mode. |

On macOS, headed mode attempts to open on a second monitor when one is detected.

### `browser_navigate`

Navigate to a URL. Returns a screenshot.

| Param | Type | Required | Description |
|---|---|---|---|
| `url` | string | yes | URL to navigate to |

### `browser_click`

Click an element by CSS selector or visible text. Returns a screenshot.

| Param | Type | Required | Description |
|---|---|---|---|
| `selector` | string | no | CSS selector of the element to click |
| `text` | string | no | Visible text content of the element to click |

### `browser_type`

Type text into an input field. Returns a screenshot.

| Param | Type | Required | Description |
|---|---|---|---|
| `text` | string | yes | Text to type |
| `selector` | string | no | CSS selector to focus before typing |
| `pressEnter` | boolean | no | Press Enter after typing (default: `false`) |

### `browser_screenshot`

Capture a screenshot of the current page.

| Param | Type | Required | Description |
|---|---|---|---|
| `fullPage` | boolean | no | Capture the full scrollable page (default: `false`) |

### `browser_read_page`

Read the current page's visible text and simplified DOM (links, buttons, forms, labelled inputs). Use this to understand page structure before interacting.

No parameters.

### `browser_close`

Close the browser and clean up all resources.

No parameters.

## Commands

None.

## Shortcuts

None.

## Config

Namespace: `"manual-testing"` in `.pi/config.json`.

| Option | Type | Default | Description |
|---|---|---|---|
| `baseUrl` | string | `"http://localhost:4000"` | Default URL used by `browser_launch` when none is provided |

## Notable Behavior

- **Screenshot storage** — All screenshots are saved to `/tmp/manual-test-<timestamp>/` for the duration of the session.
- **Auto-cleanup** — The browser is automatically closed when the session shuts down via the `session_shutdown` event.
- **Second monitor** — In headed mode on macOS, the extension detects a second monitor and moves the browser window there automatically.
