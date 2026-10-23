/**
 * Host boundary between the recovered message dispatch and private Codex
 * message bodies. This is adapter code, NOT a claim about Codex internals.
 *
 * The compiled turn renderer delegates rich bodies, approvals, FileDiff and
 * activity details to other modules. The recovered dispatch must not silently
 * render unknown nested structures as generic Markdown.
 */
import type { ConversationMessageItem } from "./ConversationMessageRenderPlan.js";
import type { InlineReviewFile } from "./InlineFileReviewModel.js";
import type { AutomaticApprovalReviewSummary } from "./ActivityStatusPresentation.js";

export interface ConversationFileReviewData {
  oldFile: InlineReviewFile;
  newFile: InlineReviewFile;
  compact?: boolean | undefined;
  canEdit?: boolean | undefined;
  canAccept?: boolean | undefined;
}

export interface ConversationApprovalReviewData {
  reviews: readonly AutomaticApprovalReviewSummary[];
  isDeclined?: boolean | undefined;
  isExpandable?: boolean | undefined;
}

export interface ConversationContentAdapters {
  /** Override only if the actual backend exposes a different body schema. */
  getText?: ((item: ConversationMessageItem) => string | null | undefined) | undefined;
  /** Host supplies private Codex/Agent file-review projection. */
  getFileReview?: ((item: ConversationMessageItem) => ConversationFileReviewData | null | undefined) | undefined;
  /** Host supplies review metadata; do not guess it from unrelated fields. */
  getApprovalReviews?: ((item: ConversationMessageItem) => ConversationApprovalReviewData | null | undefined) | undefined;
}

export type ConversationContentProjection =
  | { kind: "markdown"; text: string }
  | { kind: "file-review"; review: ConversationFileReviewData }
  | { kind: "approval-reviews"; approval: ConversationApprovalReviewData }
  | { kind: "activity-detail" };

/** Text-only fallback never JSON.stringify's unknown private message records. */
export function getConversationPlainText(item: ConversationMessageItem): string | null {
  return typeof item.content === "string" ? item.content : null;
}

/**
 * File review and approval views are only chosen when explicit host metadata
 * is supplied. This avoids treating any tool output containing a `diff`
 * field as an actionable patch or any generic error as an approval request.
 */
export function projectConversationContent(
  item: ConversationMessageItem,
  adapters: ConversationContentAdapters = {},
  context: "message" | "activity" = "message",
): ConversationContentProjection {
  if (context === "activity") {
    const review = adapters.getFileReview?.(item);
    if (review != null) return { kind: "file-review", review };
    const approval = adapters.getApprovalReviews?.(item);
    if (approval != null) return { kind: "approval-reviews", approval };
  }
  const text = adapters.getText ? adapters.getText(item) : getConversationPlainText(item);
  if (typeof text === "string") return { kind: "markdown", text };
  return { kind: "activity-detail" };
}

/** Never authorize edits/acceptance merely because the host omitted a flag. */
export function restrictConversationReviewPermissions(review: ConversationFileReviewData): ConversationFileReviewData {
  return {
    ...review,
    canEdit: review.canEdit === true,
    canAccept: review.canAccept === true,
  };
}
