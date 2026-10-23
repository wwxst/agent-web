/**
 * Conversation-level render-entry orchestration reconstructed from the `Y`
 * projection in `local-conversation-thread-turn-entries-ed0916a7814f.js`.
 *
 * The private base-entry producer and item projectors remain injected. This
 * module owns the observed ordering/metadata pass that turns those inputs into
 * stable virtualized transcript rows.
 */
import {
  areTurnEntriesEqual,
  buildReplyChainIndex,
  isRenderableTranscriptEntry,
  type RenderEntry,
} from "./TurnEntriesModel.js";
import type { TranscriptEntry } from "./TranscriptEntryExpansion.js";

export type ConversationRenderEntry = TranscriptEntry & {
  conversationId?: string | undefined;
  cwd?: string | null | undefined;
  hostId?: string | null | undefined;
  turnId?: string | null | undefined;
  turnKey?: string | undefined;
  turnSearchKey?: string | undefined;
  isLatestTurn?: boolean | undefined;
  isMostRecentTurn?: boolean | undefined;
  isAeonThread?: boolean | undefined;
  preserveServerUserMessages?: boolean | undefined;
  requests?: unknown[] | undefined;
  generatedImages?: unknown;
  historyEntityKey?: string | null | undefined;
  timestampSeparatorAtMs?: number | null | undefined;
  aeonThreadTimestampMarkerSentAtMs?: number | null | undefined;
  aeonChannelChange?: string | undefined;
  gapBeforePx?: number | undefined;
  showReplyQuote?: boolean | undefined;
  totalTurnCount?: number | undefined;
  turnNumber?: number | undefined;
  turnStatus?: unknown;
  threadHandoffOperation?: unknown;
  turnItemIds?: string[] | undefined;
  [key: string]: any;
};

export interface TimestampEvent {
  role: "user" | "assistant";
  sentAtMs?: number | null | undefined;
  breaksPreviousAdjacency?: boolean | undefined;
}

export interface ConversationRenderProjectionOptions {
  baseEntries: ConversationRenderEntry[];
  previousEntries?: ConversationRenderEntry[] | undefined;
  conversationId: string;
  cwd?: string | null | undefined;
  hostId?: string | null | undefined;
  isAeonThread?: boolean | undefined;
  showFullTranscript?: boolean | undefined;
  hideInitialAeonTimestampMarker?: boolean | undefined;
  compactAeonAssistantMessageRevealState?: {
    hasSeededInitialSnapshot?: boolean | undefined;
    messageStates?: Map<string, unknown> | undefined;
    [key: string]: unknown;
  } | null | undefined;
  compactAeonRevealTime?: number | undefined;
  compactAeonTypingEnabled?: boolean | undefined;
  isThreadResuming?: boolean | undefined;
  isReadOnly?: boolean | undefined;
  isProjectlessConversation?: boolean | undefined;
  latestLoadedUserTurnId?: string | null | undefined;
  modelProvider?: unknown;
  projectlessOutputDirectory?: string | null | undefined;
  onEditLastTurnMessage?: unknown;
  onForkTurnMessage?: unknown;
  completedThreadGoal?: unknown;
  completedThreadGoalTurnKey?: string | null | undefined;
  hasInheritedParentTurns?: boolean | undefined;
  visibleSubagentParentThreadId?: string | null | undefined;
  isBackgroundSubagentsEnabled?: boolean | undefined;
  requestUserInputAsyncUiEnabled?: boolean | undefined;
  openAIFormElicitationsEnabled?: boolean | undefined;
  showInProgressFixedContent?: boolean | undefined;
  showStrictReviewNotices?: boolean | undefined;
  supersededMcpAppWidgetCallIds?: Set<string> | undefined;
  renderMcpApps?: unknown;
  resolvedApps?: unknown;
  threadHandoffOperation?: { id: string; [key: string]: unknown } | null | undefined;
  generatedImageTurnEntries?: ConversationRenderEntry[] | undefined;
  /** `Date.now()` is injected for deterministic tests and timestamp markers. */
  nowMs?: number | undefined;
}

