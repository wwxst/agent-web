import * as React from "react";
import type { ConversationMessageItem } from "../conversation/ConversationMessageRenderPlan.js";
import type { AgentActivityUnit, AgentActivityCollapseOptions } from "../conversation/AgentActivityProjection.js";
import { CodexAgentActivity } from "./CodexAgentActivity.js";
import { CodexSourceCollapsibleUserMessage } from "./CodexSourceCollapsibleUserMessage.js";
import { combineSourceActivityTrace } from "../conversation/SourceCombinedActivityTrace.js";
import { filterSourceLatestActivityUnits } from "../conversation/SourceLatestActivityVisibility.js";
import type { SourceRepeatedActivityRow } from "../conversation/SourceRepeatedActivityGroups.js";
import type { SourceRepeatedHeader, SourceRecognizedMcpAction } from "../conversation/SourceRepeatedActivityHeader.js";
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
import type { SourceInlineReviewWrapPreference } from "../conversation/SourceInlineReviewWrapPreference.js";
import type { AutomaticApprovalReviewSummary } from "../conversation/ActivityStatusPresentation.js";
import { ActivityStatusLabel, AutomaticApprovalReviewList, type ActivityStatusTranslation } from "./ActivityStatusViews.js";
import { InlineFileReview } from "./InlineFileReview.js";
import { SourceMcpApprovalRequestCard } from "./SourceMcpApprovalRequestCard.js";
import {SourceComputerUseApprovalRequestCard} from "./SourceComputerUseApprovalRequestCard.js";
import {SourceBrowserWebsiteApprovalCard} from "./SourceBrowserWebsiteApprovalCard.js";
import {SourceUrlActionRequestCard} from "./SourceUrlActionRequestCard.js";
import {SourceToolSuggestionRequestCard} from "./SourceToolSuggestionRequestCard.js";
import {SourceUserVerificationCard} from "./SourceUserVerificationCard.js";
import {SourceUnsupportedOpenAIFormCard} from "./SourceUnsupportedOpenAIFormCard.js";
import {SourceTextFormElicitationCard} from "./SourceTextFormElicitationCard.js";
import type {
 SourceTextFormRequest,SourceTextFormReplyTransport,
} from "../conversation/SourceTextFormElicitationModel.js";
import type {SourceTextFormDraft}
 from "../conversation/SourceTextFormDraftStore.js";
import type {
 SourceUnsupportedOpenAIFormRequest,SourceUnsupportedOpenAIFormReplyTransport,
} from "../conversation/SourceUnsupportedOpenAIFormModel.js";
import type {
 SourceUserVerificationRequest,SourceUserVerificationCancelTransport,
} from "../conversation/SourceUserVerificationModel.js";
import type {
 SourceToolSuggestionRequest,SourceToolSuggestionStart,SourceToolSuggestionCheckReady,
} from "../conversation/SourceToolSuggestionRequestModel.js";
import type {SourceUrlActionRequest} from "../conversation/SourceUrlActionRequestModel.js";
import type {SourceBrowserWebsiteApprovalRequest} from "../conversation/SourceBrowserWebsiteApprovalModel.js";
import type {
  SourceComputerUseApprovalRequest, SourceComputerUseReplyTransport,
} from "../conversation/SourceComputerUseApprovalModel.js";
import type {
  SourceMcpApprovalRequest, SourceMcpApprovalReplyTransport,
} from "../conversation/SourceMcpApprovalRequestModel.js";
import type { ConversationMessageRenderers } from "./ConversationMessageBlocks.js";

/**
 * Concrete leaf composition for the recovered conversation dispatcher.
 * Codex's private Markdown engine, activity details, FileDiff engine, image
 * viewer and design-system controls remain REQUIRED host-owned renderers.
 * This module connects existing recovered components without fabricating
 * those missing subsystems or granting permission on the host's behalf.
 */
