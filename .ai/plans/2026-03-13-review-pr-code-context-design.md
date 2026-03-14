# Review PR — Code Context & Verbatim Comments

**Goal:** Add code context (diff hunks) to PR review findings and inline comments, and allow the user to write GitHub comments that are posted verbatim without LLM rewriting.

**Architecture:** Three independent changes — reviewer agents include diff hunks in output, present-plan gains a generic context-aware comment editor via HTML comment markers, and the review-pr skill preserves user comment text exactly.

---

## Part 1: Diff hunks in review output

### Reviewer agents

The reviewer agents (`reviewer-correctness`, `reviewer-architecture`, `reviewer-security`, `reviewer-quality`) already receive the diff in their task context. Each agent includes the relevant diff hunk with every finding.

**Attention Areas format (all agents):**

````markdown
#### Correctness
- `file.ts:42` — race condition in cache invalidation
```diff
- const cached = getCache(key);
+ const cached = await getCache(key);
  if (!cached) return null;
```
````

### Synthesizer

The synthesizer preserves diff hunks from the specialist agents in both Attention Areas and Inline Comments.

**Inline Comments format — with context markers:**

````markdown
#### Comment 1 — Important
**File:** `file.ts` line 42
<!-- context:start -->
```diff
- const cached = getCache(key);
+ const cached = await getCache(key);
  if (!cached) return null;
```

**Suggested comment:**
> This introduces an await in a synchronous path
<!-- context:end -->
````

The `<!-- context:start/end -->` markers are invisible in the rendered plan but signal to present-plan that a context-aware comment editor should be used.

### Files to change

- `pi/agents/reviewer-correctness.md` — instruct to include diff hunks
- `pi/agents/reviewer-architecture.md` — instruct to include diff hunks
- `pi/agents/reviewer-security.md` — instruct to include diff hunks
- `pi/agents/reviewer-quality.md` — instruct to include diff hunks
- `pi/agents/reviewer-risk.md` — instruct to include diff hunks
- `pi/agents/reviewer-synthesizer.md` — preserve diff hunks, use context markers in inline comments
- `ai/skills/review-pr/SKILL.md` — update output format in Steps 7 and 8

---

## Part 2: Present-plan context-aware comment editor

### Context markers — generic protocol

Any skill can annotate `present_plan` markdown with context blocks using HTML comments:

```markdown
<!-- context:start -->
...any markdown content...
<!-- context:end -->
```

Present-plan parses the raw markdown source to build a map of rendered line ranges to context blocks. The markdown renderer doesn't render HTML comments, so they're invisible in the plan view.

### Comment flow

When the user presses `c`:

1. **Check if cursor is inside a context block.** If not, open the normal `ctx.ui.editor()` — same as today.
2. **If inside a context block**, show a custom view via `ctx.ui.custom()`:
   - **Top section (read-only):** The content inside the context markers, rendered via `Markdown.render()`. This shows the diff hunk with syntax highlighting, the suggested comment, or whatever the skill put in the markers.
   - **Bottom section (editable):** A text input area for the user's comment.
   - **Keys:** `Enter` to save, `Esc` to cancel.
3. The saved comment text goes into the comments map, keyed to the line where the user pressed `c`.

### Line range mapping

The raw markdown source and the rendered `string[]` output have different line counts (markdown rendering wraps, expands code blocks, etc.). To map context markers to rendered lines:

1. Before rendering, scan the raw markdown for `<!-- context:start -->` and `<!-- context:end -->` pairs.
2. Extract the content between each pair.
3. After rendering, find the rendered line ranges that correspond to the content between each marker pair. Since the markers themselves don't render, the content between them renders contiguously — match it by finding the rendered output of the content block.

### Files to change

- `pi/extensions/present-plan/lib/overlay.ts` — parse context markers, show context-aware editor
- `pi/extensions/present-plan/lib/context.ts` — new file: parse markers from raw markdown, map to rendered line ranges

---

## Part 3: Verbatim user comments

### Skill instruction

The review-pr skill (SKILL.md Step 7) adds:

> When the user provides feedback with inline comments on the Inline Comments section, each comment replaces the suggested comment for that finding. Use the user's text verbatim as the GitHub comment body — do not rephrase, summarise, or edit it.

### Synthesizer instruction

The synthesizer agent (`reviewer-synthesizer.md`) adds the same rule in its output format section.

### Files to change

- `ai/skills/review-pr/SKILL.md` — add verbatim comment instruction to Step 7
- `pi/agents/reviewer-synthesizer.md` — add verbatim comment instruction

---

## Summary of all file changes

| File | Change |
|------|--------|
| `pi/agents/reviewer-correctness.md` | Include diff hunks in findings |
| `pi/agents/reviewer-architecture.md` | Include diff hunks in findings |
| `pi/agents/reviewer-security.md` | Include diff hunks in findings |
| `pi/agents/reviewer-quality.md` | Include diff hunks in findings |
| `pi/agents/reviewer-risk.md` | Include diff hunks in findings |
| `pi/agents/reviewer-synthesizer.md` | Preserve hunks, context markers, verbatim instruction |
| `ai/skills/review-pr/SKILL.md` | Updated output format, verbatim instruction |
| `pi/extensions/present-plan/lib/overlay.ts` | Context-aware comment editor |
| `pi/extensions/present-plan/lib/context.ts` | New: parse context markers, line range mapping |