export interface ConversationRenderProjectionDependencies {
  /** The bundle's private `m(entry)` special-entry predicate. */
  isSpecialEntry(entry: ConversationRenderEntry): boolean;
  /** Expands preserved server-message turns using `expandTurnIntoTranscriptEntries`. */
  expandPreservedTurn(args: {
    baseTurnEntry: ConversationRenderEntry;
    previousEntries?: ConversationRenderEntry[] | undefined;
    hasPreviousBlock: (key: string) => boolean;
    compactAeonAssistantMessageRevealState?: ConversationRenderProjectionOptions["compactAeonAssistantMessageRevealState"];
    compactAeonRevealTime: number;
    compactAeonTypingEnabled: boolean;
    openAIFormElicitationsEnabled: boolean;
  }): ConversationRenderEntry[];
  /** Computes generated-image entries using the private projection helpers. */
  computeGeneratedImages?(args: {
    previousEntries: ConversationRenderEntry[];
    visibleTurnEntries: ConversationRenderEntry[];
    isAeonThread: boolean;
    isBackgroundSubagentsEnabled: boolean;
    requestUserInputAsyncUiEnabled: boolean;
    projectlessOutputDirectory: string | null;
  }): unknown[];
  /** Exact private predicate for items representing an external delivery surface. */
  isExternalSurfaceItem?(item: Record<string, unknown>): boolean;
  /** Optional host-equivalent deep equality for the memo comparator. */
  deepEqual?(left: unknown, right: unknown): boolean;
  /** Allows the caller to update read receipts after the final projection. */
  /** Reconstructs the private failed-retry deduplication predicate for Aeon turns. */
  findRedundantAeonTurnObjects?(candidateTurns: Array<unknown | null>): ReadonlySet<unknown>;
  /** Private pending-item predicate used by compact Aeon typing rows. */
  isPendingTranscriptItem?(item: Record<string, unknown>): boolean;
  applyReadReceiptProjection?(entries: ConversationRenderEntry[]): void;
}

export interface ConversationRenderProjectionResult {
  entries: ConversationRenderEntry[];
  initialAeonMessageSentAtMs: number | null;
  latestRenderedTurnKey: string | null;
  nextCompactAeonRevealAt: number | null;
}

const VOICE_ONLY_TYPES = new Set(["voice-nux", "voice-presentation", "voice-transcript"]);
const TIMESTAMP_FIRST_USER_AGE_MS = 60 * 60 * 1000;
const TIMESTAMP_ASSISTANT_GAP_MS = 10 * 60 * 1000;
const TIMESTAMP_USER_GAP_MS = 60 * 60 * 1000;
const TIMESTAMP_MARKER_GAP_MS = 30 * 60 * 1000;

function isRenderable(
  entry: ConversationRenderEntry,
  deps: ConversationRenderProjectionDependencies,
): boolean {
  return isRenderableTranscriptEntry(entry as RenderEntry, deps.isSpecialEntry as (entry: RenderEntry) => boolean);
}

function createBaseRenderEntry(
  entry: ConversationRenderEntry,
  options: ConversationRenderProjectionOptions,
  generatedImages: unknown[],
  index: number,
  totalRenderableBaseTurns: number,
  isMostRecentCandidate: boolean,
): ConversationRenderEntry {
  const turnId = entry.turnId;
  return {
    timestampSeparatorAtMs: null,
    aeonThreadTimestampMarkerSentAtMs: null,
    conversationId: options.conversationId,
    cwd: options.cwd,
    historyEntityKey: entry.historyEntityKey,
    hostId: options.hostId,
    isAeonThread: options.isAeonThread === true,
    isLatestTurn: entry.isLatestTurn,
    isMostRecentTurn: isMostRecentCandidate,
    isWorkStatusLoading: options.isThreadResuming === true && isMostRecentCandidate,
    isReadOnly: options.isReadOnly,
    showStrictReviewNotices: options.showStrictReviewNotices ?? false,
    totalTurnCount: totalRenderableBaseTurns,
    turnNumber: index + 1,
    isProjectlessConversation: options.isProjectlessConversation,
    latestLoadedUserTurnId: options.latestLoadedUserTurnId,
    modelProvider: options.modelProvider,
    projectlessOutputDirectory: options.projectlessOutputDirectory ?? null,
    onEditLastTurnMessage: options.onEditLastTurnMessage,
    onForkTurnMessage: options.onForkTurnMessage,
    completedThreadGoal:
      options.completedThreadGoalTurnKey === entry.turnSearchKey
        ? options.completedThreadGoal
        : null,
    generatedImages,
    parentThreadAttachmentSourceConversationId:
      index === 0 && options.hasInheritedParentTurns && options.visibleSubagentParentThreadId != null
        ? options.visibleSubagentParentThreadId
        : undefined,
    preserveServerUserMessages: entry.preserveServerUserMessages,
    renderMcpApps: options.renderMcpApps,
    requests: entry.requests ?? [],
    resolvedApps: options.resolvedApps,
    showFullTranscript: options.showFullTranscript,
    showInProgressFixedContent: options.showInProgressFixedContent === true && isMostRecentCandidate,
    supersededMcpAppWidgetCallIds: options.supersededMcpAppWidgetCallIds,
    turnId,
    turnKey:
      entry.historyPositionKey ??
      (turnId == null ? entry.turnSearchKey : `history-content:turn:${turnId}`),
    turnSearchKey: entry.turnSearchKey,
    turn: "turn" in entry ? entry.turn : undefined,
    isBackgroundSubagentsEnabled: options.isBackgroundSubagentsEnabled,
    requestUserInputAsyncUiEnabled: options.requestUserInputAsyncUiEnabled,
  };
}

