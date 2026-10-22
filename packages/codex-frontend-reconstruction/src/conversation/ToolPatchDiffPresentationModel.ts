type Data = Record<string, unknown>;

const isRecord = (value: unknown): value is Data =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

export interface ToolPatchDiffPresentation {
  added: number;
  removed: number;
  /** First changed line in the new file, falling back to the first removed line and then line 1. */
  openLocationLine: number;
}

function countContentLines(content: string): number {
  if (content === "") return 0;
  const lines = content.split(/\r?\n/);
  return lines.length - (lines[lines.length - 1] === "" ? 1 : 0);
}

/**
 * Projects the compiled patch-diff-stats helper's observable contract:
 * count unified-diff additions/deletions without counting file headers, and
 * open the file at the first added/deleted line. Plain add/delete content uses
 * a line-count fallback and opens at line 1.
 */
export function getToolPatchDiffPresentation(
  diff: string | null,
  change: unknown,
): ToolPatchDiffPresentation | null {
  const changeType = isRecord(change) ? text(change.type) : undefined;
  const content = isRecord(change) ? text(change.content) : undefined;
  if (diff == null || diff === "") {
    if ((changeType === "add" || changeType === "delete") && content != null) {
      const lines = countContentLines(content);
      if (lines === 0) return null;
      return changeType === "add"
        ? { added: lines, removed: 0, openLocationLine: 1 }
        : { added: 0, removed: lines, openLocationLine: 1 };
    }
    return null;
  }

  const lines = diff.split(/\r?\n/);
  const isUnifiedDiff = lines.some((line) => line.startsWith("@@ ")) ||
    lines.some((line) => line.startsWith("+++ ")) ||
    lines.some((line) => line.startsWith("--- "));
  if (!isUnifiedDiff) {
    if ((changeType === "add" || changeType === "delete") && content != null) {
      const lineCount = countContentLines(content);
      if (lineCount === 0) return null;
      return changeType === "add"
        ? { added: lineCount, removed: 0, openLocationLine: 1 }
        : { added: 0, removed: lineCount, openLocationLine: 1 };
    }
    return null;
  }

  let added = 0;
  let removed = 0;
  let newLine: number | null = null;
  let firstAdditionLine: number | null = null;
  let firstDeletionLine: number | null = null;

  for (const line of lines) {
    const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      newLine = Number(hunk[1]);
      continue;
    }
    if (line.startsWith("+++") || line.startsWith("---")) continue;
    if (line.startsWith("+")) {
      added += 1;
      if (firstAdditionLine == null) firstAdditionLine = newLine ?? 1;
      if (newLine != null) newLine += 1;
    } else if (line.startsWith("-")) {
      removed += 1;
      if (firstDeletionLine == null) firstDeletionLine = newLine ?? 1;
    } else if (line.startsWith(" ") && newLine != null) {
      newLine += 1;
    }
  }

  // The compiled helper falls back to raw +/- counting when a diff parser
  // reports no additions/deletions; the loop above performs that count.
  if (added === 0 && removed === 0 && !lines.some((line) => line.startsWith("@@ "))) return null;
  return {
    added,
    removed,
    openLocationLine: firstAdditionLine ?? firstDeletionLine ?? 1,
  };
}
