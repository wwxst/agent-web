import * as React from "react";
import {
  canExecuteInlineReviewAction,
  chooseInlineFileReviewDisplay,
  type InlineFileReviewAction,
  type InlineReviewFile,
} from "../conversation/InlineFileReviewModel.js";

export interface InlineFileReviewProps {
  oldFile: InlineReviewFile;
  newFile: InlineReviewFile;
  compact?: boolean | undefined;
  canEdit?: boolean | undefined;
  canAccept?: boolean | undefined;
  onAction: (action: InlineFileReviewAction) => void;
  onViewportReady?: ((element: HTMLElement) => void) | undefined;
  /** Diff is the original Codex FileDiff visual primitive; it is not reconstructed yet. */
  Diff?: React.ComponentType<{
    oldFile: InlineReviewFile;
    newFile: InlineReviewFile;
    overflow: "wrap" | "scroll";
    onViewportReady?: ((element: HTMLElement) => void) | undefined;
  }> | undefined;
  /** Host translator; translations and exact design-system Button are external. */
  translate?: ((message: { id: string; defaultMessage: string }) => string) | undefined;
  Button?: React.ComponentType<{
    children: React.ReactNode;
    disabled?: boolean | undefined;
    onClick?: (() => void) | undefined;
    className?: string | undefined;
    "aria-label"?: string | undefined;
  }> | undefined;
}

const messages = {
  tooLarge: { id: "inlineFileDiffReview.tooLarge", defaultMessage: "Change is too large to preview" },
  edit: { id: "inlineFileDiffReview.edit", defaultMessage: "Edit" },
  reject: { id: "inlineFileDiffReview.reject", defaultMessage: "Reject" },
  accept: { id: "inlineFileDiffReview.accept", defaultMessage: "Accept" },
  wrap: { id: "codex.review.wrap.enable", defaultMessage: "Enable word wrap" },
  unwrap: { id: "codex.review.wrap.disable", defaultMessage: "Disable word wrap" },
} as const;

/**
 * Reconstructed from `inline-file-diff-review-2b36b4184acf.js`'s O/k/A:
 * size guard, compact <del>/<ins> view, the full diff surface and toolbar.
 *
 * This component intentionally never applies a file change itself. Accept,
 * reject and edit must be wired to the host's explicit action handler.
 */
export function InlineFileReview(props: InlineFileReviewProps) {
  const {
    oldFile, newFile, compact = false,
    canAccept = true, canEdit = false, onAction, onViewportReady,
    Diff, translate = (message) => message.defaultMessage,
    Button,
  } = props;
  const [wrapLines, setWrapLines] = React.useState(false);
  const display = chooseInlineFileReviewDisplay({ oldFile, newFile, compact, canAccept, canEdit });

  function act(action: InlineFileReviewAction) {
    if (canExecuteInlineReviewAction(action, { canAccept, canEdit })) onAction(action);
  }

  function Control({ action, disabled = false, className }: {
    action: InlineFileReviewAction;
    disabled?: boolean | undefined;
    className?: string | undefined;
  }) {
    const label = translate(messages[action]);
    const click = () => act(action);
    if (Button) return <Button disabled={disabled} onClick={click} className={className}>{label}</Button>;
    return <button type="button" disabled={disabled} onClick={click} className={className}>{label}</button>;
  }

  const controls = <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 font-sans">
    {display === "full" ? <button type="button" className="shrink-0"
      aria-label={translate(wrapLines ? messages.unwrap : messages.wrap)}
      onClick={() => setWrapLines((value) => !value)}>{wrapLines ? "↪" : "↩"}</button> : null}
    <Control action="edit" disabled={!canEdit} />
    <Control action="reject" className="!text-danger" />
    <Control action="accept" disabled={!canAccept} className="!text-chart-green" />
  </div>;

  if (display === "too-large") {
    return <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-sm text-codex-description">
      {translate(messages.tooLarge)}
      {controls}
    </div>;
  }

  if (display === "compact") {
    return <div className="max-h-80 overflow-y-auto rounded-lg border border-default bg-surface">
      <div className="divide-y divide-border-subtle font-mono [font-size:var(--diffs-font-size)] [line-height:var(--diffs-line-height)]">
        <del className="block bg-[var(--color-codex-diff-deleted)] px-3 py-2 break-words whitespace-pre-wrap no-underline">{oldFile.contents}</del>
        <ins className="block bg-[var(--color-codex-diff-added)] px-3 py-2 break-words whitespace-pre-wrap no-underline">{newFile.contents}</ins>
      </div>
      <div className="sticky bottom-0 z-10 flex justify-end border-t border-default bg-surface px-3 py-2">{controls}</div>
    </div>;
  }

  // The original full diff renderer depends on its private web-component,
  // worker pool, CSS and syntax parser. Do not substitute a fake diff here.
  return <div className="relative flex h-full min-h-0 flex-col">
    <div className="min-h-0 flex-1 overflow-y-auto pe-4 pt-4 pb-4" data-inline-file-diff-review-viewport="">
      {Diff ? <Diff oldFile={oldFile} newFile={newFile}
        overflow={wrapLines ? "wrap" : "scroll"} onViewportReady={onViewportReady} /> : null}
    </div>
    <div className="flex shrink-0 justify-end border-t border-default bg-surface px-4 py-2">{controls}</div>
  </div>;
}