function computeTimestampSeparators(
  entries: ConversationRenderEntry[],
  options: ConversationRenderProjectionOptions,
  deps: ConversationRenderProjectionDependencies,
): Array<number | null> {
  const nowMs = options.nowMs ?? Date.now();
  const eventLists: Array<TimestampEvent[] | null> = entries.map((entry) => {
    if (
      !isRenderable(entry, deps) ||
      entry.isAeonThread === true ||
      entry.preserveServerUserMessages === true ||
      entry.turn == null
    ) return null;

    const events: TimestampEvent[] = [];
    const turn = entry.turn;
    const params = turn.params as Record<string, unknown> | undefined;
    const input = params?.input;
    if (Array.isArray(input) && input.length > 0) {
      events.push({ role: "user", sentAtMs: typeof turn.turnStartedAtMs === "number" ? turn.turnStartedAtMs : null });
    }
    const items = Array.isArray(turn.items) ? turn.items as Array<Record<string, unknown>> : [];
    if (items.some((item) => item.type === "agentMessage")) {
      events.push({ role: "assistant", sentAtMs: typeof turn.finalAssistantStartedAtMs === "number" ? turn.finalAssistantStartedAtMs : null });
    }
    return events;
  });

  let previous: TimestampEvent | null = null;
  let sawUser = false;
  return eventLists.map((events) => {
    if (events == null) {
      previous = null;
      sawUser = true;
      return null;
    }
    let marker: number | null = null;
    for (const current of events) {
      if (current.breaksPreviousAdjacency) previous = null;
      const sentAt = current.sentAtMs;
      if (Number.isFinite(sentAt)) {
        const firstUserTooOld = current.role === "user" && !sawUser && nowMs - (sentAt as number) > TIMESTAMP_FIRST_USER_AGE_MS;
        const previousAssistant = previous?.role === "assistant" && Number.isFinite(previous.sentAtMs);
        const gapThreshold = current.role === "user" ? TIMESTAMP_USER_GAP_MS : TIMESTAMP_ASSISTANT_GAP_MS;
        const assistantBoundary = previousAssistant && (sentAt as number) - (previous?.sentAtMs as number) > gapThreshold;
        if (firstUserTooOld || assistantBoundary) marker ??= sentAt as number;
      }
      if (current.role === "user") sawUser = true;
      previous = current;
    }
    return marker;
  });
}

function shouldInsertAeonMarker(
  previousMarkerSentAtMs: number | null,
  sentAtMs: number | null | undefined,
): boolean {
  if (!Number.isFinite(sentAtMs)) return false;
  if (previousMarkerSentAtMs == null || !Number.isFinite(previousMarkerSentAtMs)) return true;
  const previous = new Date(previousMarkerSentAtMs);
  const current = new Date(sentAtMs as number);
  const sameLocalDay = previous.getFullYear() === current.getFullYear() &&
    previous.getMonth() === current.getMonth() && previous.getDate() === current.getDate();
  return !sameLocalDay || (sentAtMs as number) - previousMarkerSentAtMs >= TIMESTAMP_MARKER_GAP_MS;
}

