/**
 * Semantic reconstruction of the `me` turn-expansion path in:
 * local-conversation-thread-turn-entries-ed0916a7814f.js
 *
 * The private projection, transcript-mapping and grouping helpers are injected.
 * This preserves the observed orchestration without pretending to recover the
 * original source names or private implementations.
 */
export type AnyRecord = Record<string, any>;
export type TranscriptBlock = AnyRecord & { type: string; key: string; item?: AnyRecord };
export type TranscriptEntry = AnyRecord & {
  turnKey?: string | undefined;
  turnSearchKey?: string | undefined;
  transcriptBlock?: TranscriptBlock | null | undefined;
  replyChain?: AnyRecord | null | undefined;
  turn?: AnyRecord | null | undefined;
  turnState?: AnyRecord | null | undefined;
  turnItemIds?: string[] | undefined;
  estimatedHeightPx?: number | undefined;
  minHeightPx?: number | undefined;
};

export interface TurnExpansionOptions {
  baseTurnEntry: TranscriptEntry;
  collapseActivityBeforeAssistant: boolean;
  compactAeonAssistantMessageRevealState?: AnyRecord | null;
  compactAeonRevealTime?: number;
  compactAeonTypingEnabled?: boolean;
  hasPreviousBlock?: (key: string) => boolean;
  openAIFormElicitationsEnabled?: boolean;
  previousEntries?: TranscriptEntry[];
}

export interface TurnExpansionDependencies {
  isTurnEmpty(turn: AnyRecord): boolean;
  projectTurn(turn: AnyRecord, requests: unknown[], options: AnyRecord): AnyRecord;
  mapItemsToTranscriptBlocks(
    items: AnyRecord[],
    collapseActivityBeforeAssistant: boolean,
    showFullTranscript: boolean,
    options: AnyRecord,
  ): TranscriptBlock[];
  compactAeonTranscript(
    projectedItems: AnyRecord[],
    transcriptBlocks: TranscriptBlock[],
    revealState: AnyRecord | null | undefined,
    shouldSeedInitialSnapshot: boolean,
    revealTime: number,
    typingEnabled: boolean,
  ): { items: TranscriptBlock[]; hasPendingReply: boolean };
  groupTranscriptBlocks(
    blocks: TranscriptBlock[],
    collapseActivityBeforeAssistant: boolean,
    options: AnyRecord | undefined,
    hasPreviousBlock?: (key: string) => boolean,
  ): TranscriptBlock[];
  getComputerHandoffs(threadId: string, items: AnyRecord[]): { byItemId: Map<string, AnyRecord> };
  getMessageThreadInfo(item: AnyRecord): { id: string; messageThreadId: string } | null;
  isPendingTranscriptItem(item: AnyRecord): boolean;
  estimateHeight(block: TranscriptBlock): number | undefined;
  emptySummaryMinHeightPx: number;
}

function getPreviousEntryReuse(
  base: TranscriptEntry,
  previousEntries: TranscriptEntry[] | undefined,
  deps: TurnExpansionDependencies,
): TranscriptEntry[] | null {
  if (previousEntries == null || previousEntries.length === 0) return null;
  const previous = previousEntries[0];
  if (previous == null || previous.turnState?.hasPendingAssistantReply) return null;
  if (previous.isLatestTurn !== base.isLatestTurn) return null;

  const reusable =
    base.turn == null
      ? base.isAeonThread === true && previousEntries.every((entry) => entry.transcriptBlock != null)
      : previous.turn === base.turn &&
        previous.requests === base.requests &&
        previous.isAeonThread === base.isAeonThread &&
        previous.showFullTranscript === base.showFullTranscript &&
        previous.preserveServerUserMessages === base.preserveServerUserMessages &&
        previous.isBackgroundSubagentsEnabled === base.isBackgroundSubagentsEnabled &&
        previous.requestUserInputAsyncUiEnabled === base.requestUserInputAsyncUiEnabled &&
        previous.modelProvider === base.modelProvider &&
        previous.showStrictReviewNotices === base.showStrictReviewNotices &&
        !(previousEntries.every((entry) => entry.transcriptBlock == null) && deps.isTurnEmpty(base.turn));

  if (!reusable) return null;

  const common = { ...base, renderMcpApps: undefined };
  return previousEntries.map((entry) => ({
    ...common,
    estimatedHeightPx: entry.estimatedHeightPx,
    minHeightPx: entry.minHeightPx,
    includeTranscriptTurnExtras: entry.includeTranscriptTurnExtras,
    transcriptBlock: entry.transcriptBlock,
    replyChain: entry.replyChain,
    aeonThreadTimestampFallbackMs: entry.aeonThreadTimestampFallbackMs,
    turnKey: entry.turnKey,
    turnState: entry.turnState,
  }));
}

/**
 * Expands one normalized turn into renderable transcript entries.
 * Inputs and dependency contracts follow the observed compiled module.
 */
