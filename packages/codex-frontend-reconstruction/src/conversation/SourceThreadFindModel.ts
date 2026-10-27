/**
 * Standalone conversation find projection, source-informed by
 * use-conversation-search-highlights-6c328093bb06.js (re/te, z=250)
 * and app-primary-fe8a450b3b04.js (xFt capped total label).
 *
 * The private plain-text p matcher and persisted search host remain missing.
 * This bounded literal fallback only scans supplied, actually hydrated rows.
 */
export const SOURCE_CONVERSATION_FIND_NAVIGATION_LIMIT = 250;

/** Original re/te scans each turn's ordered text units, not a composite
 * string that merges unrelated Markdown and command-output DOM surfaces. */
export interface SourceThreadFindUnit {
  unitKey: string;
  text: string;
}
export interface SourceThreadFindRow {
  turnKey: string;
  /** Compatibility for hosts without unit projection. */
  text: string;
  /** Original turn.units / unitId identity, optional in older demo hosts. */
  units?: readonly SourceThreadFindUnit[];
}
export function sourceThreadFindUnitIdentity(turnKey:string,unitKey:string):string {
  return JSON.stringify([turnKey,unitKey]);
}
export interface SourceThreadFindMatch {
  turnKey: string;
  /** Original per-unit identifier, absent only for legacy whole-turn rows. */
  unitKey?: string;
  /** Offset inside this unit's original complete text, never joined rows. */
  offset: number;
  length: number;
}
export interface SourceThreadFindResult {
  matches: SourceThreadFindMatch[];
  /** Original result distinguishes total count from navigable first 250. */
  totalMatches: number;
  isCapped: boolean;
  /** Match counts include non-navigable occurrences, for safe DOM highlights. */
  totalByTurn: ReadonlyMap<string, number>;
  /** Per source unit counts let the DOM highlighter avoid false ordinal maps. */
  totalByUnit: ReadonlyMap<string, number>;
}
export function searchSourceThreadLiteralRows(
  rows: readonly SourceThreadFindRow[],
  query: string,
  limit = SOURCE_CONVERSATION_FIND_NAVIGATION_LIMIT,
): SourceThreadFindResult {
  const matches: SourceThreadFindMatch[] = [];
  const totalByTurn = new Map<string, number>();
  const totalByUnit = new Map<string, number>();
  let totalMatches = 0;
  if (!query.trim() || !Number.isInteger(limit) || limit < 1) {
    return { matches, totalMatches, isCapped: false, totalByTurn, totalByUnit };
  }
  const needle = query.toLocaleLowerCase();
  for (const row of rows) {
    if (typeof row.turnKey !== "string" || !row.turnKey || typeof row.text !== "string") continue;
    const units = row.units ?? [{unitKey:"",text:row.text}];
    for (const unit of units) {
      if (!unit || typeof unit.text !== "string") continue;
      const folded = unit.text.toLocaleLowerCase();
      const unitKey = typeof unit.unitKey === "string" && unit.unitKey !== ""
        ? unit.unitKey : undefined;
      let from = 0;
      while (from <= folded.length - needle.length) {
        const at = folded.indexOf(needle, from);
        if (at < 0) break;
        totalMatches++;
        totalByTurn.set(row.turnKey, (totalByTurn.get(row.turnKey) ?? 0) + 1);
        if (unitKey != null) {
          const identity=sourceThreadFindUnitIdentity(row.turnKey,unitKey);
          totalByUnit.set(identity,(totalByUnit.get(identity)??0)+1);
        }
        if (matches.length < limit) {
          matches.push({
            turnKey:row.turnKey,
            ...(unitKey==null?{}:{unitKey}),
            offset:at,length:query.length,
          });
        }
        from = at + Math.max(needle.length, 1);
      }
    }
  }
  return {matches, totalMatches, isCapped: totalMatches > matches.length,
    totalByTurn,totalByUnit};
}
/** Backward-compatible host adapter for source-recovered literal calls. */
export function findSourceThreadLiteralMatches(
  rows: readonly SourceThreadFindRow[], query: string,
  limit = SOURCE_CONVERSATION_FIND_NAVIGATION_LIMIT,
): SourceThreadFindMatch[] {
  return searchSourceThreadLiteralRows(rows, query, limit).matches;
}
export function wrapSourceThreadFindOrdinal(current: number, count: number, direction: "next" | "previous"): number {
  if (count <= 0) return 0;
  const index = Number.isInteger(current) ? Math.max(0, Math.min(current, count - 1)) : 0;
  return (index + (direction === "next" ? 1 : count - 1)) % count;
}