function computeGapBeforePx(
  current: ConversationRenderEntry["transcriptBlock"],
  currentReplyChainId: string | null | undefined,
  previous: ConversationRenderEntry["transcriptBlock"],
  previousReplyChainId: string | null | undefined,
): number | undefined {
  const currentType = current?.type;
  const previousType = previous?.type;
  if (
    (currentType !== "assistant-message" && currentType !== "user-message") ||
    (previousType !== "assistant-message" && previousType !== "user-message")
  ) return undefined;

  if ((currentReplyChainId == null || currentReplyChainId !== previousReplyChainId) && currentType !== previousType) {
    return 32;
  }

  const currentSentAt = current?.item?.sentAtMs;
  const previousSentAt = previous?.item?.sentAtMs;
  if (!(typeof currentSentAt === "number" && Number.isFinite(currentSentAt) &&
    typeof previousSentAt === "number" && Number.isFinite(previousSentAt) &&
    currentSentAt - previousSentAt > 60_000)) return undefined;

  return currentType === "user-message" && current?.item?.externalSurface != null ? 12 : 4;
}

function structuralDeepEqual(left: unknown, right: unknown, seen = new WeakMap<object, object>()): boolean {
  if (Object.is(left, right)) return true;
  if (left == null || right == null || typeof left !== "object" || typeof right !== "object") return false;
  if (Object.getPrototypeOf(left) !== Object.getPrototypeOf(right)) return false;
  const prior = seen.get(left);
  if (prior != null) return prior === right;
  seen.set(left, right);

  if (left instanceof Date && right instanceof Date) return left.getTime() === right.getTime();
  if (left instanceof Set && right instanceof Set) {
    if (left.size !== right.size) return false;
    for (const item of left) if (![...right].some((candidate) => structuralDeepEqual(item, candidate, seen))) return false;
    return true;
  }
  if (left instanceof Map && right instanceof Map) {
    if (left.size !== right.size) return false;
    for (const [key, value] of left) {
      if (!right.has(key) || !structuralDeepEqual(value, right.get(key), seen)) return false;
    }
    return true;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    return left.every((value, index) => structuralDeepEqual(value, right[index], seen));
  }

  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord);
  const rightKeys = Object.keys(rightRecord);
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every((key) => Object.hasOwn(rightRecord, key) && structuralDeepEqual(leftRecord[key], rightRecord[key], seen));
}

function getNextRevealTime(
  state: ConversationRenderProjectionOptions["compactAeonAssistantMessageRevealState"],
  nowMs: number,
): number | null {
  if (state?.messageStates == null) return null;
  let next: number | null = null;
  for (const value of state.messageStates.values()) {
    if (value != null && typeof value === "object" && "revealAtMs" in value) {
      const revealAtMs = (value as { revealAtMs?: unknown }).revealAtMs;
      if (typeof revealAtMs === "number" && revealAtMs > nowMs) {
        next = Math.min(next ?? revealAtMs, revealAtMs);
      }
    }
  }
  return next;
}

/**
 * Mirrors the compiled `Y` render-entry projection pass. The supplied
 * `baseEntries` are the output of the private live-turn/history projector.
 */
