/**
 * Semantic reconstruction of the pure model helpers in Codex's compiled
 * `local-conversation-thread-turn-entries` module.
 *
 * This is an independent, typed reconstruction—not recovered original TSX.
 * Helpers whose behavior depends on private imported predicates are injected
 * explicitly so the caller must supply the exact host semantics.
 */

export type TranscriptBlockType =
  | "user-message"
  | "assistant-message"
  | "activity-item"
  | "agent-activity"
  | "generated-images"
  | "voice-nux"
  | "voice-presentation"
  | "voice-transcript"
  | string;

export interface TranscriptItem {
  type: string;
  id?: string;
  searchItemId?: string | null;
  computerHandoff?: unknown;
  [key: string]: unknown;
}

export interface TranscriptBlock {
  type: TranscriptBlockType;
  key?: string;
  item?: TranscriptItem;
  attachedActivityItems?: Array<{ key: string; item?: unknown }>;
  items?: Array<{ src?: string | null }>;
  [key: string]: unknown;
}

export interface TurnItem {
  id?: string;
  type?: string;
  [key: string]: unknown;
}

export interface RenderEntry {
  transcriptBlock?: TranscriptBlock | null;
  replyChain?: { id?: string | null; [key: string]: unknown } | null;
  historyEntityKey?: string | null;
  conversationId?: string | null;
  hostId?: string | null;
  turnSearchKey?: string | null;
  turnKey?: string | null;
  turnItemIds?: string[] | null;
  turn?: {
    status?: string;
    items: TurnItem[];
    [key: string]: unknown;
  } | null;
  activitySummaryWithoutAssistant?: unknown;
  turnState?: { transcriptItems?: unknown; [key: string]: unknown } | null;
  gapBeforePx?: number;
  minHeightPx?: number;
  timestampSeparatorAtMs?: number | null;
  aeonThreadTimestampMarkerSentAtMs?: number | null;
  aeonThreadTimestampFallbackMs?: number | null;
  aeonChannelChange?: unknown;
  showReplyQuote?: boolean;
  hideUserMessageActions?: boolean;
  voiceWorkActivity?: unknown;
  cwd?: string | null;
  isAeonThread?: boolean;
  isLatestTurn?: boolean;
  isMostRecentTurn?: boolean;
  isWorkStatusLoading?: boolean;
  latestLoadedUserTurnId?: string | null;
  isReadOnly?: boolean;
  totalTurnCount?: number;
  turnNumber?: number;
  isProjectlessConversation?: boolean;
  modelProvider?: unknown;
  onEditLastTurnMessage?: unknown;
  onForkTurnMessage?: unknown;
  completedThreadGoal?: unknown;
  generatedImages?: unknown;
  parentThreadAttachmentSourceConversationId?: unknown;
  preserveServerUserMessages?: boolean;
  renderMcpApps?: unknown;
  requests?: unknown;
  resolvedApps?: unknown;
  showFullTranscript?: boolean;
  showInProgressFixedContent?: boolean;
  threadHandoffOperation?: unknown;
  supersededMcpAppWidgetCallIds?: Set<string>;
  turnStatus?: unknown;
  turnId?: string | null;
  includeTranscriptTurnExtras?: boolean;
  isBackgroundSubagentsEnabled?: boolean;
  requestUserInputAsyncUiEnabled?: boolean;
  estimatedHeightPx?: number;
  [key: string]: unknown;
}

export interface ReplyChainIndexItem {
  id: string;
  rootItemId: string;
  hasInterspersedMessages: boolean;
}

export interface TranscriptModelDependencies {
  /** Corresponds to a private compiled predicate used to hide special entries. */
  isSpecialEntry?: (entry: RenderEntry) => boolean;
  /** Mirrors the compiled deep-equality import. */
  deepEqual?: (left: unknown, right: unknown) => boolean;
}

const VOICE_ONLY_TYPES = new Set([
  "voice-nux",
  "voice-presentation",
  "voice-transcript",
]);

export function isRenderableTranscriptEntry(
  entry: RenderEntry,
  isSpecialEntry: (entry: RenderEntry) => boolean = () => false,
): boolean {
  return !isSpecialEntry(entry) && !VOICE_ONLY_TYPES.has(entry.transcriptBlock?.type ?? "");
}

