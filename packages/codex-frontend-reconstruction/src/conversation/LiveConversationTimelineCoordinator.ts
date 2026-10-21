/**
 * Typed coordination model for the live conversation's voice/history timeline.
 *
 * In the compiled `local-conversation-thread` this is the outer `eD` path. Its
 * private turn filtering, voice-record projection, and presentation adapters
 * remain explicit to avoid inventing unseen implementations.
 */
import {
  findTranscriptTailFlushTurnIds,
  getEntrySourceTurnIdWithPredicate,
  markMostRecentTurn,
  reconcileProjectedTimeline,
  type LiveEntry,
} from './LiveTimelineMerge.js';

export interface TimelineTurn {
  turnId?: string | null;
  params: unknown;
  items: Array<Record<string, unknown>>;
  [name: string]: unknown;
}

export interface LiveTimelineHistory {
  isLoaded: boolean;
  records: Array<Record<string, unknown>>;
  timeline: unknown | null;
}

export interface LiveTimelineOptions<E extends LiveEntry, T extends TimelineTurn> {
  entries: E[];
  turns: T[];
  history: LiveTimelineHistory;
  isBaseTurnEntry: (entry: E) => boolean;
  getInputSource: (input: unknown) => string | null;
  getMessageSource: (item: Record<string, unknown>) => string | null;
  /** Projects the user's non-voice (or otherwise unsupported) turn into the correct visual state. */
  projectOrdinaryTurn?: (entry: E, turn: T) => E;
  /** Canonical voice block and presentation generation remains a private dependency. */
  createProjectedVoiceEntries: (args: {
    turnsById: ReadonlyMap<string, T>;
    baseEntriesByTurnId: ReadonlyMap<string, E>;
    history: LiveTimelineHistory;
    survivingEntries: readonly E[];
  }) => { entries: E[]; projectedTurnIds: ReadonlySet<string> };
}

/**
 * 1. Waits until voice history is loaded.
 * 2. Removes synthetic tail-flush turns only when they have no real user input.
 * 3. Optionally projects remaining ordinary turns.
 * 4. Uses voice-history projector if a timeline or records are present.
 * 5. Reconciles projected entries and flags the most recent real turn.
 */
export function buildLiveConversationTimeline<E extends LiveEntry, T extends TimelineTurn>(
  options: LiveTimelineOptions<E, T>,
): E[] {
  const {
    entries,
    turns,
    history,
    isBaseTurnEntry,
    getInputSource,
    getMessageSource,
    projectOrdinaryTurn,
    createProjectedVoiceEntries,
  } = options;

  if (!history.isLoaded) return [];

  const turnsById = new Map<string, T>();
  for (const turn of turns) if (turn.turnId != null) turnsById.set(turn.turnId, turn);

  const baseEntriesByTurnId = new Map<string, E>();
  for (const entry of entries) {
    if (!isBaseTurnEntry(entry) || entry.turnId == null) continue;
    baseEntriesByTurnId.set(entry.turnId, entry);
    const inlineTurn = (entry as Record<string, unknown>).turn as T | null | undefined;
    if (inlineTurn != null) turnsById.set(entry.turnId, inlineTurn);
  }

  const tailFlushIds = findTranscriptTailFlushTurnIds(
    [...turnsById.values()],
    getInputSource,
    getMessageSource,
  );
  const survivors = tailFlushIds.size === 0
    ? entries
    : entries.filter((entry) => {
        const id = getEntrySourceTurnIdWithPredicate(entry, isBaseTurnEntry);
        return id == null || !tailFlushIds.has(id);
      });

  for (const id of tailFlushIds) {
    turnsById.delete(id);
    baseEntriesByTurnId.delete(id);
  }

  const projectedOrdinary = projectOrdinaryTurn == null
    ? [...survivors]
    : survivors.map((entry) => {
        if (!isBaseTurnEntry(entry) || entry.turnId == null) return entry;
        const turn = turnsById.get(entry.turnId);
        return turn == null ? entry : projectOrdinaryTurn(entry, turn);
      });

  if (history.timeline == null && history.records.length === 0) {
    // Mirrors `eD`'s fast path: the initial input array is returned directly
    // when no filtering or ordinary projection was needed.
    if (survivors === entries && projectOrdinaryTurn == null) return entries;
    return markMostRecentTurn(projectedOrdinary, isBaseTurnEntry);
  }

  const result = createProjectedVoiceEntries({
    turnsById,
    baseEntriesByTurnId,
    history,
    survivingEntries: projectedOrdinary,
  });
  const merged = reconcileProjectedTimeline(
    projectedOrdinary,
    result.entries,
    result.projectedTurnIds,
    (entry) => getEntrySourceTurnIdWithPredicate(entry, isBaseTurnEntry),
    isBaseTurnEntry,
  );
  return markMostRecentTurn(merged, isBaseTurnEntry);
}