export function buildConversationRenderEntries(
  options: ConversationRenderProjectionOptions,
  deps: ConversationRenderProjectionDependencies,
): ConversationRenderProjectionResult {
  const previousEntries = options.previousEntries ?? [];
  const compactAeonMode = options.isAeonThread === true && options.showFullTranscript !== true;
  if (options.compactAeonAssistantMessageRevealState != null && !compactAeonMode) {
    options.compactAeonAssistantMessageRevealState.hasSeededInitialSnapshot = false;
    options.compactAeonAssistantMessageRevealState.messageStates?.clear();
  }
  const previousByKey = new Map(previousEntries.map((entry) => [entry.turnKey, entry]));
  const previousRenderable = previousEntries.filter((entry) => isRenderable(entry, deps));
  const threadHandoffKey = options.threadHandoffOperation == null
    ? null
    : previousRenderable.find((entry) => (entry.threadHandoffOperation as { id?: unknown } | null | undefined)?.id === options.threadHandoffOperation?.id)?.turnKey ?? null;

  let sourceEntries = options.baseEntries;
  if (options.isAeonThread === true && options.showFullTranscript === true && deps.findRedundantAeonTurnObjects != null) {
    const candidateTurns = sourceEntries.map((entry) =>
      !deps.isSpecialEntry(entry) && "turn" in entry && Array.isArray(entry.requests) && entry.requests.length === 0
        ? entry.turn ?? null
        : null,
    );
    const turnsToRemove = deps.findRedundantAeonTurnObjects(candidateTurns);
    if (turnsToRemove.size > 0) {
      sourceEntries = sourceEntries.filter((entry) => !("turn" in entry) || !turnsToRemove.has(entry.turn));
    }
  }

  const nonSpecialBaseEntries = sourceEntries.filter((entry) => !deps.isSpecialEntry(entry));
  const latestBaseEntry = [...nonSpecialBaseEntries].reverse().find((entry) => entry.isLatestTurn) ?? nonSpecialBaseEntries.at(-1);
  const generatedImagesCandidate = deps.computeGeneratedImages?.({
    previousEntries,
    visibleTurnEntries: options.generatedImageTurnEntries ?? [],
    isAeonThread: options.isAeonThread === true,
    isBackgroundSubagentsEnabled: options.isBackgroundSubagentsEnabled === true,
    requestUserInputAsyncUiEnabled: options.requestUserInputAsyncUiEnabled === true,
    projectlessOutputDirectory: options.projectlessOutputDirectory ?? null,
  }) ?? (previousEntries[0]?.generatedImages as unknown[] | undefined) ?? [];
  const generatedImages = previousEntries[0]?.generatedImages != null &&
    (deps.deepEqual ?? Object.is)(previousEntries[0].generatedImages, generatedImagesCandidate)
    ? previousEntries[0].generatedImages as unknown[]
    : generatedImagesCandidate;

  const previousPreservedEntriesBySearchKey = new Map<string, ConversationRenderEntry[]>();
  if (options.showFullTranscript !== true && nonSpecialBaseEntries.some((entry) => entry.preserveServerUserMessages)) {
    for (const entry of previousRenderable) {
      if (entry.turnSearchKey == null) continue;
      const group = previousPreservedEntriesBySearchKey.get(entry.turnSearchKey) ?? [];
      group.push(entry);
      previousPreservedEntriesBySearchKey.set(entry.turnSearchKey, group);
    }
  }

  const expanded: ConversationRenderEntry[] = [];
  const turnNumberByExpandedIndex = new Map<number, number>();
  let lastExpandedTurnKey: string | null = null;
  let renderedTurnCount = 0;
  let sourceTurnIndex = 0;

  for (const sourceEntry of sourceEntries) {
    if (deps.isSpecialEntry(sourceEntry)) {
      const previous = sourceEntry.turnKey == null ? undefined : previousByKey.get(sourceEntry.turnKey);
      expanded.push(previous != null && deps.isSpecialEntry(previous) &&
        previous.estimatedHeightPx === sourceEntry.estimatedHeightPx
        ? previous
        : { ...sourceEntry, conversationId: options.conversationId });
      continue;
    }

    const base = createBaseRenderEntry(
      sourceEntry,
      options,
      generatedImages,
      sourceTurnIndex,
      nonSpecialBaseEntries.length,
      sourceEntry === latestBaseEntry,
    );
    const expandedEntries = options.showFullTranscript !== true && sourceEntry.preserveServerUserMessages === true
      ? deps.expandPreservedTurn({
          baseTurnEntry: base,
          previousEntries: base.turnSearchKey == null ? undefined : previousPreservedEntriesBySearchKey.get(base.turnSearchKey),
          hasPreviousBlock: (key) => previousByKey.has(`${base.turnSearchKey}:transcript:${key}`),
          compactAeonAssistantMessageRevealState: options.compactAeonAssistantMessageRevealState,
          compactAeonRevealTime: options.compactAeonRevealTime ?? options.nowMs ?? Date.now(),
          compactAeonTypingEnabled: options.compactAeonTypingEnabled === true,
          openAIFormElicitationsEnabled: options.openAIFormElicitationsEnabled === true,
        })
      : [base];

    if (expandedEntries.length > 0) renderedTurnCount += 1;
    for (const entry of expandedEntries) {
      lastExpandedTurnKey = entry.turnKey ?? null;
      turnNumberByExpandedIndex.set(expanded.length, renderedTurnCount);
      expanded.push(entry);
    }
    sourceTurnIndex += 1;
  }

  const hasLatestTurn = expanded.some((entry) => isRenderable(entry, deps) && entry.isLatestTurn === true);
  const latestHandoffKey = threadHandoffKey != null && expanded.some((entry) => isRenderable(entry, deps) && entry.turnKey === threadHandoffKey)
    ? threadHandoffKey
    : lastExpandedTurnKey;
  const timestampSeparators = computeTimestampSeparators(expanded, options, deps);
  const replyChainIndex = options.isAeonThread === true ? buildReplyChainIndex(
    expanded as RenderEntry[],
    (entry) => isRenderable(entry as ConversationRenderEntry, deps),
  ) : null;

  let firstAeonSentAtMs: number | null = null;
  let previousAeonMarkerSentAtMs: number | null = null;
  let currentExternalChannel: string | null = null;
  let previousReplyChainId: string | null | undefined;
  const normalized = [...expanded];
  const deepEqual = deps.deepEqual ?? structuralDeepEqual;

  for (let index = 0; index < expanded.length; index += 1) {
    const entry = expanded[index];
    if (entry == null) continue;
    if (deps.isSpecialEntry(entry)) {
      currentExternalChannel = null;
      previousReplyChainId = undefined;
      previousAeonMarkerSentAtMs = null;
      continue;
    }
    if (!isRenderable(entry, deps)) continue;

    const previous = expanded[index - 1];
    const currentBlock = entry.transcriptBlock;
    let aeonMarkerAtMs: number | null = null;
    let aeonChannelChange: string | undefined;

    if (options.isAeonThread === true && options.showFullTranscript !== true) {
      let channel: string | null = currentExternalChannel;
      const item = currentBlock?.item as Record<string, unknown> | undefined;
      if (
        (currentBlock?.type === "user-message" || currentBlock?.type === "activity-item") &&
        item != null && (deps.isExternalSurfaceItem?.(item) ?? item.externalSurface != null)
      ) {
        channel = currentBlock.type === "user-message" ? (typeof item.externalSurface === "string" ? item.externalSurface : null) : null;
      } else if (
        currentBlock?.type === "assistant-message" &&
        (item?.externalDelivery as Record<string, unknown> | undefined)?.state != null &&
        ["sent", "accepted"].includes(String((item?.externalDelivery as Record<string, unknown>).state)) &&
        (item?.externalDelivery as Record<string, unknown>).provider !== "tibro"
      ) {
        channel = String((item?.externalDelivery as Record<string, unknown>).provider ?? "");
      }
      if (channel === "imessage" || channel === "rcs") channel = "phone";
      if (channel !== currentExternalChannel) {
        aeonChannelChange = channel ?? undefined;
        currentExternalChannel = channel;
      }

      if (
        currentBlock?.type === "assistant-message" ||
        currentBlock?.type === "user-message" ||
        (currentBlock?.type === "activity-item" && item != null && (deps.isExternalSurfaceItem?.(item) ?? item.externalSurface != null) && firstAeonSentAtMs == null)
      ) {
        const sentAt = currentBlock.type === "activity-item"
          ? currentBlock.sentAtMs
          : item?.sentAtMs ?? entry.aeonThreadTimestampFallbackMs;
        if (typeof sentAt === "number" && Number.isFinite(sentAt)) {
          const isFirstMarker = firstAeonSentAtMs == null;
          if (isFirstMarker) firstAeonSentAtMs = sentAt;
          if (!(options.hideInitialAeonTimestampMarker === true && isFirstMarker) && shouldInsertAeonMarker(previousAeonMarkerSentAtMs, sentAt)) {
            aeonMarkerAtMs = sentAt;
          }
          const oldEntry = entry.turnKey == null ? undefined : previousByKey.get(entry.turnKey);
          if (
            !(options.hideInitialAeonTimestampMarker === true && isFirstMarker) &&
            aeonMarkerAtMs == null && oldEntry != null && isRenderable(oldEntry, deps) &&
            oldEntry.aeonThreadTimestampMarkerSentAtMs === sentAt
          ) {
            aeonMarkerAtMs = oldEntry.aeonThreadTimestampMarkerSentAtMs ?? null;
          }
          if (isFirstMarker || aeonMarkerAtMs != null) previousAeonMarkerSentAtMs = sentAt;
        }
      }
    }

    const turnNumber = turnNumberByExpandedIndex.get(index);
    if (turnNumber == null) continue;
    const previousBlock = previous != null && isRenderable(previous, deps) ? previous.transcriptBlock : undefined;
    const previousChainId = previous != null && isRenderable(previous, deps) ? previous.replyChain?.id : undefined;
    let gapBeforePx = options.isAeonThread === true && options.showFullTranscript !== true &&
      aeonMarkerAtMs == null && aeonChannelChange == null
      ? computeGapBeforePx(currentBlock, entry.replyChain?.id, previousBlock, previousChainId)
      : undefined;
    if (
      options.isAeonThread === true &&
      options.showFullTranscript !== true &&
      options.compactAeonTypingEnabled === true &&
      currentBlock == null &&
      (entry.turnState?.hasPendingAssistantReply === true ||
        (entry.turnState?.items as Array<Record<string, unknown>> | undefined)?.some((item) => deps.isPendingTranscriptItem?.(item) === true))
    ) gapBeforePx = 0;

    const isMostRecentTurn = entry.isLatestTurn === true || (!hasLatestTurn && turnNumber === renderedTurnCount);
    const showReplyQuote = entry.replyChain != null && entry.replyChain.id !== previousReplyChainId;
    if (currentBlock?.type === "user-message" || currentBlock?.type === "assistant-message") {
      previousReplyChainId = entry.replyChain?.id;
    }

    const isHistorySummary = entry.historyEntityKey != null &&
      entry.isAeonThread !== true &&
      entry.preserveServerUserMessages !== true &&
      entry.turnState == null &&
      entry.transcriptBlock == null;
    const next: ConversationRenderEntry = {
      ...entry,
      turn: isHistorySummary ? undefined : entry.turn,
      turnItemIds: isHistorySummary ? entry.turn?.items?.map((item: Record<string, unknown>) => item.id) : undefined,
      turnStatus: isHistorySummary ? entry.turn?.status : undefined,
      replyChain: entry.replyChain == null ? undefined : replyChainIndex?.get(String(entry.replyChain.id)),
      showReplyQuote,
      gapBeforePx,
      timestampSeparatorAtMs: timestampSeparators[index] ?? null,
      aeonThreadTimestampMarkerSentAtMs: aeonMarkerAtMs,
      aeonChannelChange,
      isMostRecentTurn,
      showInProgressFixedContent: options.showInProgressFixedContent === true && isMostRecentTurn,
      threadHandoffOperation: entry.turnKey === latestHandoffKey ? options.threadHandoffOperation ?? undefined : undefined,
      totalTurnCount: renderedTurnCount,
      turnNumber,
    };
    const old = previousByKey.get(next.turnKey);
    normalized[index] = old != null && isRenderable(old, deps) &&
      areTurnEntriesEqual(old as RenderEntry, next as RenderEntry, deepEqual)
      ? old
      : next;
  }

  deps.applyReadReceiptProjection?.(normalized);
  const stableEntries = options.baseEntries.length === normalized.length && normalized.every((entry, index) => options.baseEntries[index] === entry)
    ? options.baseEntries
    : normalized;

  return {
    entries: stableEntries,
    initialAeonMessageSentAtMs: firstAeonSentAtMs,
    latestRenderedTurnKey: lastExpandedTurnKey,
    nextCompactAeonRevealAt: options.compactAeonTypingEnabled === true && options.compactAeonAssistantMessageRevealState != null
      ? getNextRevealTime(options.compactAeonAssistantMessageRevealState, options.compactAeonRevealTime ?? options.nowMs ?? Date.now())
      : null,
  };
}
