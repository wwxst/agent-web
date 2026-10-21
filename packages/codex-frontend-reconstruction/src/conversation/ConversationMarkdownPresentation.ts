/**
 * Pure, independently reconstructed markdown/report helpers from
 * `conversation-markdown-315af0a2573a.js`.
 *
 * The actual Codex Markdown/MDX parser, syntax highlighting and link routing
 * are NOT supplied here. This module only implements verified leaf helpers.
 */
export interface ActivityCounts {
  createdFileCount?: number;
  editedFileCount?: number;
  deletedFileCount?: number;
  exploredFileCount?: number;
  searchCount?: number;
  listCount?: number;
  deniedRequestCount?: number;
  timedOutRequestCount?: number;
  commandCount?: number;
  mcpToolCallCount?: number;
  webSearchCount?: number;
}

export interface ParsedCommandActivity {
  type: string;
}
export interface ActivitySummaryItem {
  type: string;
  parsedCmd?: ParsedCommandActivity | null;
}

export interface CommandExecutionSummary {
  executionStatus?: string;
  output?: { exitCode?: number | null } | null;
}

/** Rendered Markdown normalization used before quoting, fencing and details. */
export function normalizeConversationNewlines(text: string): string {
  return text.replaceAll(/\r\n?/g, "\n");
}

/** Escape text before inserting it into the compiled presentation's code/details HTML. */
export function escapeConversationHtml(text: string): string {
  return text.replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function escapeConversationDetailsTags(text: string): string {
  return normalizeConversationNewlines(text).replaceAll(
    /<\/?details(?=[\s>])[^>]*>/gi,
    (tag) => escapeConversationHtml(tag),
  );
}

function maxBacktickRun(text: string): number {
  let length = 0;
  for (const match of text.matchAll(/`+/g)) {
    length = Math.max(length, match[0].length);
  }
  return length;
}

/** Selects a delimiter longer than any existing backtick run. */
export function quoteConversationInlineCode(text: string): string {
  const delimiter = "`".repeat(maxBacktickRun(text) + 1);
  return `${delimiter}${text}${delimiter}`;
}

/** Creates a fenced code block, avoiding premature closure from the content. */
export function fenceConversationCode(language: string, content: string): string {
  const normalized = normalizeConversationNewlines(content).trimEnd();
  const delimiter = "`".repeat(Math.max(3, maxBacktickRun(normalized) + 1));
  return `${delimiter}${language}\n${normalized}\n${delimiter}`;
}

export function codeConversationHtml(text: string): string {
  return `<code>${escapeConversationHtml(text)}</code>`;
}

export function normalizeConversationHeading(text: string): string {
  const normalized = text.replaceAll(/\s+/g, " ").trim();
  return normalized.length === 0 ? "Conversation" : normalized.replaceAll("#", "\\#");
}

export function summarizeExplorationActions(items: readonly ActivitySummaryItem[]): string {
  let read = 0;
  let search = 0;
  let list = 0;
  for (const item of items) {
    if (item.type !== "exec") continue;
    switch (item.parsedCmd?.type) {
      case "read": read += 1; break;
      case "search": search += 1; break;
      case "list_files": list += 1; break;
    }
  }
  const counts = [countPhrase(read, "file", "files"), countPhrase(search, "search", "searches"), countPhrase(list, "list", "lists")].filter(
    (value): value is string => value != null,
  );
  return counts.length === 0 ? "Explored" : `Explored ${counts.join(", ")}`;
}

function countPhrase(value: number | undefined, singular: string, plural: string): string | null {
  if (value == null || value === 0) return null;
  return value === 1 ? `a ${singular}` : `${value} ${plural}`;
}

function pushCount(
  output: string[],
  count: number | undefined,
  leadingVerb: string, followingVerb: string,
  singular: string, plural: string,
): void {
  const phrase = countPhrase(count, singular, plural);
  if (phrase != null) output.push(`${output.length === 0 ? leadingVerb : followingVerb} ${phrase}`);
}

export function formatConversationActivityCounts(counts: ActivityCounts): string {
  const parts: string[] = [];
  pushCount(parts, counts.createdFileCount, "Created", "created", "file", "files");
  pushCount(parts, counts.editedFileCount, "Edited", "edited", "file", "files");
  pushCount(parts, counts.deletedFileCount, "Deleted", "deleted", "file", "files");
  const exploration = [
    countPhrase(counts.exploredFileCount, "file", "files"),
    countPhrase(counts.searchCount, "search", "searches"),
    countPhrase(counts.listCount, "list", "lists"),
  ].filter((value): value is string => value != null);
  if (exploration.length > 0) {
    parts.push(`${parts.length === 0 ? "Explored" : "explored"} ${exploration.join(", ")}`);
  }
  pushCount(parts, counts.deniedRequestCount, "Denied", "denied", "request", "requests");
  const timedOut = countPhrase(counts.timedOutRequestCount, "request", "requests");
  if (timedOut != null) parts.push(`${timedOut} timed out`);
  pushCount(parts, counts.commandCount, "Ran", "ran", "command", "commands");
  pushCount(parts, counts.mcpToolCallCount, "Called", "called", "tool", "tools");
  if ((counts.webSearchCount ?? 0) > 0) {
    parts.push(parts.length === 0 ? "Searched the web" : "searched the web");
  }
  return parts.length === 0 ? "Tool activity" : parts.join(", ");
}

export function commandConversationStatus(item: CommandExecutionSummary): string {
  if (item.executionStatus === "interrupted") return "Stopped";
  const exitCode = item.output?.exitCode;
  if (exitCode == null) return item.executionStatus === "completed" ? "Success" : "Running";
  return exitCode === 0 ? "Success" : `Failed with exit code ${exitCode}`;
}

export function countUnifiedDiffChanges(text: string): { additions: number; deletions: number } {
  let additions = 0;
  let deletions = 0;
  for (const line of normalizeConversationNewlines(text).split("\n")) {
    if (line.startsWith("+") && !line.startsWith("+++")) additions += 1;
    else if (line.startsWith("-") && !line.startsWith("---")) deletions += 1;
  }
  return { additions, deletions };
}

export function describeConversationFileChange(kind: string): string | undefined {
  switch (kind) {
    case "add": return "Created";
    case "delete": return "Deleted";
    case "update": return "Edited";
    default: return undefined;
  }
}
