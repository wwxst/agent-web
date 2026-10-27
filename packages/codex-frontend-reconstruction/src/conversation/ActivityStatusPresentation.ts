/**
 * Small activity labels and automatic-review statuses recovered from
 * `activity-state-label-54eb9cc1c5d9.js` and
 * `automatic-approval-review-details-d0acb2472248.js`.
 * Translation is injected in the TSX view rather than hard-coded here.
 */
export const ACTIVITY_STATUS_MESSAGE_ID = "restricted.aeonMessaging.activityState";
export const THINKING_STATUS_MESSAGE_ID = "restricted.aeonMessaging.thinking";
export const ACTIVITY_STATUS_DEFAULT_MESSAGE =
  "{state, select, Working {Working} Searching {Searching} Creating {Creating} Payment {Payment} Thinking {Thinking} needsInput {Needs input} Ready {Ready} Paused {Paused} unnamed {-} Simplify {Simplify} Blame {Blame} other {}}";

export interface ActivityStatusInput {
  heading?: string | null | undefined;
  state?: string | null | undefined;
}

export interface AutomaticApprovalReviewSummary {
  id?: string | undefined;
  status?: string | undefined;
  riskLevel?: string | undefined;
  [key: string]: unknown;
}

/** The public heading supersedes any state when nonblank. */
export function getActivityStatusPresentation(input: ActivityStatusInput):
  | { kind: "heading"; value: string }
  | { kind: "thinking" }
  | { kind: "state"; value: string } {
  const heading = input.heading?.trim();
  if (heading) return { kind: "heading", value: heading };
  if (input.state == null) return { kind: "thinking" };
  const state = input.state === "Needs input" ? "needsInput" :
    input.state === "-" ? "unnamed" : input.state;
  return { kind: "state", value: state };
}

/** Source automatic-approval-review-details D passes active=true to qk
 * solely for an expandable review with status exactly "inProgress". */
export function isAutomaticApprovalReviewInProgress(review: AutomaticApprovalReviewSummary):boolean{
  return review.status==="inProgress";
}

export function isHighRiskDeniedAutomaticReview(review: AutomaticApprovalReviewSummary): boolean {
  return review.status === "denied" && review.riskLevel === "high";
}

export function getExplicitAuthorizationNotice(reviews: readonly AutomaticApprovalReviewSummary[]): {
  id: string;
  defaultMessage: string;
} {
  if (reviews.some(isHighRiskDeniedAutomaticReview)) {
    return {
      id: "localConversation.automaticApprovalReview.explicitAuthorizationHighRisk",
      defaultMessage: "Requires explicit authorization because this action is considered high risk",
    };
  }
  return {
    id: "localConversation.automaticApprovalReview.explicitAuthorization",
    defaultMessage: "Requires explicit authorization",
  };
}

export function isMcpApprovalForbiddenByNeverPolicy(item: {
  result?: { type?: string | undefined; error?: string | undefined } | null | undefined;
}): boolean {
  return item.result?.type === "error" &&
    item.result.error === "MCP tool call requires approval, but approval policy is never";
}
