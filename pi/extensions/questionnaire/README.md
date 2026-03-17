# Questionnaire Extension

Renders structured multi-choice prompts for the agent to gather preferences, clarify requirements, or confirm decisions. A single question renders as a simple option list; multiple questions render as a tab bar so the user can answer each independently. Free-text input and inline text fields are supported per-option.

## Tools

### `questionnaire`

Present one or more questions to the user.

| Param | Type | Required | Description |
|---|---|---|---|
| `questions` | array | yes | List of question objects (see below) |

#### Question object

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | yes | Unique identifier for this question |
| `prompt` | string | yes | The full question text to display |
| `options` | array | yes | Available answer options (see below) |
| `label` | string | no | Short label shown in the tab bar (defaults to `Q1`, `Q2`, …) |
| `allowOther` | boolean | no | Add a free-text "Type something" option (default: `true`) |

#### Option object

| Field | Type | Required | Description |
|---|---|---|---|
| `value` | string | yes | The value returned when this option is selected |
| `label` | string | yes | Display label shown to the user |
| `description` | string | no | Optional description shown below the label |
| `allowInput` | boolean | no | If `true`, selecting this option opens an inline text input; the user's typed text is returned as the value |
| `inputPlaceholder` | string | no | Placeholder text shown inside the inline input when `allowInput` is `true` |

## Commands

None.

## Shortcuts

None.

## Notable Behavior

- **Single vs. multi question** — One question renders a flat option list. Two or more questions render a tab bar, letting the user switch between them before submitting.
- **`allowOther`** — Enabled by default on every question. Adds a "Type something" option that opens a free-text field, so the user is never forced to pick from a fixed list.
- **`allowInput` options** — Individual options can open an inline text input on selection, useful for options like "Custom value…" without requiring a separate `allowOther` entry.

## Config

No configuration options.
