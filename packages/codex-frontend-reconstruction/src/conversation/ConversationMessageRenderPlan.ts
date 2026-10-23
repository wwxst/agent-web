import {deriveSourceLatestActivityRetention,
 type SourceLatestActivityRetentionInput} from "./SourceLatestActivityRetentionGate.js";
/**
 * Semantic reconstruction of the block-to-render-node dispatch in
 * `local-conversation-turn-69783815d57d.js` (compiled `rs` / `ls`).
 *
 * This is a host-agnostic render PLAN. JSX, Codex's message body renderer,
 * activity slices and design-system primitives stay in explicit adapters.
 * Neither source identifiers nor private behavior are claimed as recovered.
 */
export type ConversationMessageItem = Record<string, unknown> & {
  type: string;
  id?: string;
  completed?: boolean;
  content?: string;
};

export interface ConversationActivityPart {
  type: "activity" | "result";
  items?: ConversationMessageItem[];
  result?: unknown;
}

export type ConversationTranscriptBlock =
  | { type: "user-message"; key: string; item: ConversationMessageItem; isFirstUserMessage?: boolean; isLastUserMessage?: boolean; readReceipt?: unknown | undefined }
  | { type: "assistant-message"; key: string; item: ConversationMessageItem; attachedActivityItems?: unknown[] }
  | { type: "agent-activity"; key: string; items: ConversationMessageItem[]; collapseWhenPossible?: boolean }
  | { type: "activity-item"; key: string; item: ConversationMessageItem }
  | { type: "generated-images"; key: string; items: Array<Record<string, unknown>> };

export interface RenderPlanBase {
  key: string;
  canOwnLatestTurnFollowContent: boolean;
  isResponseContent: boolean;
  ownsFirstResponseBoundary: boolean;
}
export type ConversationMessageRenderNode = RenderPlanBase & (
  | { kind: "user-message"; item: ConversationMessageItem; isFirstUserMessage: boolean; isLastUserMessage: boolean; showReadReceipt: boolean; readReceipt?: unknown | undefined }
  | { kind: "assistant-message"; item: ConversationMessageItem; attachedActivityItems?: unknown[] | undefined; assistantCopyText?: string | undefined; isLastAssistantMessage: boolean }
  | { kind: "activity-group"; items: ConversationMessageItem[]; isActive: boolean; collapseWhenPossible: boolean; renderMode: "latest" | "all"; hasFollowingFinalAnswer: boolean; allowLatestCompletedGroup: boolean | null }
  | { kind: "activity-result"; result: unknown }
  | { kind: "activity-item"; item: ConversationMessageItem; isActive: boolean; presentation: "ordinary" | "subagent" | "activity-units" }
  | { kind: "generated-images"; images: Array<Record<string, unknown>> }
  | { kind: "thinking-placeholder" | "thinking-status-slot" | "typing-status-slot"; showThinking: boolean; isVisible: boolean }
  | { kind: "in-progress-fixed-content"; todoListItem?: ConversationMessageItem | null | undefined; unifiedDiffItem?: ConversationMessageItem | null | undefined; hasBlockingRequest: boolean }
);

type WithoutRenderBase<T> = T extends RenderPlanBase ? Omit<T, keyof RenderPlanBase> : never;

export interface ConversationMessageRenderPlan {
  nodes: ConversationMessageRenderNode[];
  /** Compiled `ls`: the footer belongs to the last eligible row, or last row. */
  footerNodeIndex: number;
  followContentNodeIndexes: number[];
  /** Compiled `ls` omits the gap before the typing-status slot. */
  gapBeforeNodeIndexes: number[];
}

export interface ConversationMessagePlanOptions {
  isTurnInProgress: boolean;
  /** Original local-conversation-turn selects direct ga for latest vs Rk for all. */
  renderMode?: "latest" | "all";
  isAeonThread?: boolean;
  hostId?: string | undefined;
  /** Resolved Fc Gi inputs from real turn/historical status and Qr query. */
  latestActivityRetentionInput?: SourceLatestActivityRetentionInput;
  isActiveAeonTurn?: boolean;
  footerStatus?: string | null;
  showReadReceipts?: boolean;
  reserveThinkingStatusSpace?: boolean;
  useCompactTyping?: boolean;
  showThinkingStatus?: boolean;
  thinkingStatusIsVisible?: boolean;
  includeTurnExtras?: boolean;
  showInProgressFixedContent?: boolean;
  todoListItem?: ConversationMessageItem | null;
  unifiedDiffItem?: ConversationMessageItem | null;
  hasBlockingRequest?: boolean;
  /** Whether a first-response marker has been provided by the host. */
  hasFirstResponseBoundary?: boolean;
}

