import * as React from "react";
import type { ConversationMessageItem } from "../conversation/ConversationMessageRenderPlan.js";
import type { AgentActivityUnit, AgentActivityCollapseOptions } from "../conversation/AgentActivityProjection.js";
import { CodexAgentActivity } from "./CodexAgentActivity.js";
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
    toUnits(items: ConversationMessageItem[]): AgentActivityUnit<ConversationMessageItem>[];
    getCollapseContext(context: { isActive: boolean; collapseWhenPossible: boolean }):
      Omit<AgentActivityCollapseOptions<ConversationMessageItem>, "units">;
    renderSummary?(count: number, workedForItem: ConversationMessageItem | null): React.ReactNode;
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
    const projection = projectConversationContent(item, host, "activity");
    if (projection.kind === "file-review") {
      const review: ConversationFileReviewData = restrictConversationReviewPermissions(projection.review);
      return <InlineFileReview oldFile={review.oldFile} newFile={review.newFile}
        compact={review.compact} canEdit={review.canEdit} canAccept={review.canAccept}
        onAction={(action) => host.onFileReviewAction(item, action)} Diff={host.FileDiff} />;
    }
    if (projection.kind === "approval-reviews") {
      return <AutomaticApprovalReviewList reviews={projection.approval.reviews}
        isDeclined={projection.approval.isDeclined} isExpandable={projection.approval.isExpandable}
        translator={host.translator}
        getReviewSummary={host.getApprovalReviewSummary}
        getReviewDetails={host.getApprovalReviewDetails} />;
    }
    if (projection.kind === "markdown") {
      return <host.Markdown text={projection.text} role="activity" />;
    }
    return <host.ActivityDetails item={item} isActive={isActive} presentation={presentation} />;
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
      return <CodexAgentActivity {...context} units={units} renderSummary={grouping.renderSummary}
        renderUnit={(unit) => unit.kind === "group"
          ? unit.items.map((item, index) => <div key={item.id ?? `${item.type}:${index}`}>
              <ActivityContent item={item} isActive={props.isActive} presentation="ordinary" />
            </div>)
          : <ActivityContent item={unit.item} isActive={props.isActive} presentation="ordinary" />}
      />;
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
