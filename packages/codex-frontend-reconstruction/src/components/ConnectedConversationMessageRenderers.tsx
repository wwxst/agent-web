import * as React from "react";
import type { ConversationMessageItem } from "../conversation/ConversationMessageRenderPlan.js";
import type { AgentActivityUnit, AgentActivityCollapseOptions } from "../conversation/AgentActivityProjection.js";
import { CodexAgentActivity } from "./CodexAgentActivity.js";
import { CodexActivityGroupRow } from "./CodexActivityGroupRow.js";
import { CodexToolActivityItem } from "./CodexToolActivityItem.js";
import { ConnectedCodexToolActivityItem } from "./ConnectedCodexToolActivityItem.js";
import type { ToolActivityHistorySource } from "../conversation/ToolActivityHistorySource.js";
import type { ToolDetailContext, ToolProjection } from "../conversation/ToolActivityDetailModel.js";
import {
  hydrateToolActivityItemFromHistory,
  type ToolActivityHistoryHydrationInput,
} from "../conversation/ToolActivityHistoryHydrationModel.js";
import {
  renderCodexToolActivityLeaf,
  type ToolActivityLeafAdapters,
  type ToolActivityLeafContext,
} from "./CodexToolActivityLeafRenderer.js";
import { projectActivityGroupHeader, shouldDemoteCompletedSingleGroup,
  type ActivityHeaderMessage, type ActivityGroupHeaderState,
} from "../conversation/AgentActivityGroupPresentation.js";
import {
  projectConversationContent,
  restrictConversationReviewPermissions,
  type ConversationContentAdapters,
  type ConversationFileReviewData,
} from "../conversation/ConversationPresentationAdapterModel.js";
import type { InlineFileReviewAction, InlineReviewFile } from "../conversation/InlineFileReviewModel.js";
import type { AutomaticApprovalReviewSummary } from "../conversation/ActivityStatusPresentation.js";
import { ActivityStatusLabel, AutomaticApprovalReviewList, type ActivityStatusTranslation } from "./ActivityStatusViews.js";
import { InlineFileReview } from "./InlineFileReview.js";
import type { ConversationMessageRenderers } from "./ConversationMessageBlocks.js";

/**
 * Concrete leaf composition for the recovered conversation dispatcher.
 * Codex's private Markdown engine, activity details, FileDiff engine, image
 * viewer and design-system controls remain REQUIRED host-owned renderers.
 * This module connects existing recovered components without fabricating
 * those missing subsystems or granting permission on the host's behalf.
 */
export interface ConnectedConversationRendererHost extends ConversationContentAdapters {
  Markdown: React.ComponentType<{ text: string; role: "user" | "assistant" | "activity" }>;
  /** The private Wa unit factory and turn-level Rk state must be host-provided.
   * Without them, preserve the existing ActivityGroup layout unchanged. */
  agentActivity?: {
    /** Host-owned collapse state; null means Rk's source-observed local fallback. */
    collapseState?: {
      subscribe(listener: () => void): () => void;
      getSnapshot(key: string): boolean | null;
      setCollapsed(key: string, collapsed: boolean): void;
    };
    toUnits(items: ConversationMessageItem[]): AgentActivityUnit<ConversationMessageItem>[];
    getCollapseContext(context: { isActive: boolean; collapseWhenPossible: boolean; renderMode: "latest" | "all"; hasFollowingFinalAnswer: boolean; activityStateKey: string }):
      Omit<AgentActivityCollapseOptions<ConversationMessageItem>, "units">;
    renderSummary?(count: number, workedForItem: ConversationMessageItem | null): React.ReactNode;
    /** Original nk/ak group header; We/Sg, mk/rk and icon metadata remain host-owned. */
    groupHeader?: {
      getStateContext(context: {items: readonly ConversationMessageItem[]; isActive: boolean;
        isLatestVisibleUnit: boolean; isActivitySliceClosed: boolean}): {
        isLatestVisibleUnit: boolean;
        isHeaderInProgress: boolean;
        isActivitySliceClosed: boolean;
        isExploring: boolean;
      };
      canExpand(items: readonly ConversationMessageItem[]): boolean;
      /** Original nk passes mk-filtered H to details, retaining full items for We. */
      getVisibleItems?(items: readonly ConversationMessageItem[]): readonly ConversationMessageItem[];
      renderCompletedSummary(items: readonly ConversationMessageItem[]): React.ReactNode;
      translateMessage(message: ActivityHeaderMessage): React.ReactNode;
      renderHostActiveLabel?(item: ConversationMessageItem): React.ReactNode;
      renderIcon?(state: ActivityGroupHeaderState<ConversationMessageItem>): React.ReactNode;
      conversationDetailLevel?: string;
      formatWebSearch?: (action: string | undefined, query: string | undefined) => string;
    };
  };

