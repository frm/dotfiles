# Config Extension

Exposes a `fetch_config` tool that reads values from `.pi/config.json`. The lookup walks up the directory tree from the current working directory to `$HOME`, and the nearest matching config file wins — allowing project-level configs to override user-level defaults.

## Tools

### `fetch_config`

Read a value from the config hierarchy.

| Param | Type | Required | Description |
|---|---|---|---|
| `key` | string | no | Dot-notation key path, e.g. `"self-improvement.enabled"`. Omit to return the full merged config object. |

Returns the value at the given key, or the full config if no key is provided. Returns `undefined` if the key does not exist.

## Commands

None.

## Shortcuts

None.

## Config

No configuration options for this extension itself.
