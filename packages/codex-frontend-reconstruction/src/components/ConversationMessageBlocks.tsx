import * as React from "react";
import {
  buildConversationMessageRenderPlan,
  isConversationMessageBlock,
  type ConversationMessageItem,
  type ConversationMessagePlanDependencies,
  type ConversationMessagePlanOptions,
  type ConversationMessageRenderNode,
  type ConversationTranscriptBlock,
} from "../conversation/ConversationMessageRenderPlan.js";
import type { ConversationRenderEntry } from "../conversation/ConversationRenderEntriesModel.js";
import type { VirtualizedTurnRowProps } from "./VirtualizedTurnList.js";
import type { SourceTurnRuntimeStatusSource, SourceTurnRuntimeStatusSnapshot } from "../conversation/SourceTurnRuntimeStatusSource.js";

export interface ConversationMessageRenderers {
  UserMessage: React.ComponentType<{
    item: ConversationMessageItem;
    isFirstUserMessage: boolean;
    isLastUserMessage: boolean;
    showReadReceipt: boolean;
    readReceipt?: unknown;
  }>;
  AssistantMessage: React.ComponentType<{
    item: ConversationMessageItem;
    isLastAssistantMessage: boolean;
    assistantCopyText?: string | undefined;
    attachedActivityItems?: unknown[] | undefined;
  }>;
  ActivityGroup: React.ComponentType<{
    items: ConversationMessageItem[];
    isActive: boolean;
    collapseWhenPossible: boolean;
    renderMode: "latest" | "all";
    hasFollowingFinalAnswer: boolean;
    allowLatestCompletedGroup?: boolean | null;
    activityStateKey: string;
  }>;
  ActivityItem: React.ComponentType<{
    item: ConversationMessageItem;
    isActive: boolean;
    presentation: "ordinary" | "subagent" | "activity-units";
  }>;
  ActivityResult: React.ComponentType<{ result: unknown }>;
  GeneratedImages: React.ComponentType<{ images: Array<Record<string, unknown>> }>;
  ThinkingStatus: React.ComponentType<{
    variant: "thinking-placeholder" | "thinking-status-slot" | "typing-status-slot";
    isVisible: boolean;
    showThinking: boolean;
  }>;
  InProgressFixedContent: React.ComponentType<{ todoListItem?: ConversationMessageItem | null | undefined; unifiedDiffItem?: ConversationMessageItem | null | undefined; hasBlockingRequest: boolean; }>;
  ConversationGap: React.ComponentType<Record<string, never>>;
  FirstResponseBoundary?: React.ComponentType<Record<string, never>> | undefined;
}

export interface ConversationMessageBlocksProps {
  blocks: readonly ConversationTranscriptBlock[];
  /** Host- and turn-scoped identity for Rk collapse state across virtual row remounts. */
  activityStateScope?: string;
  options: ConversationMessagePlanOptions;
  dependencies: ConversationMessagePlanDependencies;
  renderers: ConversationMessageRenderers;
  latestTurnFooter?: React.ReactNode | undefined;
  latestTurnFollowContentRef?: React.Ref<HTMLDivElement> | undefined;
}

const WRAPPER_CLASS = "flex flex-col gap-0 [contain-intrinsic-size:auto_240px] [content-visibility:auto] [&:has([data-mcp-app-expanded='true'])]:[content-visibility:visible]";

/**
 * Reconstructs the compiled `rs` message dispatch and `ls` DOM wrapper.
 * All Codex-specific Markdown/design-system/tool UIs are caller-provided.
 */