export function expandTurnIntoTranscriptEntries(
  options: TurnExpansionOptions,
  deps: TurnExpansionDependencies,
): TranscriptEntry[] {
  const {
    baseTurnEntry: base,
    collapseActivityBeforeAssistant,
    compactAeonAssistantMessageRevealState,
    compactAeonRevealTime = Date.now(),
    compactAeonTypingEnabled = false,
    hasPreviousBlock,
    openAIFormElicitationsEnabled = false,
    previousEntries,
  } = options;

  const reusable = getPreviousEntryReuse(base, previousEntries, deps);
  if (reusable != null) return reusable;

  const entryBase = { ...base, renderMcpApps: undefined };
  const turn = base.turn;
  if (turn == null) return [entryBase];

  if (turn.itemsPagination?.summaryItemIds?.length === 0) {
    return [{ ...entryBase, minHeightPx: deps.emptySummaryMinHeightPx }];
  }

  const isEmptyTurn = deps.isTurnEmpty(turn);
  const projected = deps.projectTurn(turn, base.requests ?? [], {
    includeAeonProjection: base.isAeonThread === true || base.preserveServerUserMessages === true,
    isBackgroundSubagentsEnabled: base.isBackgroundSubagentsEnabled,
    openAIFormElicitationsEnabled,
    requestUserInputAsyncUiEnabled: base.requestUserInputAsyncUiEnabled,
    preserveServerUserMessages: base.preserveServerUserMessages,
    showStrictReviewNotices: base.showStrictReviewNotices,
    isLatestTurn: base.isLatestTurn,
  });

  const isAeonThread = base.isAeonThread === true;
  let transcriptBlocks = deps.mapItemsToTranscriptBlocks(
    projected.items ?? [],
    isAeonThread || (base.preserveServerUserMessages === true && !collapseActivityBeforeAssistant),
    base.showFullTranscript === true,
    {
      hostId: base.hostId,
      computerHandoffsByItemId: isAeonThread
        ? deps.getComputerHandoffs(turn.params?.threadId, turn.items ?? []).byItemId
        : undefined,
      hideIncompleteAeonAssistantMessages: isAeonThread && base.showFullTranscript !== true,
      projectAeonUserMessageReactions: false,
    },
  );

  let hasPendingReply = false;
  if (isAeonThread && base.showFullTranscript !== true) {
    const compacted = deps.compactAeonTranscript(
      projected.items ?? [],
      transcriptBlocks,
      compactAeonAssistantMessageRevealState,
      compactAeonAssistantMessageRevealState?.hasSeededInitialSnapshot === true &&
        base.isMostRecentTurn === true &&
        (previousEntries == null || previousEntries.some((entry) => entry.turn?.status === "inProgress")),
      compactAeonRevealTime,
      compactAeonTypingEnabled,
    );
    transcriptBlocks = compacted.items;
    hasPendingReply = compacted.hasPendingReply;
  }

  const turnState = isAeonThread
    ? { ...projected, transcriptItems: transcriptBlocks, hasPendingAssistantReply: hasPendingReply }
    : projected;

  let blocks = isAeonThread
    ? deps.groupTranscriptBlocks(
        transcriptBlocks,
        collapseActivityBeforeAssistant,
        {
          hostId: base.hostId,
          turnStartedAtMs: turn.turnStartedAtMs,
        },
        hasPreviousBlock,
      )
    : deps.groupTranscriptBlocks(
        transcriptBlocks,
        collapseActivityBeforeAssistant,
        undefined,
        hasPreviousBlock,
      );

  let replyChainBySearchItemId: Map<string, AnyRecord> | null = null;
  if (isAeonThread) {
    replyChainBySearchItemId = new Map();
    for (const item of turn.items ?? []) {
      const info = deps.getMessageThreadInfo(item);
      if (info != null) {
        replyChainBySearchItemId.set(info.id, {
          id: info.messageThreadId,
          rootItemId: info.id,
          hasInterspersedMessages: false,
        });
      }
    }
  }

  if (blocks.length === 0) {
    if (isAeonThread && turn.itemsPagination?.hasLoadedOldest === false) {
      return [{
        ...entryBase,
        minHeightPx: turn.itemsPagination.summaryItemIds == null
          ? undefined
          : deps.emptySummaryMinHeightPx,
        turnState,
      }];
    }

    if (
      isAeonThread &&
      base.showFullTranscript !== true &&
      compactAeonTypingEnabled &&
      (hasPendingReply || (projected.items ?? []).some((item: AnyRecord) => deps.isPendingTranscriptItem(item)))
    ) {
      return [{ ...entryBase, turnState }];
    }

    const hasRelevantContent =
      (base.requests?.length ?? 0) > 0 ||
      (turn.status === "inProgress" &&
        (projected.items ?? []).some((item: AnyRecord) =>
          item.type === "turn-diff" || (item.type === "todo-list" && (item.plan?.length ?? 0) > 0),
        ));

    const allBlocksAreDiffs = transcriptBlocks.every((block) => block.type === "turn-diff");
    const hasActiveExternalEvent = (projected.items ?? []).some(
      (item: AnyRecord) => item.type === "external-event" && !item.subscriptionEnded,
    );
    const omitEntry =
      isEmptyTurn ||
      (isAeonThread &&
        !hasRelevantContent &&
        allBlocksAreDiffs &&
        ((turn.params?.input?.length ?? 0) === 0 || hasActiveExternalEvent));

    return omitEntry ? [] : [{ ...entryBase, turnState }];
  }

  const firstMessageIndex = blocks.findIndex(
    (block) => block.type === "assistant-message" || block.type === "user-message",
  );

  return blocks.map((block, index) => {
    const searchItemId = block.item?.searchItemId;
    const canHaveReplyChain =
      (block.type === "assistant-message" || block.type === "user-message") &&
      searchItemId != null;
    return {
      ...entryBase,
      replyChain: canHaveReplyChain ? replyChainBySearchItemId?.get(searchItemId) : undefined,
      turnKey: `${base.turnSearchKey}:transcript:${block.key}`,
      turnState,
      aeonThreadTimestampFallbackMs:
        isAeonThread && index === firstMessageIndex ? turn.turnStartedAtMs : undefined,
      estimatedHeightPx: deps.estimateHeight(block),
      transcriptBlock: block,
      includeTranscriptTurnExtras: index === blocks.length - 1,
    };
  });
}
