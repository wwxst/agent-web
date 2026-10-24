/**
 * Standalone conversation-domain search adapter for original iFt/pFt/_Ft/xFt
 * (app-primary-fe8a450b3b04.js). The original has private regex workers and
 * also targets diff/file/browser panes; neither is reproduced here.
 *
 * This independent, intentionally literal matcher searches ONLY visible
 * strings supplied by the host. It never reports matches for unloaded turns.
 */
export interface SourceThreadFindRow {
  turnKey: string;
  text: string;
}
export interface SourceThreadFindMatch {
  turnKey: string;
  offset: number;
  length: number;
}
export function findSourceThreadLiteralMatches(
  rows: readonly SourceThreadFindRow[],
  query: string,
  limit = 2000,
): SourceThreadFindMatch[] {
  if (query.length === 0 || !query.trim() || !Number.isInteger(limit) || limit < 1) return [];
  const needle = query.toLocaleLowerCase();
  const matches: SourceThreadFindMatch[] = [];
  for (const row of rows) {
    if (typeof row.turnKey !== "string" || !row.turnKey || typeof row.text !== "string") continue;
    const text = row.text.toLocaleLowerCase();
    let from = 0;
    while (from <= text.length - needle.length) {
      const at = text.indexOf(needle, from);
      if (at === -1) break;
      matches.push({ turnKey: row.turnKey, offset: at, length: query.length });
      if (matches.length >= limit) return matches;
      from = at + Math.max(needle.length, 1);
    }
  }
  return matches;
}
export function wrapSourceThreadFindOrdinal(current: number, count: number, direction: "next" | "previous"): number {
  if (count <= 0) return 0;
  const index = Number.isInteger(current) ? Math.max(0, Math.min(current, count - 1)) : 0;
  return (index + (direction === "next" ? 1 : count - 1)) % count;
}
