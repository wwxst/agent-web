
const MAX_PATCH_PREVIEW_BYTES = 1_048_576;

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/**
 * Port of compiled app-initial s0n/f0n. It synthesizes unified diffs for
 * add/delete changes, wraps update hunks with file headers, and enforces the
 * original 1 MiB preview limit before the renderer receives the text.
 */
export function getToolPatchDiffText(path: string, change: unknown): string | null {
  if (!record(change)) return null;
  const type = stringValue(change.type);
  if (type !== "update" && type !== "add" && type !== "delete") return null;
  const source = type === "update"
    ? stringValue(change.unified_diff)
    : stringValue(change.content);
  if (source == null) return null;
  const movePath = stringValue(change.move_path) ?? path;

  if (source.length > MAX_PATCH_PREVIEW_BYTES ||
      path.length * 4 > MAX_PATCH_PREVIEW_BYTES ||
      (type === "update" && (stringValue(change.move_path)?.length ?? 0) * 2 > MAX_PATCH_PREVIEW_BYTES)) {
    return null;
  }

  if (type === "update") {
    const unifiedDiff = source.trimStart();
    const hasFileHeaders = /\n?---\s/.test(unifiedDiff);
    const hasGitHeader = /^diff --git /m.test(unifiedDiff);
    const body = hasFileHeaders
      ? unifiedDiff
      : "--- a/" + path + "\n+++ b/" + movePath + "\n" + unifiedDiff;
    const prefix = hasGitHeader ? "" : "diff --git a/" + path + " b/" + movePath + "\n";
    return prefix.length + body.length > MAX_PATCH_PREVIEW_BYTES ? null : prefix + body;
  }

  const lines = source.replace(/\r\n/g, "\n").split("\n");
  if (lines.at(-1) === "") lines.pop();
  const header = [
    "diff --git a/" + path + " b/" + path,
    type === "add" ? "new file mode 100644" : "deleted file mode 100644",
    type === "add" ? "--- /dev/null" : "--- a/" + path,
    type === "add" ? "+++ b/" + path : "+++ /dev/null",
  ].join("\n");
  if (lines.length === 0) {
    return header.length > MAX_PATCH_PREVIEW_BYTES ? null : header;
  }

  const hunk = type === "add"
    ? "@@ -0,0 +1," + lines.length + " @@\n"
    : "@@ -1," + lines.length + " +0,0 @@\n";
  const estimatedLength = header.length + 1 + hunk.length +
    lines.reduce((total, line) => total + line.length + 2, 0);
  if (estimatedLength > MAX_PATCH_PREVIEW_BYTES) return null;
  const prefix = type === "add" ? "+" : "-";
  return header + "\n" + hunk + lines.map((line) => prefix + line).join("\n") + "\n";
}

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
