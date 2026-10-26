import * as React from "react";
import {
  ACTIVITY_STATUS_DEFAULT_MESSAGE,
  ACTIVITY_STATUS_MESSAGE_ID,
  THINKING_STATUS_MESSAGE_ID,
  getActivityStatusPresentation,
  getExplicitAuthorizationNotice,
  isHighRiskDeniedAutomaticReview,
  isAutomaticApprovalReviewInProgress,
  type AutomaticApprovalReviewSummary,
  type ActivityStatusInput,
} from "../conversation/ActivityStatusPresentation.js";

export interface ActivityStatusTranslation {
  format(message: { id: string; defaultMessage: string; values?: Record<string, unknown> | undefined }): React.ReactNode;
}

/** Reconstructs the heading > state > Thinking fallback from `activity-state-label`. */
export function ActivityStatusLabel({ heading, state, translator }: ActivityStatusInput & {
  translator: ActivityStatusTranslation;
}) {
  const presentation = getActivityStatusPresentation({ heading, state });
  if (presentation.kind === "heading") return <>{presentation.value}</>;
  if (presentation.kind === "thinking") return <>{translator.format({
    id: THINKING_STATUS_MESSAGE_ID,
    defaultMessage: "Thinking",
  })}</>;
  const translated = translator.format({
    id: ACTIVITY_STATUS_MESSAGE_ID,
    defaultMessage: ACTIVITY_STATUS_DEFAULT_MESSAGE,
    values: { state: presentation.value },
  });
  // The compiled ICU select `children` callback falls back to Thinking when
  // the translated fragment array has no truthy content.
  const hasContent = Array.isArray(translated)
    ? translated.some(Boolean)
    : Boolean(translated);
  return hasContent ? <>{translated}</> : <>{translator.format({
    id: THINKING_STATUS_MESSAGE_ID,
    defaultMessage: "Thinking",
  })}</>;
}

export interface AutomaticApprovalReviewListProps {
  reviews: readonly AutomaticApprovalReviewSummary[];
  isDeclined?: boolean | undefined;
  isExpandable?: boolean | undefined;
  translator: ActivityStatusTranslation;
  /** Codex's review-message formatter is private and must be supplied by host. */
  getReviewSummary: (review: AutomaticApprovalReviewSummary) => React.ReactNode;
  getReviewDetails: (review: AutomaticApprovalReviewSummary) => React.ReactNode;
}

function AutomaticApprovalReviewRow(props: {
  review: AutomaticApprovalReviewSummary;
  expandable: boolean;
  getReviewSummary: AutomaticApprovalReviewListProps["getReviewSummary"];
  getReviewDetails: AutomaticApprovalReviewListProps["getReviewDetails"];
}) {
  const { review, expandable, getReviewDetails, getReviewSummary } = props;
  const [expanded, setExpanded] = React.useState(false);
  const warning = isHighRiskDeniedAutomaticReview(review);
  // Original D: the summary runs through qk/S with active=true only while
  // an *expandable* automatic review has status "inProgress".
  const active = isAutomaticApprovalReviewInProgress(review);
  const summary = getReviewSummary(review);
  if (!expandable) return <div className="min-w-0 truncate pt-1 text-codex-description/80">{summary}</div>;
  return <div className="flex flex-col pt-1"
    data-source-automatic-approval-status={review.status ?? "unknown"}>
    <button type="button" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}
      className="group/automatic-approval-review inline-flex w-fit max-w-full gap-1.5 text-start">
      <span data-source-automatic-approval-shimmer={active ? "true" : "false"}
        className={`codex-source-automatic-review-summary min-w-0 truncate ${warning ? "text-warning" : "text-codex-description/80 group-hover/automatic-approval-review:text-default"}`}>
        {summary}
      </span>
      <span aria-hidden="true" className={`icon-2xs shrink-0 text-tertiary transition-[opacity,transform] duration-basic ${expanded ? "rotate-90 opacity-100" : "opacity-0 group-hover/automatic-approval-review:opacity-100"}`}>›</span>
    </button>
    <div aria-hidden={!expanded} inert={!expanded} className={expanded ? "overflow-visible" : "overflow-hidden"}
      style={{ height: expanded ? "auto" : 0, opacity: expanded ? 1 : 0, pointerEvents: expanded ? "auto" : "none" }}>
      <p className="max-w-[80ch] pt-1 text-size-chat leading-relaxed whitespace-pre-wrap text-text/60">{getReviewDetails(review)}</p>
    </div>
  </div>;
}

/**
 * Declined reviews show a risk-sensitive authorization notice instead of
 * review rows. This is display-only: it does not grant/deny tool permissions.
 */
export function AutomaticApprovalReviewList(props: AutomaticApprovalReviewListProps) {
  const { reviews, isDeclined = false, isExpandable = true, translator, getReviewSummary, getReviewDetails } = props;
  if (isDeclined) {
    return <p className="max-w-[80ch] pt-1 text-size-chat leading-relaxed text-text/60">
      {translator.format(getExplicitAuthorizationNotice(reviews))}
    </p>;
  }
  return <>{reviews.map((review, index) => <AutomaticApprovalReviewRow
    key={review.id ?? index}
    review={review}
    expandable={isExpandable}
    getReviewSummary={getReviewSummary}
    getReviewDetails={getReviewDetails}
  />)}</>;
}