export interface ConnectedConversationRendererHost extends ConversationContentAdapters {
  Markdown: React.ComponentType<{ text: string; role: "user" | "assistant" | "activity"; isStreaming?:boolean }>;
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
    /** Original ek: combine into an ok trace only with an explicit host key. */
    getCombinedUnitKey?(items: readonly ConversationMessageItem[]): string | null | undefined;
    /** Original qe's Gi flag must be evaluated by the real turn host.
     * null = unresolved: retain existing UI without guessing Gi. */
    allowLatestCompletedGroup?(context: {items: readonly ConversationMessageItem[];
      isActive:boolean;collapseWhenPossible:boolean;hasFollowingFinalAnswer:boolean;}): boolean | null;
    getCollapseContext(context: { isActive: boolean; collapseWhenPossible: boolean; renderMode: "latest" | "all"; hasFollowingFinalAnswer: boolean; activityStateKey: string }):
      Omit<AgentActivityCollapseOptions<ConversationMessageItem>, "units">;
    renderSummary?(count: number, workedForItem: ConversationMessageItem | null): React.ReactNode;
    /** Source SG is selected by Rk after kk extracts a worked-for item. */
    renderWorkedFor?(item: ConversationMessageItem): React.ReactNode;
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
      /** Original Je/bg group consecutive completed compatible MCP and events. */
      getRepeatedRows?(items:readonly ConversationMessageItem[]): readonly SourceRepeatedActivityRow<ConversationMessageItem>[];
      renderRepeatedSummary?(row:SourceRepeatedActivityRow<ConversationMessageItem>): React.ReactNode;
      getRecognizedRepeatedAction?(item:ConversationMessageItem):SourceRecognizedMcpAction | null | undefined;
      renderRepeatedHeader?(header:SourceRepeatedHeader<ConversationMessageItem>): {summary:React.ReactNode;icon?:React.ReactNode} | undefined;
      /** Original XO/V_ icon slots resolved by mv/bv from real host metadata. */
      renderRepeatedIcon?(row:SourceRepeatedActivityRow<ConversationMessageItem>): React.ReactNode;
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
  /** Private app setting C must be supplied by the real session host. */
  inlineReviewWrapPreference?:SourceInlineReviewWrapPreference;
  onFileReviewAction: (item: ConversationMessageItem, action: InlineFileReviewAction) => void;
  /** Host is solely responsible for resolving real MCP pending request ids.
   * Absent callback = explicit readonly request, never simulated permission. */
  getMcpApprovalRequest?:(item:ConversationMessageItem)=>SourceMcpApprovalRequest|null;
  /** Original E shares the scoped MCP elicitation response transport,
   * but has distinct title/disclosure/persistence UI. */
  getComputerUseApprovalRequest?:(item:ConversationMessageItem)=>SourceComputerUseApprovalRequest|null;
  /** Original ft/Ge: the host projects verified Browser/Chrome website access requests. */
  getBrowserWebsiteApprovalRequest?:(item:ConversationMessageItem)=>SourceBrowserWebsiteApprovalRequest|null;
  /** Original at/urlAction dispatch; never infer pending requests from URLs in Markdown. */
  getUrlActionRequest?:(item:ConversationMessageItem)=>SourceUrlActionRequest|null;
  /** Native shell owns external HTTPS open; opening alone never replies or grants. */
  onUrlActionOpenExternal?:(url:string)=>Promise<boolean>;
  getUrlActionOpenInThread?:(item:ConversationMessageItem)=>(()=>void)|null;
  /** Original at.toolSuggestion -> inline-tool-suggestion-request-card J. */
  getToolSuggestionRequest?:(item:ConversationMessageItem)=>SourceToolSuggestionRequest|null;
  /** Original at.userVerification invokes Ke/ Re, not generic MCP ye. */
  getUserVerificationRequest?:(item:ConversationMessageItem)=>SourceUserVerificationRequest|null;
  /** Exact original at.unsupportedOpenAIForm -> request-panel bn. */
  getUnsupportedOpenAIFormRequest?:(item:ConversationMessageItem)=>SourceUnsupportedOpenAIFormRequest|null;
  /** Source ei formElicitation -> Yr/Wr/ur/wn text-only, other types remain pending. */
  getTextFormElicitationRequest?:(item:ConversationMessageItem)=>SourceTextFormRequest|null;
  onTextFormElicitationReply?:SourceTextFormReplyTransport;
  getTextFormDraft?:(request:SourceTextFormRequest)=>SourceTextFormDraft|null;
  onTextFormDraftChange?:(request:SourceTextFormRequest,draft:SourceTextFormDraft)=>void;
  /** Native-specific cancel / decline, not a generic MCP grant. */
  onUnsupportedOpenAIFormReply?:SourceUnsupportedOpenAIFormReplyTransport;
  /** Native cancel is separate from MCP accept/decline and never biometric approval. */
  onUserVerificationCancel?:SourceUserVerificationCancelTransport;
  /** Real host-owned install/enable + independently verified readiness ONLY. */
  onStartToolSuggestion?:SourceToolSuggestionStart;
  onCheckToolSuggestionReady?:SourceToolSuggestionCheckReady;
  /** Computer Use app authorization requires explicit independently verified host authority.
   * Never infer it from a generic MCP approval transport in a different request registry. */
  onComputerUseApprovalReply?:SourceComputerUseReplyTransport;
  onMcpApprovalReply?:SourceMcpApprovalReplyTransport;
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
      const textForm=host.getTextFormElicitationRequest?.(target)??null;
      if(textForm!=null)return <SourceTextFormElicitationCard
        key={JSON.stringify([textForm.hostId,textForm.conversationId,textForm.requestId])}
        request={textForm} onReply={host.onTextFormElicitationReply}
        initialDraft={host.getTextFormDraft?.(textForm)??null}
        onDraftChange={draft=>host.onTextFormDraftChange?.(textForm,draft)}/>;
      const unsupportedForm=host.getUnsupportedOpenAIFormRequest?.(target)??null;
      if(unsupportedForm!=null)return <SourceUnsupportedOpenAIFormCard
        key={JSON.stringify([unsupportedForm.hostId,unsupportedForm.conversationId,unsupportedForm.requestId])}
        request={unsupportedForm} onReply={host.onUnsupportedOpenAIFormReply}/>;
      const verification=host.getUserVerificationRequest?.(target)??null;
      if(verification!=null)return <SourceUserVerificationCard
        key={JSON.stringify([verification.hostId,verification.conversationId,verification.requestId])}
        request={verification} onCancel={host.onUserVerificationCancel}/>;
      const toolSuggestion=host.getToolSuggestionRequest?.(target)??null;
      if(toolSuggestion!=null)return <SourceToolSuggestionRequestCard
        key={JSON.stringify([toolSuggestion.hostId,toolSuggestion.conversationId,toolSuggestion.requestId])}
        request={toolSuggestion} onReply={host.onMcpApprovalReply}
        onStartSetup={host.onStartToolSuggestion}
        onCheckReady={host.onCheckToolSuggestionReady}/>;
      const urlAction=host.getUrlActionRequest?.(target)??null;
      if(urlAction!=null)return <SourceUrlActionRequestCard
        key={JSON.stringify([urlAction.hostId,urlAction.conversationId,urlAction.requestId])}
        request={urlAction} onReply={host.onMcpApprovalReply}
        onOpenExternal={host.onUrlActionOpenExternal}
        onOpenInThread={host.getUrlActionOpenInThread?.(target)??undefined}/>;
      const browserWebsiteApproval=host.getBrowserWebsiteApprovalRequest?.(target)??null;
      if(browserWebsiteApproval!=null)return <SourceBrowserWebsiteApprovalCard
        key={JSON.stringify([browserWebsiteApproval.hostId,browserWebsiteApproval.conversationId,browserWebsiteApproval.requestId])}
        request={browserWebsiteApproval} onReply={host.onMcpApprovalReply}/>;
      const computerUseApproval=host.getComputerUseApprovalRequest?.(target)??null;
      if(computerUseApproval!=null)return <SourceComputerUseApprovalRequestCard
        key={JSON.stringify([computerUseApproval.hostId,computerUseApproval.conversationId,computerUseApproval.requestId])}
        request={computerUseApproval} onReply={host.onComputerUseApprovalReply}/>;
      const mcpApproval=host.getMcpApprovalRequest?.(target)??null;
      if(mcpApproval!=null)return <SourceMcpApprovalRequestCard
        key={JSON.stringify([mcpApproval.hostId,mcpApproval.conversationId,mcpApproval.requestId])}
        request={mcpApproval} onReply={host.onMcpApprovalReply}/>;
      const projection = projectConversationContent(target, host, "activity");
      if (projection.kind === "file-review") {
        const review: ConversationFileReviewData = restrictConversationReviewPermissions(projection.review);
        return <InlineFileReview oldFile={review.oldFile} newFile={review.newFile}
          compact={review.compact} canEdit={review.canEdit} canAccept={review.canAccept}
          wrapPreference={host.inlineReviewWrapPreference}
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
      // Original Rt: I = explicit isAeonFormatted ?? private capability
      // fallback. This independent host has no private capability provider;
      // only a genuine typed source item flag may enable the compact variant.
      const isAeonFormatted=props.item.isAeonFormatted===true;
      return <div data-conversation-message="user"
        data-content-search-unit-key={typeof props.item.id==="string"?props.item.id:undefined}
        data-source-user-message-format={isAeonFormatted?"compact":"standard"}
        className="flex flex-col gap-2">
        {content.kind === "markdown"
          ? <CodexSourceCollapsibleUserMessage text={content.text}
              isAeonFormatted={isAeonFormatted}>
              {visibleText=><host.Markdown text={visibleText} role="user" />}
            </CodexSourceCollapsibleUserMessage>
          : <host.ActivityDetails item={props.item} isActive={false} presentation="ordinary" />}
        {host.UserMessageExtras ? <host.UserMessageExtras {...props} /> : null}
      </div>;
    },
    AssistantMessage(props) {
      const content = projectConversationContent(props.item, host, "message");
      return <div data-conversation-message="assistant"
        data-content-search-unit-key={typeof props.item.id==="string"?props.item.id:undefined}
        className="flex flex-col gap-2">
        {content.kind === "markdown" ? <host.Markdown text={content.text} role="assistant"
            isStreaming={props.item.completed===false} />
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
      const rawUnits = grouping.toUnits(props.items);
      const latestRetention = props.renderMode === "latest"
        ? props.allowLatestCompletedGroup ?? grouping.allowLatestCompletedGroup?.(props) ?? null : null;
      // Original local turn: Wa -> Ga/qe -> ga/ek's optional combined trace.
      // Filtering after ek would silently promote stale completed units.
      const sourceVisibleUnits = latestRetention === null ? rawUnits
        : filterSourceLatestActivityUnits(rawUnits, latestRetention);
      const units = combineSourceActivityTrace(sourceVisibleUnits,
        grouping.getCombinedUnitKey?.(props.items));
      const visibleUnits = units;
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
            isLatestVisibleUnit: visibleUnits[visibleUnits.length - 1]?.key === unit.key,
            isActivitySliceClosed: props.collapseWhenPossible,
          });
          if (groupHeader == null || stateContext == null) return unit.items.map((item, index) =>
            <div key={item.id ?? `${item.type}:${index}`}><ActivityContent item={item} isActive={props.isActive} presentation="ordinary" /></div>);
          const state = projectActivityGroupHeader({items: unit.items, ...stateContext});
          if (shouldDemoteCompletedSingleGroup(unit.items, state)) return unit.items.map((item,index) =>
            <div key={item.id ?? `${item.type}:${index}`}><ActivityContent item={item} isActive={props.isActive} presentation="ordinary" /></div>);
          return <CodexActivityGroupRow
            items={unit.items} detailItems={groupHeader.getVisibleItems?.(unit.items)}
            getRepeatedRows={groupHeader.getRepeatedRows} renderRepeatedSummary={groupHeader.renderRepeatedSummary}
            getRecognizedRepeatedAction={groupHeader.getRecognizedRepeatedAction} renderRepeatedHeader={groupHeader.renderRepeatedHeader}
            renderRepeatedIcon={groupHeader.renderRepeatedIcon}
            {...stateContext}
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
          {visibleUnits.map(unit => <React.Fragment key={unit.key}>{renderUnit(unit)}</React.Fragment>)}
        </div>;
      }
      return <CodexAgentActivity {...context} units={units} renderSummary={grouping.renderSummary}
        {...(grouping.renderWorkedFor == null ? {} : {renderWorkedFor: grouping.renderWorkedFor})}
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
