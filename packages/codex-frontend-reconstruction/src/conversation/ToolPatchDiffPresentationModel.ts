export interface ToolPatchDiffPresentation {
  added: number;
  removed: number;
  /** First changed line, with the original helper's line-one fallback. */
  openLocationLine: number;
}

interface ParsedDiffStats {
  added: number;
  removed: number;
  firstAdditionLine: number | null;
  firstDeletionLine: number | null;
}

function parseUnifiedDiff(diff: string): ParsedDiffStats | null {
  const lines = diff.split(/\r?\n/);
  let oldLine: number | null = null;
  let newLine: number | null = null;
  let foundFileHeader = false;
  let foundHunk = false;
  let added = 0;
  let removed = 0;
  let firstAdditionLine: number | null = null;
  let firstDeletionLine: number | null = null;

  for (const line of lines) {
    if (line.startsWith("--- ") || line.startsWith("+++ ")) {
      foundFileHeader = true;
      continue;
    }
    const hunk = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      foundHunk = true;
      oldLine = Number(hunk[1]);
      newLine = Number(hunk[2]);
      continue;
    }
    if (!foundHunk) continue;
    if (line.startsWith("diff --git ")) break;
    if (line.startsWith("\\ No newline")) continue;
    if (line.startsWith("+")) {
      added += 1;
      if (firstAdditionLine == null) firstAdditionLine = newLine ?? 1;
      if (newLine != null) newLine += 1;
    } else if (line.startsWith("-")) {
      removed += 1;
      if (firstDeletionLine == null) firstDeletionLine = oldLine ?? newLine ?? 1;
      if (oldLine != null) oldLine += 1;
    } else if (line.startsWith(" ")) {
      if (oldLine != null) oldLine += 1;
      if (newLine != null) newLine += 1;
    }
  }

  if (!foundHunk && !foundFileHeader) return null;
  return { added, removed, firstAdditionLine, firstDeletionLine };
}

function countRawDiffLines(diff: string): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const line of diff.split(/\r?\n/)) {
    if (line.startsWith("+++") || line.startsWith("---")) continue;
    if (line.startsWith("+")) added += 1;
    else if (line.startsWith("-")) removed += 1;
  }
  return { added, removed };
}

/**
 * Mirrors patch-diff-stats-48343cc4a635.js: parse the first unified diff,
 * fall back to raw +/- line counts when parsing yields no changes, exclude
 * file headers, and use line 1 for that raw-count fallback.
 */
export function getToolPatchDiffPresentation(diff: string | null): ToolPatchDiffPresentation | null {
  if (!diff) return null;
  const parsed = parseUnifiedDiff(diff);
  if (parsed == null || (parsed.added === 0 && parsed.removed === 0)) {
    const raw = countRawDiffLines(diff);
    if (raw.added > 0 || raw.removed > 0) {
      return { ...raw, openLocationLine: 1 };
    }
  }
  if (parsed == null) return null;
  return {
    added: parsed.added,
    removed: parsed.removed,
    openLocationLine: parsed.firstAdditionLine ?? parsed.firstDeletionLine ?? 1,
  };
}
