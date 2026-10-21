/**
 * Review-size and action model, recovered from the compiled
 * `inline-file-diff-review-2b36b4184acf.js` (`O`, `A`, `j`).
 */
export const MAX_INLINE_DIFF_CONTENT_CHARS = 262_144;
export const MAX_INLINE_DIFF_CONTENT_LINES = 5_000;

export type InlineFileReviewAction = "edit" | "reject" | "accept";
export type InlineFileReviewDisplay = "too-large" | "compact" | "full";

export interface InlineReviewFile { contents: string; name?: string | undefined; }
export interface InlineFileReviewOptions {
  oldFile: InlineReviewFile;
  newFile: InlineReviewFile;
  compact?: boolean | undefined;
  canEdit?: boolean | undefined;
  canAccept?: boolean | undefined;
}

/** Matches the original's strict >262144 chars or >5000 lines guard. */
export function isInlineDiffContentTooLarge(text: string): boolean {
  if (text.length > MAX_INLINE_DIFF_CONTENT_CHARS) return true;
  // Split with an early limit to avoid allocating arbitrary input-sized arrays.
  return text.split("\n", MAX_INLINE_DIFF_CONTENT_LINES + 1).length > MAX_INLINE_DIFF_CONTENT_LINES;
}

export function chooseInlineFileReviewDisplay(options: InlineFileReviewOptions): InlineFileReviewDisplay {
  if (isInlineDiffContentTooLarge(options.oldFile.contents) ||
      isInlineDiffContentTooLarge(options.newFile.contents)) return "too-large";
  return options.compact ? "compact" : "full";
}

/** Reject stays available; edit and accept depend on explicit permissions. */
export function canExecuteInlineReviewAction(
  action: InlineFileReviewAction,
  options: Pick<InlineFileReviewOptions, "canEdit" | "canAccept">,
): boolean {
  switch (action) {
    case "edit": return options.canEdit === true;
    case "reject": return true;
    case "accept": return options.canAccept !== false;
  }
}
