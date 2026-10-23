import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_INLINE_DIFF_CONTENT_CHARS, MAX_INLINE_DIFF_CONTENT_LINES,
  isInlineDiffContentTooLarge, chooseInlineFileReviewDisplay,
  canExecuteInlineReviewAction,
} from "../build/InlineFileReviewModel.js";

test("accepts the maximum 262144 characters and rejects one additional character", () => {
  assert.equal(isInlineDiffContentTooLarge("a".repeat(MAX_INLINE_DIFF_CONTENT_CHARS)), false);
  assert.equal(isInlineDiffContentTooLarge("a".repeat(MAX_INLINE_DIFF_CONTENT_CHARS + 1)), true);
});

test("accepts up to 5000 lines and rejects 5001 without scanning all lines", () => {
  assert.equal(isInlineDiffContentTooLarge("x\n".repeat(MAX_INLINE_DIFF_CONTENT_LINES - 1) + "x"), false);
  assert.equal(isInlineDiffContentTooLarge("x\n".repeat(MAX_INLINE_DIFF_CONTENT_LINES) + "x"), true);
});

test("skips preview for either large file, otherwise honors compact/full mode", () => {
  const small = { contents: "new" };
  const large = { contents: "a".repeat(MAX_INLINE_DIFF_CONTENT_CHARS + 1) };
  assert.equal(chooseInlineFileReviewDisplay({ oldFile: small, newFile: small }), "full");
  assert.equal(chooseInlineFileReviewDisplay({ oldFile: small, newFile: small, compact: true }), "compact");
  assert.equal(chooseInlineFileReviewDisplay({ oldFile: large, newFile: small, compact: true }), "too-large");
  assert.equal(chooseInlineFileReviewDisplay({ oldFile: small, newFile: large }), "too-large");
});

test("reject stays available; edit requires opt-in and accept defaults enabled", () => {
  assert.equal(canExecuteInlineReviewAction("reject", { canAccept: false, canEdit: false }), true);
  assert.equal(canExecuteInlineReviewAction("accept", { canAccept: false }), false);
  assert.equal(canExecuteInlineReviewAction("accept", {}), true);
  assert.equal(canExecuteInlineReviewAction("edit", {}), false);
  assert.equal(canExecuteInlineReviewAction("edit", { canEdit: true }), true);
});