/** Reconstructs the compiled reply-chain index helper. */
export function buildReplyChainIndex(
  entries: RenderEntry[],
  isRenderable: (entry: RenderEntry) => boolean = isRenderableTranscriptEntry,
): Map<string, ReplyChainIndexItem> {
  const result = new Map<string, ReplyChainIndexItem>();
  let previousReplyChainId: string | null | undefined;

  for (const entry of entries) {
    if (!isRenderable(entry)) continue;
    const block = entry.transcriptBlock;
    if (block?.type !== "user-message" && block?.type !== "assistant-message") continue;

    const searchItemId = block.item?.searchItemId;
    const replyChainId = entry.replyChain?.id;
    const isConsecutiveInSameChain = replyChainId === previousReplyChainId;
    previousReplyChainId = replyChainId;
    if (searchItemId == null || replyChainId == null) continue;

    const existing = result.get(replyChainId);
    if (existing == null) {
      result.set(replyChainId, {
        id: replyChainId,
        rootItemId: searchItemId,
        hasInterspersedMessages: false,
      });
    } else if (!isConsecutiveInSameChain) {
      existing.hasInterspersedMessages = true;
    }
  }
  return result;
}

/** The bundle inserts a timestamp marker after a local-day change or 30 minutes. */
export function shouldInsertTimestampSeparator(
  previousSentAtMs: number | null | undefined,
  sentAtMs: number | null | undefined,
  thresholdMs = 30 * 60 * 1000,
): boolean {
  if (!Number.isFinite(sentAtMs)) return false;
  if (previousSentAtMs == null || !Number.isFinite(previousSentAtMs)) return true;

  const previous = new Date(previousSentAtMs);
  const current = new Date(sentAtMs as number);
  const sameLocalDay =
    previous.getFullYear() === current.getFullYear() &&
    previous.getMonth() === current.getMonth() &&
    previous.getDate() === current.getDate();

  return !sameLocalDay || (sentAtMs as number) - previousSentAtMs >= thresholdMs;
}

/** Finds the latest turn key associated with a transcript item identifier. */
export function findTurnSearchKeyForItem(
  entries: RenderEntry[],
  itemId: string,
  isAgentMessage: (item: TurnItem) => boolean = (item) => item.type === "agentMessage",
  isRenderable: (entry: RenderEntry) => boolean = isRenderableTranscriptEntry,
): string | null {
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    if (entry == null || !isRenderable(entry)) continue;

    if (entry.turn == null && entry.turnItemIds?.includes(itemId)) {
      return entry.turnSearchKey ?? null;
    }

    const matchingItem = entry.turn?.items.find((item) => item.id === itemId);
    if (
      matchingItem != null &&
      (entry.activitySummaryWithoutAssistant == null || !isAgentMessage(matchingItem))
    ) {
      return entry.turnSearchKey ?? null;
    }
  }
  return null;
}

export type EstimatedHeightKind =
  | "agent-activity"
  | "activity-item"
  | "assistant-message"
  | "generated-images"
  | "user-message";

/** Mirrors the compiled virtualization estimates, in CSS pixels. */
export function estimateTranscriptEntryHeight(block: {
  type: EstimatedHeightKind;
  attachedActivityItems?: unknown[];
}): number | undefined {
  switch (block.type) {
    case "agent-activity":
      return 48;
    case "activity-item":
      return 96;
    case "assistant-message":
      return 144 + (block.attachedActivityItems?.length ?? 0) * 48;
    case "generated-images":
      return 180;
    case "user-message":
      return 128;
  }
}

export function sameSet<T>(left: Set<T> | undefined, right: Set<T> | undefined): boolean {
  if (left === right) return true;
  if (left == null || right == null || left.size !== right.size) return false;
  for (const item of left) if (!right.has(item)) return false;
  return true;
}

export function sameTranscriptBlock(
  left: TranscriptBlock | null | undefined,
  right: TranscriptBlock | null | undefined,
  deepEqual: (left: unknown, right: unknown) => boolean,
): boolean {
  if (left == null || right == null) return left === right;
  if (left.type !== right.type || left.key !== right.key) return false;
  if (left.type !== "assistant-message" || right.type !== "assistant-message") return true;
  if (!deepEqual(left.item?.computerHandoff, right.item?.computerHandoff)) return false;

  const leftActivities = left.attachedActivityItems ?? [];
  const rightActivities = right.attachedActivityItems ?? [];
  return (
    leftActivities.length === rightActivities.length &&
    leftActivities.every(({ key }, index) => key === rightActivities[index]?.key)
  );
}

