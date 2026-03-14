import type { PlanContext } from "./types.ts";

export interface RenderedContext {
  renderedStart: number; // first rendered line index
  renderedEnd: number; // last rendered line index (inclusive)
  content: string; // markdown for the context-aware editor
}

/**
 * Build a mapping from raw markdown lines to rendered lines.
 *
 * Strategy: render markdown line by line (cumulatively), tracking how many
 * rendered lines each raw line produces. This gives us a raw→rendered mapping.
 */
export function buildRawToRenderedMap(
  rawMarkdown: string,
  renderFn: (md: string) => string[],
): number[] {
  const rawLines = rawMarkdown.split("\n");
  const renderedLineStart: number[] = [];
  let prevRenderedCount = 0;

  for (let i = 0; i < rawLines.length; i++) {
    renderedLineStart.push(prevRenderedCount);
    const prefix = rawLines.slice(0, i + 1).join("\n");
    const rendered = renderFn(prefix);
    prevRenderedCount = rendered.length;
  }

  return renderedLineStart;
}

/**
 * Map PlanContext[] (raw line ranges) to RenderedContext[] (rendered line ranges).
 */
export function mapContextsToRendered(
  contexts: PlanContext[],
  rawToRendered: number[],
  totalRenderedLines: number,
): RenderedContext[] {
  return contexts.map((ctx) => {
    const start = ctx.rawStart - 1; // convert 1-indexed to 0-indexed
    const end = ctx.rawEnd - 1;

    const renderedStart = rawToRendered[start] ?? 0;
    const renderedEnd =
      end + 1 < rawToRendered.length
        ? rawToRendered[end + 1] - 1
        : totalRenderedLines - 1;

    return {
      renderedStart,
      renderedEnd: Math.max(renderedStart, renderedEnd),
      content: ctx.content,
    };
  });
}

/**
 * Find the context that contains a given rendered line index.
 */
export function findContextForLine(
  lineIdx: number,
  renderedContexts: RenderedContext[],
): RenderedContext | null {
  for (const ctx of renderedContexts) {
    if (lineIdx >= ctx.renderedStart && lineIdx <= ctx.renderedEnd) {
      return ctx;
    }
  }
  return null;
}
