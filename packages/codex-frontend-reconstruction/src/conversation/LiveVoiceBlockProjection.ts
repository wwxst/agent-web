/**
 * New semantic reconstruction of `uD` and `dD` in
 * local-conversation-thread-6999d2419a30.js.
 *
 * Transforms already-canonicalized realtime BEM blocks into the render-entry
 * sequence. The private presentation helpers are injected as verified adapters.
 */

export type VoiceTimelineBlock = {
  type: string;
  key?: string;
  turnId?: string;
  itemId?: string | null;
  itemIds?: string[];
  item?: Record<string, unknown>;
  sessionId?: string;
  presentation?: Record<string, unknown> | string;
  presentationId?: string;
  [key: string]: unknown;
};

export type VoiceTimelineEntry = Record<string, unknown> & {
  type?: string;
  turnKey?: string | undefined;
  sourceTurnId?: string | undefined;
  liveVoiceSource?: unknown;
};

export interface VoiceTurn {
  turnId: string;
  items: Array<Record<string, any> & { id: string; type: string }>;
  [key: string]: unknown;
}

export interface VoiceProjectionContext {
  conversationId: string;
  cwd?: string;
  hostId: string;
  canonical: boolean;
  isVoiceSessionActive: boolean;
  showNux: boolean;
  openAIFormElicitationsEnabled: boolean;
  turnsById: ReadonlyMap<string, VoiceTurn>;
  baseEntriesByTurnId: ReadonlyMap<string, VoiceTimelineEntry>;
  historyEntityKeysByTurnId: ReadonlyMap<string, string>;
  turnPresentationContexts: ReadonlyMap<string, unknown>;
  firstPresentationIds?: ReadonlyMap<string, string>;
  getPresentationMetadata: (blocks: readonly VoiceTimelineBlock[]) => ReadonlyMap<string, { firstPresentationId?: string; results?: unknown }>;
  estimateUserVoiceHeight: number;
  estimateAssistantVoiceHeight: number;
  estimatePendingArtifactHeight: number;
  estimateNuxHeight: number;
}

export interface VoiceProjectionAdapters {
  user(base: VoiceTimelineEntry, turn: VoiceTurn, block: VoiceTimelineBlock): VoiceTimelineEntry;
  segment(
    base: VoiceTimelineEntry,
    turn: VoiceTurn,
    block: VoiceTimelineBlock,
    presentationContext: unknown,
    openAIFormElicitationsEnabled: boolean,
    subagentThreadIds: ReadonlySet<string> | undefined,
  ): VoiceTimelineEntry;
  item(base: VoiceTimelineEntry, turn: VoiceTurn, block: VoiceTimelineBlock): VoiceTimelineEntry | null;
  image(base: VoiceTimelineEntry, block: VoiceTimelineBlock, presentationContext: unknown): VoiceTimelineEntry | null;
  presentation(base: VoiceTimelineEntry, turn: VoiceTurn, block: VoiceTimelineBlock, results: unknown): VoiceTimelineEntry | null;
  resources(base: VoiceTimelineEntry, turn: VoiceTurn, block: VoiceTimelineBlock, presentationContext: unknown): VoiceTimelineEntry | null;
  /** In source this enriches entries with an entityKey, item IDs and projector. */
  withHistorySource?(
    entry: VoiceTimelineEntry,
    base: VoiceTimelineEntry,
    itemIds: string[],
    historyEntityKey: string,
    project: (turn: VoiceTurn) => VoiceTimelineEntry | null,
  ): VoiceTimelineEntry;
}

export function getVoiceSubagentThreadIds(
  blocks: readonly VoiceTimelineBlock[],
  turnsById: ReadonlyMap<string, VoiceTurn>,
): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>();
  for (const block of blocks) {
    if (block.type !== 'bem-item' || block.presentation !== 'subagent' || block.turnId == null) continue;
    const matching = turnsById.get(block.turnId)?.items.find((item) => item.id === block.itemId);
    if (matching?.type !== 'subAgentActivity' || typeof matching.agentThreadId !== 'string') continue;
    if (!result.has(block.turnId)) result.set(block.turnId, new Set());
    result.get(block.turnId)!.add(matching.agentThreadId);
  }
  return result;
}

export function attachHistorySource(
  entry: VoiceTimelineEntry,
  base: VoiceTimelineEntry,
  itemIds: string[],
  historyEntityKey: string | undefined,
  project: (turn: VoiceTurn) => VoiceTimelineEntry | null,
  adapters: VoiceProjectionAdapters,
): VoiceTimelineEntry {
  if (historyEntityKey == null) return entry;
  if (adapters.withHistorySource) return adapters.withHistorySource(entry, base, itemIds, historyEntityKey, project);
  return {
    ...entry,
    liveVoiceSource: {
      key: { hostId: base.hostId, threadId: base.conversationId, entityKey: historyEntityKey },
      itemIds,
      project,
    },
  };
}