  /** Optional source fk/SO dispatcher. Absent in old hosts: preserve old behavior.
   * Host supplies private NO/Gf/cc predicates and real xC/PT/Fh leaf renderers. */
  toolActivity?: {
    getContext(item: ConversationMessageItem, isActive: boolean): ToolDetailContext;
    /** Host resolves the query plan against the actual history store. */
    getHistoryHydration?: (item: ConversationMessageItem, isActive: boolean) =>
      ToolActivityHistoryHydrationInput | null | undefined;
    /** Stable per-item source registry; host owns source creation, updates and disposal. */
    getHistorySource?: (item: ConversationMessageItem, isActive: boolean) =>
      ToolActivityHistorySource | null | undefined;
    /** xC/PT visuals remain host components with source-shaped props. */
    getLeafContext?: (item: ConversationMessageItem, isActive: boolean) =>
      ToolActivityLeafContext | null | undefined;
    leafAdapters?: ToolActivityLeafAdapters;
    standaloneActivityContentByItemId?: ReadonlyMap<string, React.ReactNode>;
    wrapSearchableContent?: (item: ConversationMessageItem, content: React.ReactNode) => React.ReactNode;
    renderLeaf?: (item: ConversationMessageItem, projection: Exclude<ToolProjection, {kind:"hidden"}>,
      assistantCopyText: string | null | undefined,
      context: {isActive:boolean;presentation:"ordinary"|"subagent"|"activity-units"}) => React.ReactNode | undefined;
  };
  ActivityDetails: React.ComponentType<{ item: ConversationMessageItem; isActive: boolean; presentation: "ordinary" | "subagent" | "activity-units" }>;
  ActivityResult: ConversationMessageRenderers["ActivityResult"];
  GeneratedImages: ConversationMessageRenderers["GeneratedImages"];
  ThinkingStatus: ConversationMessageRenderers["ThinkingStatus"];
  InProgressFixedContent: ConversationMessageRenderers["InProgressFixedContent"];
  ConversationGap: ConversationMessageRenderers["ConversationGap"];
  FirstResponseBoundary?: ConversationMessageRenderers["FirstResponseBoundary"];
  /** The real Full FileDiff visual engine; absence leaves the original placeholder area. */
  FileDiff?: React.ComponentType<{
    oldFile: InlineReviewFile;
    newFile: InlineReviewFile;
    overflow: "wrap" | "scroll";
    onViewportReady?: ((element: HTMLElement) => void) | undefined;
  }>;
  onFileReviewAction: (item: ConversationMessageItem, action: InlineFileReviewAction) => void;
  translator: ActivityStatusTranslation;
  getApprovalReviewSummary: (review: AutomaticApprovalReviewSummary) => React.ReactNode;
  getApprovalReviewDetails: (review: AutomaticApprovalReviewSummary) => React.ReactNode;
  /** Host may inject read-receipt, attachments and copy controls. */
  UserMessageExtras?: React.ComponentType<{
    item: ConversationMessageItem;
    isFirstUserMessage: boolean;
    isLastUserMessage: boolean;
    showReadReceipt: boolean;
    readReceipt?: unknown;
  }>;
  AssistantMessageExtras?: React.ComponentType<{
    item: ConversationMessageItem;
    isLastAssistantMessage: boolean;
    assistantCopyText?: string | undefined;
    attachedActivityItems?: unknown[] | undefined;
  }>;
}

