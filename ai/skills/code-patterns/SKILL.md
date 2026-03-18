---
name: code-patterns
description: "Code structure and organization patterns. Follow these when writing new code, adding features, or refactoring existing modules. Language-specific patterns are in typescript.md and elixir.md — read the relevant one based on the language being worked in."
---

# Code Patterns

### Separate wiring from logic

The entry point of any module is a thin orchestrator — it declares what exists and connects things. The actual behavior lives in focused modules it imports.

```
my-extension/
  index.ts          ← registers tools, commands, events; wires imports together
  lib/overlay.ts    ← the actual interactive widget
  lib/types.ts      ← interfaces and type definitions
  lib/diff.ts       ← diff algorithm
```

The index should read like a table of contents. If you're reading the entry point and have to scroll past implementation details to understand what the module provides, it needs splitting.

### One concern per file, one job per function

Each file owns a single concept — not split by layer (utils/helpers/services) but by *what it's about*.

Good: `diff.ts`, `comments.ts`, `context-editor.ts`
Bad: `utils.ts`, `helpers.ts`, `shared.ts`

A file with two unrelated functions should be two files. A file with twenty tightly-coupled functions working on the same data structure is fine.

Functions should do one thing. If a function has sections separated by blank lines doing unrelated work, split it. A function that's long because the *one thing* it does is inherently complex (e.g., a render loop) is fine — don't force-split what's naturally cohesive.

### Don't abstract until you have two consumers

Code lives where it's first needed. Only extract into a shared location when a second concrete use case appears.

- First use: implement inline, in the module that needs it
- Second use: extract to a shared location both can import

Don't pre-extract speculatively. "Someone might need this" is not a reason to create a shared module.

### Deduplicate when code drifts

When the same logic exists in two places and they've drifted apart, consolidate into one shared implementation. This is the flip side of the previous rule — once duplication exists, fix it.

### Features grow in-place, extract when seams are obvious

New features go directly into the existing file. Only split when:
- The file has grown large enough that distinct concerns are clearly visible
- You can draw a clean boundary (self-contained function, no shared mutable state)
- The extraction produces a file that makes sense on its own

Don't extract a 30-line function into its own file. Don't split a file just because it crossed an arbitrary line count.

### Group by domain, not by type

```
# Good: grouped by what it's about
panels/
  lib/tmux.ts
  lib/gh.ts
  panes/global.mjs
  tabs/local/checks.mjs

# Bad: grouped by what kind of code it is
utils/
  tmux-helpers.ts
  gh-helpers.ts
components/
  global-panel.mjs
```

Each module directory is self-contained with its own `lib/`. Shared code between modules lives in a common `lib/` only when the two-consumer rule applies.

### Prefer early returns over nesting

Flatten control flow by returning early for error/edge cases. The main logic should be at the top indentation level, not nested inside conditions.

### No dead code

Don't leave commented-out code, unused imports, or unreachable branches. If something isn't used, delete it. Version control remembers.

### Read conventions before creating files

Before creating new files in a directory, check for `AGENTS.md`, `README.md`, or other convention files that dictate structure (e.g., folder layout, naming, required companion files like READMEs or prompt updates). Follow what's already established — don't guess.

### Name things for what they represent, not how they work

Variable and function names describe *what* the thing is or does, not the implementation mechanism. `fetchMergeQueuePositions` not `graphqlBatchQuery`. `createFocusManager` not `makeInputParser`.
