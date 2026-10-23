/**
 * Semantic reconstruction of the live-thread timeline reconciliation path in:
 * `local-conversation-thread-6999d2419a30.js` (compiled helpers `sD`, `nD`,
 * `oD`, `ZE`, and relevant `eD` call-site behavior).
 *
 * This is new, independently typed source inferred from compiled behavior, not
 * the original authored TypeScript. No UI classes or design elements are invented.
 */

export type LiveEntry = Record<string, unknown> & {
  type?: string;
  turnId?: string | null;
  sourceTurnId?: string | null;
  turnKey?: string;
  isMostRecentTurn?: boolean;
  showInProgressFixedContent?: boolean;
};

export interface VoiceItem {
  role: string;
  text: string;
  completed?: boolean;
  [name: string]: unknown;
}

export interface VoiceItemBlock {
  type: 'voice-item';
  item: VoiceItem;
  [name: string]: unknown;
}

export type VoiceBlock = VoiceItemBlock | Record<string, any>;

/** Mirrors the compiled source-turn extraction (`sD`) for live/base entries. */
export function getEntrySourceTurnId(entry: LiveEntry): string | null {
  if (isBaseTurnEntry(entry)) return entry.turnId ?? null;
  if ('sourceTurnId' in entry) return entry.sourceTurnId ?? null;
  return null;
}

/** The original base-entry predicate is private and remains explicit. */
export function getEntrySourceTurnIdWithPredicate<T extends LiveEntry>(
  entry: T,
  isBaseTurnEntry: (entry: T) => boolean,
): string | null {
  if (isBaseTurnEntry(entry)) return entry.turnId ?? null;
  if ('sourceTurnId' in entry) return entry.sourceTurnId ?? null;
  return null;
}

function isBaseTurnEntry(entry: LiveEntry): boolean {
  // Convenience default for a standalone integration. For strict parity, callers
  // MUST supply the original predicate to the `WithPredicate` variant instead.
  return typeof entry.turnId === 'string' && entry.type == null;
}

/** The last base turn remains visible as most recent, including after voice merge. */
export function markMostRecentTurn<T extends LiveEntry>(
  entries: readonly T[],
  isBaseTurnEntry: (entry: T) => boolean,
): T[] {
  let lastBaseEntry: T | undefined;
  for (const entry of entries) if (isBaseTurnEntry(entry)) lastBaseEntry = entry;
  return entries.map((entry) => {
    if (!isBaseTurnEntry(entry)) return entry;
    const latest = entry === lastBaseEntry;
    return {
      ...entry,
      isMostRecentTurn: latest,
      showInProgressFixedContent: latest && entry.showInProgressFixedContent === true,
    };
  });
}

/** Fuses consecutive same-speaker voice chunks without changing their order. */
export function coalesceAdjacentVoiceItems<T extends VoiceBlock>(items: readonly T[]): T[] {
  const result: T[] = [];
  for (const incoming of items) {
    const previous = result.at(-1);
    if (
      previous?.type === 'voice-item' &&
      incoming.type === 'voice-item' &&
      (previous as VoiceItemBlock).item.role === (incoming as VoiceItemBlock).item.role
    ) {
      const earlier = (previous as VoiceItemBlock).item;
      const later = (incoming as VoiceItemBlock).item;
      result[result.length - 1] = {
        ...previous,
        item: { ...earlier, completed: later.completed, text: `${earlier.text}${later.text}` },
      } as T;
    } else {
      result.push(incoming);
    }
  }
  return result;
}

/**
 * Matches the compiled `oD` behavior when merging projected voice entries into
 * a pre-existing transcript. An internal session-boundary marker affects the
 * placement of the next source-less item but is not rendered itself.
 */
export function reconcileProjectedTimeline<T extends LiveEntry>(
  existing: readonly T[],
  projected: readonly T[],
  projectedTurnIds: ReadonlySet<string>,
  getSourceTurnId: (entry: T) => string | null,
  isBaseTurnEntry: (entry: T) => boolean,
): T[] {
  const firstIndexByTurn = new Map<string, number>();
  existing.forEach((entry, index) => {
    const turnId = getSourceTurnId(entry);
    if (turnId != null && projectedTurnIds.has(turnId) && !firstIndexByTurn.has(turnId)) {
      firstIndexByTurn.set(turnId, index);
    }
  });
  const first = Math.min(...firstIndexByTurn.values());
  if (!Number.isFinite(first)) {
    return [...existing, ...projected.filter((entry) => entry.type !== 'voice-session-boundary')];
  }

  const result = existing.slice(0, first);
  let cursor = first;
  let lastProjectedAnchor = first - 1;
  let crossedBoundary = false;
  let deferred: T[] = [];

  function appendUnprojectedEntries(upTo: number) {
    for (let index = cursor; index < upTo; index += 1) {
      const entry = existing[index];
      if (entry == null) continue;
      const id = getSourceTurnId(entry);
      if (!isBaseTurnEntry(entry) || id == null || !projectedTurnIds.has(id)) result.push(entry);
    }
    cursor = Math.max(cursor, upTo);
  }

  for (const entry of projected) {
    if (entry.type === 'voice-session-boundary') {
      crossedBoundary = true;
      continue;
    }
    const turnId = getSourceTurnId(entry);
    if (turnId == null && crossedBoundary) {
      deferred.push(entry);
      continue;
    }
    if (turnId != null) {
      const anchor = firstIndexByTurn.get(turnId);
      if (anchor != null && anchor > lastProjectedAnchor) {
        appendUnprojectedEntries(anchor);
        cursor = Math.max(cursor, anchor + 1);
        lastProjectedAnchor = anchor;
      }
    }
    result.push(...deferred);
    deferred = [];
    crossedBoundary = false;
    result.push(entry);
  }
  appendUnprojectedEntries(existing.length);
  result.push(...deferred);
  return result;
}

/**
 * Removes transcript-tail-flush-only turns without removing turns containing a
 * genuine user or steering message. The message-source readers are explicit.
 */
export function findTranscriptTailFlushTurnIds<T extends {
  turnId?: string | null;
  params: unknown;
  items: Array<Record<string, unknown>>;
}>(
  turns: readonly T[],
  getInputSource: (input: unknown) => string | null,
  getMessageSource: (item: Record<string, unknown>) => string | null,
): Set<string> {
  const result = new Set<string>();
  for (const turn of turns) {
    if (turn.turnId == null) continue;
    const paramRecord = turn.params as { input?: unknown } | null;
    if (getInputSource(paramRecord?.input) !== 'transcript_tail_flush') continue;
    const hasGenuineUser = turn.items.some(
      (item) =>
        (item.type === 'userMessage' || item.type === 'steeringUserMessage') &&
        getMessageSource(item) !== 'transcript_tail_flush',
    );
    if (!hasGenuineUser) result.add(turn.turnId);
  }
  return result;
}

/** Port of the session record category predicate (`lD`). */
export function isBemLifecycleRecord(record: { type: string }): boolean {
  switch (record.type) {
    case 'bem-turn-started':
    case 'bem-turn-completed':
    case 'bem-item-started':
    case 'bem-item-completed':
    case 'bem-presentation-added':
    case 'bem-presentation-committed':
      return true;
    default:
      return false;
  }
}