export function createConnectedConversationMessageRenderers(host: ConnectedConversationRendererHost): ConversationMessageRenderers {
  function ActivityContent({ item, isActive, presentation }: {
    item: ConversationMessageItem;
    isActive: boolean;
    presentation: "ordinary" | "subagent" | "activity-units";
  }) {
    const detailHost = host.toolActivity;
    // fk resolves standalone subagent/image content before history lookup.
    if ((item.type === "subagent-activity" || item.type === "generated-image") &&
        typeof item.id === "string") {
      const override = detailHost?.standaloneActivityContentByItemId?.get(item.id);
      if (override != null) return override;
    }

    const renderProjectedActivity = (target: ConversationMessageItem): React.ReactNode => {
      const projection = projectConversationContent(target, host, "activity");
      if (projection.kind === "file-review") {
        const review: ConversationFileReviewData = restrictConversationReviewPermissions(projection.review);
        return <InlineFileReview oldFile={review.oldFile} newFile={review.newFile}
          compact={review.compact} canEdit={review.canEdit} canAccept={review.canAccept}
          onAction={(action) => host.onFileReviewAction(target, action)} Diff={host.FileDiff} />;
      }
      if (projection.kind === "approval-reviews") {
        return <AutomaticApprovalReviewList reviews={projection.approval.reviews}
          isDeclined={projection.approval.isDeclined} isExpandable={projection.approval.isExpandable}
          translator={host.translator}
          getReviewSummary={host.getApprovalReviewSummary}
          getReviewDetails={host.getApprovalReviewDetails} />;
      }
      if (projection.kind === "markdown") return <host.Markdown text={projection.text} role="activity" />;
      return <host.ActivityDetails item={target} isActive={isActive} presentation={presentation} />;
    };

    if (detailHost == null) return renderProjectedActivity(item);

    const renderLeaf = (
      leafItem: import("../conversation/ToolActivityDetailModel.js").ToolItem,
      leafProjection: Exclude<ToolProjection, {kind:"hidden"}>,
      assistantCopyText: string | null | undefined,
    ): React.ReactNode => {
      const conversationItem = leafItem as ConversationMessageItem;
      const leafContext = detailHost.getLeafContext?.(conversationItem, isActive);
      const custom = detailHost.renderLeaf?.(conversationItem, leafProjection, assistantCopyText,
        {isActive, presentation});
      if (custom !== undefined) return custom;
      if (leafContext != null) {
        const sourceLeaf = renderCodexToolActivityLeaf(leafItem, leafProjection,
          detailHost.leafAdapters ?? {}, leafContext);
        if (sourceLeaf !== undefined) return sourceLeaf;
      }
      return renderProjectedActivity(conversationItem);
    };

    // A source-backed row subscribes to Au/Vd-derived host data with
    // useSyncExternalStore. The host registry must return a stable source for
    // this item; the legacy resolved-value path remains available to old hosts.
    const historySource = detailHost.getHistorySource?.(item, isActive) ?? null;
    if (historySource != null) {
      return <ConnectedCodexToolActivityItem source={historySource}
        context={detailHost.getContext(item, isActive)}
        standaloneActivityContentByItemId={detailHost.standaloneActivityContentByItemId}
        wrapSearchableContent={detailHost.wrapSearchableContent}
        renderLeaf={renderLeaf} />;
    }

    const hydrationInput = detailHost.getHistoryHydration?.(item, isActive) ?? null;
    const hydration = hydrationInput == null ? null : hydrateToolActivityItemFromHistory(
      item, hydrationInput.historyEntity, hydrationInput.assistantMessagePresence,
      hydrationInput.context, hydrationInput.dependencies,
    );
    if (hydration?.item === null) return null;
    const activeItem = (hydration?.item ?? item) as ConversationMessageItem;

    return <CodexToolActivityItem item={activeItem} context={detailHost.getContext(activeItem, isActive)}
      assistantCopyText={hydration?.assistantCopyText}
      standaloneActivityContentByItemId={detailHost.standaloneActivityContentByItemId}
      wrapSearchableContent={detailHost.wrapSearchableContent}
      renderLeaf={renderLeaf} />;
  }
  return {
    UserMessage(props) {
      const content = projectConversationContent(props.item, host, "message");
      return <div data-conversation-message="user" className="flex flex-col gap-2">
        {content.kind === "markdown" ? <host.Markdown text={content.text} role="user" />
          : <host.ActivityDetails item={props.item} isActive={false} presentation="ordinary" />}
        {host.UserMessageExtras ? <host.UserMessageExtras {...props} /> : null}
      </div>;
    },
    AssistantMessage(props) {
      const content = projectConversationContent(props.item, host, "message");
      return <div data-conversation-message="assistant" className="flex flex-col gap-2">
        {content.kind === "markdown" ? <host.Markdown text={content.text} role="assistant" />
          : <host.ActivityDetails item={props.item} isActive={false} presentation="ordinary" />}
        {host.AssistantMessageExtras ? <host.AssistantMessageExtras {...props} /> : null}
      </div>;
    },
    ActivityGroup(props) {
      const grouping = host.agentActivity;
      if (grouping == null) return <div data-conversation-activity-group="" className="flex flex-col gap-2">
        {props.items.map((item, index) => <div key={item.id ?? `${item.type}:${index}`}>
          <ActivityContent item={item} isActive={props.isActive} presentation="ordinary" />
        </div>)}
      </div>;
      const units = grouping.toUnits(props.items);
      const context = grouping.getCollapseContext(props);
      const groupHeader = grouping.groupHeader;
      // The source Rk contract accepts controlled collapse state from the turn
      // host; useSyncExternalStore preserves it after virtualization unmounts.
      const collapseStore = grouping.collapseState;
      const controlledCollapsed = React.useSyncExternalStore(
        collapseStore?.subscribe ?? (() => () => {}),
        () => collapseStore?.getSnapshot(props.activityStateKey) ?? null,
        () => collapseStore?.getSnapshot(props.activityStateKey) ?? null,
      );
      const renderUnit = (unit: (typeof units)[number]) => {
          if (unit.kind === "standalone") return <ActivityContent item={unit.item} isActive={props.isActive} presentation="ordinary" />;
          const stateContext = groupHeader?.getStateContext({
            items: unit.items, isActive: props.isActive,
            isLatestVisibleUnit: units[units.length - 1]?.key === unit.key,
            isActivitySliceClosed: props.collapseWhenPossible,
          });
          if (groupHeader == null || stateContext == null) return unit.items.map((item, index) =>
            <div key={item.id ?? `${item.type}:${index}`}><ActivityContent item={item} isActive={props.isActive} presentation="ordinary" /></div>);
          const state = projectActivityGroupHeader({items: unit.items, ...stateContext});
          if (shouldDemoteCompletedSingleGroup(unit.items, state)) return unit.items.map((item,index) =>
            <div key={item.id ?? `${item.type}:${index}`}><ActivityContent item={item} isActive={props.isActive} presentation="ordinary" /></div>);
          return <CodexActivityGroupRow
            items={unit.items} detailItems={groupHeader.getVisibleItems?.(unit.items)} {...stateContext}
            canExpand={groupHeader.canExpand(unit.items)}
            renderCompletedSummary={groupHeader.renderCompletedSummary}
            translateMessage={groupHeader.translateMessage}
            renderHostActiveLabel={groupHeader.renderHostActiveLabel}
            renderIcon={groupHeader.renderIcon}
            conversationDetailLevel={groupHeader.conversationDetailLevel}
            formatWebSearch={groupHeader.formatWebSearch}
            renderRow={(item) => <ActivityContent item={item} isActive={props.isActive} presentation="ordinary" />}
          />;
        };
      // Source local-conversation-turn branches on n: latest mounts ga/ek
      // directly; historical 'all' uses Rk for prior-turn disclosure.
      if (props.renderMode === "latest") {
        return <div data-codex-current-turn-activity="" className="flex flex-col">
          {units.map(unit => <React.Fragment key={unit.key}>{renderUnit(unit)}</React.Fragment>)}
        </div>;
      }
      return <CodexAgentActivity {...context} units={units} renderSummary={grouping.renderSummary}
        persistedCollapsed={collapseStore == null ? undefined : controlledCollapsed}
        onSetCollapsed={collapseStore == null ? undefined :
          (next) => collapseStore.setCollapsed(props.activityStateKey, next)}
        renderUnit={renderUnit} />;
    },
    ActivityItem(props) {
      return <div data-conversation-activity-item="">
        <ActivityStatusLabel heading={typeof props.item.heading === "string" ? props.item.heading : null}
          state={typeof props.item.state === "string" ? props.item.state : null}
          translator={host.translator} />
        <ActivityContent item={props.item} isActive={props.isActive} presentation={props.presentation} />
      </div>;
    },
    ActivityResult: host.ActivityResult,
    GeneratedImages: host.GeneratedImages,
    ThinkingStatus: host.ThinkingStatus,
    InProgressFixedContent: host.InProgressFixedContent,
    ConversationGap: host.ConversationGap,
    FirstResponseBoundary: host.FirstResponseBoundary,
  };
}