function sameLatestLoadedUserTurn(left: RenderEntry, right: RenderEntry): boolean {
  if (left.turnId == null) return true;
  const effective = (entry: RenderEntry) =>
    entry.latestLoadedUserTurnId == null
      ? entry.isMostRecentTurn
      : entry.turnId === entry.latestLoadedUserTurnId;
  return effective(left) === effective(right);
}

/**
 * Reconstructs the bundle's memo equality predicate. `deepEqual` must match
 * the host bundle's imported deep-equality semantics for full fidelity.
 */
export function areTurnEntriesEqual(
  left: RenderEntry,
  right: RenderEntry,
  deepEqual: (left: unknown, right: unknown) => boolean,
): boolean {
  return (
    left.gapBeforePx === right.gapBeforePx &&
    left.minHeightPx === right.minHeightPx &&
    left.timestampSeparatorAtMs === right.timestampSeparatorAtMs &&
    left.aeonThreadTimestampMarkerSentAtMs === right.aeonThreadTimestampMarkerSentAtMs &&
    left.aeonThreadTimestampFallbackMs === right.aeonThreadTimestampFallbackMs &&
    left.aeonChannelChange === right.aeonChannelChange &&
    deepEqual(left.replyChain, right.replyChain) &&
    left.showReplyQuote === right.showReplyQuote &&
    left.conversationId === right.conversationId &&
    left.activitySummaryWithoutAssistant === right.activitySummaryWithoutAssistant &&
    left.hideUserMessageActions === right.hideUserMessageActions &&
    left.voiceWorkActivity === right.voiceWorkActivity &&
    left.cwd === right.cwd &&
    left.historyEntityKey === right.historyEntityKey &&
    left.hostId === right.hostId &&
    left.isAeonThread === right.isAeonThread &&
    left.isLatestTurn === right.isLatestTurn &&
    left.isMostRecentTurn === right.isMostRecentTurn &&
    left.isWorkStatusLoading === right.isWorkStatusLoading &&
    sameLatestLoadedUserTurn(left, right) &&
    left.isReadOnly === right.isReadOnly &&
    left.totalTurnCount === right.totalTurnCount &&
    left.turnNumber === right.turnNumber &&
    left.isProjectlessConversation === right.isProjectlessConversation &&
    left.modelProvider === right.modelProvider &&
    left.onEditLastTurnMessage === right.onEditLastTurnMessage &&
    left.onForkTurnMessage === right.onForkTurnMessage &&
    left.completedThreadGoal === right.completedThreadGoal &&
    left.generatedImages === right.generatedImages &&
    left.parentThreadAttachmentSourceConversationId === right.parentThreadAttachmentSourceConversationId &&
    left.preserveServerUserMessages === right.preserveServerUserMessages &&
    left.renderMcpApps === right.renderMcpApps &&
    left.requests === right.requests &&
    left.resolvedApps === right.resolvedApps &&
    left.showFullTranscript === right.showFullTranscript &&
    left.showInProgressFixedContent === right.showInProgressFixedContent &&
    left.threadHandoffOperation === right.threadHandoffOperation &&
    sameSet(left.supersededMcpAppWidgetCallIds, right.supersededMcpAppWidgetCallIds) &&
    left.turn?.status === right.turn?.status &&
    left.turnStatus === right.turnStatus &&
    deepEqual(left.turnItemIds, right.turnItemIds) &&
    (left.turn === right.turn ||
      (right.historyEntityKey != null &&
        left.turnState == null &&
        right.turnState == null &&
        left.turn?.items.length === right.turn?.items.length &&
        left.turn?.items.every((item, index) => item.id === right.turn?.items[index]?.id) === true)) &&
    left.turnId === right.turnId &&
    left.turnKey === right.turnKey &&
    left.turnSearchKey === right.turnSearchKey &&
    left.turnState?.transcriptItems === right.turnState?.transcriptItems &&
    sameTranscriptBlock(left.transcriptBlock, right.transcriptBlock, deepEqual) &&
    left.includeTranscriptTurnExtras === right.includeTranscriptTurnExtras &&
    left.isBackgroundSubagentsEnabled === right.isBackgroundSubagentsEnabled &&
    left.requestUserInputAsyncUiEnabled === right.requestUserInputAsyncUiEnabled
  );
}