export interface ConversationMessagePlanDependencies {
  /** The compiled `hn` partitions activity blocks into activity/results. */
  partitionActivities(items: ConversationMessageItem[], context: {isAeonThread:boolean;hostId:string|undefined}): ConversationActivityPart[];
  /** A private external-surface / automation result predicate. */
  getSpecialActivityResult(item: ConversationMessageItem): unknown | null;
  /** Private `as` predicate for activity that is not a reasoning-only update. */
  hasPersistentActivity(item: ConversationMessageItem): boolean;
  /** The rendered activity grouping may omit items with no visible content. */
  hasRenderableActivity?(items: ConversationMessageItem[]): boolean;
  /** Private `Wa([item])` conversion decides between activity units and full item renderer. */
  shouldRenderActivityAsUnit?(item: ConversationMessageItem): boolean;
}

export function isConversationMessageBlock(value: unknown): value is ConversationTranscriptBlock {
  if (value == null || typeof value !== "object") return false;
  const block = value as Record<string, unknown>;
  if (typeof block.key !== "string") return false;
  switch (block.type) {
    case "user-message":
    case "assistant-message":
    case "activity-item":
      return block.item != null && typeof block.item === "object";
    case "agent-activity":
    case "generated-images":
      return Array.isArray(block.items);
    default:
      return false;
  }
}

/** The reference takes the last assistant message key, not the last block key. */
export function getLastAssistantBlockKey(blocks: readonly ConversationTranscriptBlock[]): string | null {
  let last: string | null = null;
  for (const block of blocks) if (block.type === "assistant-message") last = block.key;
  return last;
}