/**
 * Preserves `uD`'s block order, flushes consecutive voice-item tails, and
 * delegates all private per-block render choices to caller-supplied adapters.
 */
export function projectLiveVoiceBlocks(
  blocks: readonly VoiceTimelineBlock[],
  context: VoiceProjectionContext,
  adapters: VoiceProjectionAdapters,
): VoiceTimelineEntry[] {
  const results: VoiceTimelineEntry[] = [];
  const presentationMetadata = context.getPresentationMetadata(blocks.filter((b) => b.type !== 'pending-artifact'));
  const subagentsByTurn = getVoiceSubagentThreadIds(blocks, context.turnsById);

  if (context.showNux) {
    results.push({ type: 'voice-nux', estimatedHeightPx: context.estimateNuxHeight, turnKey: 'realtime-voice:nux' });
  }

  let voiceItems: Array<Record<string, any>> = [];
  function flushVoiceItems() {
    const first = voiceItems[0];
    if (!first) return;
    results.push({
      type: 'voice-transcript',
      block: { type: 'tail', id: first.id, entries: voiceItems, ...(context.canonical ? { canonical: true } : {}) },
      conversationId: context.conversationId,
      cwd: context.cwd,
      estimatedHeightPx: voiceItems.reduce(
        (total, item) => total + (item.role === 'user' ? context.estimateUserVoiceHeight : context.estimateAssistantVoiceHeight),
        0,
      ),
      hostId: context.hostId,
      isInProgress: context.isVoiceSessionActive,
      turnKey: `realtime-voice:transcript:${first.id}`,
    });
    voiceItems = [];
  }

  for (const block of blocks) {
    if (block.type === 'voice-item') {
      if (block.item) voiceItems.push(block.item);
      continue;
    }
    flushVoiceItems();

    if (block.type === 'session-divider') {
      results.push({ type: 'voice-session-boundary', sessionId: block.sessionId });
      continue;
    }
    if (block.type === 'session-ended') continue;
    if (block.type === 'pending-artifact') {
      results.push({
        type: 'voice-presentation',
        conversationId: context.conversationId,
        cwd: context.cwd,
        estimatedHeightPx: context.estimatePendingArtifactHeight,
        hostId: context.hostId,
        isInProgress: false,
        presentation: { type: 'pending-artifact' },
        sourceTurnId: block.turnId,
        turnKey: block.key,
      });
      continue;
    }

    if (block.turnId == null) continue;
    const base = context.baseEntriesByTurnId.get(block.turnId);
    const turn = context.turnsById.get(block.turnId);
    if (base == null || turn == null) continue;
    const presentationContext = context.turnPresentationContexts.get(block.turnId);
    const historyKey = context.historyEntityKeysByTurnId.get(block.turnId);

    if (block.type === 'bem-user') {
      const project = (turn: VoiceTurn) => adapters.user(base, turn, block);
      const entry = project(turn);
      results.push(attachHistorySource(entry, base, block.itemId == null ? [] : [block.itemId], historyKey, project, adapters));
    } else if (block.type === 'bem-segment') {
      const project = (turn: VoiceTurn) => adapters.segment(base, turn, block, presentationContext, context.openAIFormElicitationsEnabled, subagentsByTurn.get(block.turnId!));
      const entry = project(turn);
      results.push(attachHistorySource(entry, base, block.itemIds ?? [], historyKey, project, adapters));
    } else if (block.type === 'bem-item') {
      if (block.presentation === 'image') {
        const entry = adapters.image(base, block, presentationContext);
        if (entry) results.push(entry);
      } else {
        const project = (turn: VoiceTurn) => adapters.item(base, turn, block);
        const entry = project(turn);
        if (!entry) continue;
        const matching = turn.items.find((item) => item.id === block.itemId);
        const relatedIds = matching?.type === 'subAgentActivity'
          ? turn.items.filter((item) => item.type === 'subAgentActivity' && item.agentThreadId === matching.agentThreadId).map((item) => item.id)
          : block.itemId == null ? [] : [block.itemId];
        results.push(attachHistorySource(entry, base, relatedIds, historyKey, project, adapters));
      }
    } else if (block.type === 'bem-presentation') {
      const metadata = presentationMetadata.get(block.itemId ?? '');
      const presentationType = typeof block.presentation === 'object' ? block.presentation?.type : null;
      if (presentationType === 'created-thread' && metadata?.firstPresentationId !== block.presentationId) continue;
      const entry = adapters.presentation(base, turn, block, metadata?.results);
      if (entry) results.push(entry);
    } else if (block.type === 'bem-resources') {
      const entry = adapters.resources(base, turn, block, presentationContext);
      if (entry) results.push(entry);
    }
  }
  flushVoiceItems();
  return results;
}