export function ConversationMessageBlocks(props: ConversationMessageBlocksProps) {
  const { blocks, options, dependencies, renderers, latestTurnFooter, latestTurnFollowContentRef, activityStateScope } = props;
  const plan = React.useMemo(
    () => buildConversationMessageRenderPlan(blocks, options, dependencies),
    [blocks, options, dependencies],
  );

  function renderNode(node: ConversationMessageRenderNode): React.ReactNode {
    switch (node.kind) {
      case "user-message":
        return <renderers.UserMessage item={node.item} isFirstUserMessage={node.isFirstUserMessage}
          isLastUserMessage={node.isLastUserMessage} showReadReceipt={node.showReadReceipt}
          readReceipt={node.readReceipt} />;
      case "assistant-message":
        return <renderers.AssistantMessage item={node.item} isLastAssistantMessage={node.isLastAssistantMessage}
          assistantCopyText={node.assistantCopyText} attachedActivityItems={node.attachedActivityItems} />;
      case "activity-group":
        return <renderers.ActivityGroup items={node.items} isActive={node.isActive}
          collapseWhenPossible={node.collapseWhenPossible} renderMode={node.renderMode}
          hasFollowingFinalAnswer={node.hasFollowingFinalAnswer}
          allowLatestCompletedGroup={node.allowLatestCompletedGroup}
          activityStateKey={JSON.stringify([activityStateScope ?? "host", node.key])} />;
      case "activity-item":
        return <renderers.ActivityItem item={node.item} isActive={node.isActive}
          presentation={node.presentation} />;
      case "activity-result":
        return <renderers.ActivityResult result={node.result} />;
      case "generated-images":
        return <renderers.GeneratedImages images={node.images} />;
      case "thinking-placeholder":
      case "thinking-status-slot":
      case "typing-status-slot":
        return <renderers.ThinkingStatus variant={node.kind} isVisible={node.isVisible}
          showThinking={node.showThinking} />;
      case "in-progress-fixed-content":
        return <renderers.InProgressFixedContent todoListItem={node.todoListItem} unifiedDiffItem={node.unifiedDiffItem} hasBlockingRequest={node.hasBlockingRequest} />;
    }
  }

  function nodeContent(node: ConversationMessageRenderNode): React.ReactNode {
    return <>
      {node.ownsFirstResponseBoundary && renderers.FirstResponseBoundary != null
        ? <renderers.FirstResponseBoundary /> : null}
      {renderNode(node)}
    </>;
  }

  if (plan.nodes.length === 0 && latestTurnFooter == null) return null;
  if (plan.nodes.length <= 1) {
    const node = plan.nodes[0];
    return <div
      ref={node == null || node.canOwnLatestTurnFollowContent ? latestTurnFollowContentRef : undefined}
      className={WRAPPER_CLASS} data-virtualized-turn-content="">
      {node == null ? null : nodeContent(node)}
      {latestTurnFooter}
    </div>;
  }

  const gaps = new Set(plan.gapBeforeNodeIndexes);
  return <div className="flex flex-col gap-0">
    {plan.nodes.map((node, index) => <React.Fragment key={node.key}>
      {gaps.has(index) ? <renderers.ConversationGap /> : null}
      <div ref={node.canOwnLatestTurnFollowContent ? latestTurnFollowContentRef : undefined}
        className="flex flex-col">
        {nodeContent(node)}
        {index === plan.footerNodeIndex ? latestTurnFooter : null}
      </div>
    </React.Fragment>)}
  </div>;
}

export interface ConversationLiveRowAdapters {
  /** Codex's private transcript-block producer; the caller must supply it. */
  getBlocks?(entry: ConversationRenderEntry): readonly ConversationTranscriptBlock[];
  getPlanOptions(entry: ConversationRenderEntry): ConversationMessagePlanOptions;
  /** Optional qn/Qr observable turn state, bound to canonical turn identity.
   * No status model may initiate a host query during React render. */
  getTurnRuntimeSource?(entry: ConversationRenderEntry): SourceTurnRuntimeStatusSource | null;
  dependencies: ConversationMessagePlanDependencies;
  renderers: ConversationMessageRenderers;
}

const noTurnRuntimeSubscription=()=>()=>{};
const noTurnRuntimeSnapshot=()=>null as SourceTurnRuntimeStatusSnapshot|null;

/** Plug this into LiveConversationTranscript.RowComponent without guessing host selectors. */
export function createConversationLiveRow(adapters: ConversationLiveRowAdapters) {
  type RowEntry = ConversationRenderEntry & { turnKey: string };
  return function ConversationLiveRow({ entry, latestTurnFooter, latestTurnFollowContentRef }: VirtualizedTurnRowProps<RowEntry>) {
    const blocks = adapters.getBlocks?.(entry) ?? getDirectTranscriptBlock(entry);
    const turnRuntime = adapters.getTurnRuntimeSource?.(entry) ?? null;
    // qn/Qr callbacks can publish without a parent conversation snapshot.
    // React must subscribe to the stable source rather than render stale Gi.
    const turnStatus = React.useSyncExternalStore(
      turnRuntime?.subscribe ?? noTurnRuntimeSubscription,
      turnRuntime?.getSnapshot ?? noTurnRuntimeSnapshot,
      turnRuntime?.getSnapshot ?? noTurnRuntimeSnapshot,
    );
    const baseOptions=adapters.getPlanOptions(entry);
    const options=turnStatus==null ? baseOptions : {
      ...baseOptions,
      isTurnInProgress:turnStatus.isTurnInProgress,
      latestActivityRetentionInput:turnStatus.latestActivityRetentionInput,
    };
    return <ConversationMessageBlocks
      blocks={blocks}
      activityStateScope={JSON.stringify([entry.conversationId ?? "host-conversation", entry.turnKey])}
      options={options}
      dependencies={adapters.dependencies}
      renderers={adapters.renderers}
      latestTurnFooter={latestTurnFooter}
      latestTurnFollowContentRef={latestTurnFollowContentRef}
    />;
  };
}

/** Accepts recovered single-block rows without fabricating multi-turn projection. */
export function getDirectTranscriptBlock(entry: ConversationRenderEntry): readonly ConversationTranscriptBlock[] {
  return isConversationMessageBlock(entry.transcriptBlock) ? [entry.transcriptBlock] : [];
}