export function buildConversationMessageRenderPlan(
  blocks: readonly ConversationTranscriptBlock[],
  options: ConversationMessagePlanOptions,
  dependencies: ConversationMessagePlanDependencies,
): ConversationMessageRenderPlan {
  const nodes: ConversationMessageRenderNode[] = [];
  const lastAssistantKey = getLastAssistantBlockKey(blocks);
  let firstResponseBoundaryPending = options.hasFirstResponseBoundary === true;
  const hasFooter = options.footerStatus != null;
  const isAeon = options.isAeonThread === true;
  const latestRetention = options.latestActivityRetentionInput == null ? null
    : deriveSourceLatestActivityRetention(options.latestActivityRetentionInput);

  function pushNode(
    node: WithoutRenderBase<ConversationMessageRenderNode>,
    key: string,
    params: { canFollow?: boolean; response?: boolean } = {},
  ): void {
    const isResponseContent = params.response !== false;
    const ownsFirstResponseBoundary = isResponseContent && firstResponseBoundaryPending;
    if (ownsFirstResponseBoundary) firstResponseBoundaryPending = false;
    nodes.push({
      ...node,
      key,
      canOwnLatestTurnFollowContent: params.canFollow !== false,
      isResponseContent,
      ownsFirstResponseBoundary,
    } as ConversationMessageRenderNode);
  }

  for (const [blockIndex, block] of blocks.entries()) {
    switch (block.type) {
      case "agent-activity": {
        const active = options.isTurnInProgress &&
          (!isAeon || options.isActiveAeonTurn === true) &&
          !block.collapseWhenPossible &&
          options.footerStatus !== "sleeping" &&
          (!hasFooter || block.items.some(dependencies.hasPersistentActivity));
        const parts = dependencies.partitionActivities(block.items, {isAeonThread:isAeon,hostId:options.hostId});
        for (const [index, part] of parts.entries()) {
          const key = parts.length === 1 ? block.key : `${block.key}:${index}`;
          if (part.type === "result") {
            pushNode({ kind: "activity-result", result: part.result }, key, { canFollow: false });
            continue;
          }
          if (part.items == null || part.items.length === 0 ||
            dependencies.hasRenderableActivity?.(part.items) === false) continue;
          pushNode({
            kind: "activity-group", items: part.items,
            isActive: active,
            collapseWhenPossible: block.collapseWhenPossible === true,
            renderMode: options.renderMode ?? "all",
            allowLatestCompletedGroup: latestRetention,
            hasFollowingFinalAnswer: blocks.slice(blockIndex + 1).some(candidate =>
              candidate.type === "assistant-message" &&
              (candidate.item.phase === "final_answer" || candidate.item.phase == null)),
          }, key, { canFollow: false });
        }
        break;
      }
      case "activity-item": {
        const special = isAeon && block.item.type === "mcp-tool-call"
          ? dependencies.getSpecialActivityResult(block.item) : null;
        if (special != null) {
          pushNode({ kind: "activity-result", result: special }, block.key);
          break;
        }
        pushNode({
          kind: "activity-item",
          item: block.item,
          isActive: options.isTurnInProgress && (!isAeon || options.isActiveAeonTurn === true),
          presentation: block.item.type === "subagent-activity" && block.item.isMessage !== true
            ? "subagent" : dependencies.shouldRenderActivityAsUnit?.(block.item) === true
              ? "activity-units" : "ordinary",
        }, block.key);
        break;
      }
      case "user-message":
        pushNode({
          kind: "user-message",
          item: block.item,
          isFirstUserMessage: block.isFirstUserMessage === true,
          isLastUserMessage: block.isLastUserMessage === true,
          showReadReceipt: options.showReadReceipts === true && block.readReceipt != null,
          readReceipt: block.readReceipt,
        }, block.key, { canFollow: false, response: false });
        break;
      case "assistant-message":
        pushNode({
          kind: "assistant-message",
          item: block.item,
          attachedActivityItems: block.attachedActivityItems,
          assistantCopyText: block.item.completed && typeof block.item.content === "string"
            ? block.item.content.trim() : undefined,
          isLastAssistantMessage: block.key === lastAssistantKey,
        }, block.key);
        break;
      case "generated-images": {
        const images = block.items.filter((item) => item.src != null);
        if (images.length > 0) pushNode({ kind: "generated-images", images }, block.key);
        break;
      }
    }
  }

  const includeExtras = options.includeTurnExtras !== false;
  const wantsThinking = includeExtras && options.showThinkingStatus === true && !hasFooter;
  if (includeExtras && options.reserveThinkingStatusSpace && !hasFooter) {
    const compact = options.useCompactTyping === true;
    pushNode({
      kind: compact ? "typing-status-slot" : "thinking-status-slot",
      showThinking: wantsThinking,
      isVisible: options.thinkingStatusIsVisible === true,
    }, compact ? "typing-status-slot" : "thinking-status-slot", {
      canFollow: compact || wantsThinking,
      response: !compact && wantsThinking,
    });
  } else if (wantsThinking) {
    pushNode({
      kind: "thinking-placeholder",
      showThinking: true,
      isVisible: options.thinkingStatusIsVisible === true,
    }, "thinking-placeholder");
  }
  if (includeExtras && options.isTurnInProgress && options.showInProgressFixedContent) {
    pushNode({ kind: "in-progress-fixed-content", todoListItem: options.todoListItem, unifiedDiffItem: options.unifiedDiffItem, hasBlockingRequest: options.hasBlockingRequest === true }, "in-progress-fixed-content", {
      canFollow: false,
      response: options.useCompactTyping !== true,
    });
  }

  let footerNodeIndex = -1;
  if (nodes.length > 0) {
    footerNodeIndex = nodes.length - 1;
    for (let index = nodes.length - 1; index >= 0; index -= 1) {
      if (nodes[index]?.canOwnLatestTurnFollowContent) {
        footerNodeIndex = index;
        break;
      }
    }
  }
  const gapBeforeNodeIndexes: number[] = [];
  const followContentNodeIndexes: number[] = [];
  for (let index = 0; index < nodes.length; index += 1) {
    if (index > 0 && nodes[index]?.key !== "typing-status-slot") gapBeforeNodeIndexes.push(index);
    if (nodes[index]?.canOwnLatestTurnFollowContent) followContentNodeIndexes.push(index);
  }
  return { nodes, footerNodeIndex, gapBeforeNodeIndexes, followContentNodeIndexes };
}
