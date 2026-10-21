import assert from "node:assert/strict";
import test from "node:test";
import {
  getConversationPlainText,
  projectConversationContent,
  restrictConversationReviewPermissions,
} from "../build/ConversationPresentationAdapterModel.js";

const item = (type, content) => ({ type, content });

test("reads literal message body without parsing JSON or markup", () => {
  assert.equal(getConversationPlainText(item("assistant-message", "**ok**")), "**ok**");
  assert.equal(getConversationPlainText(item("assistant-message", "")), "");
});
test("unknown or structured content is left to the host renderer", () => {
  assert.equal(getConversationPlainText(item("assistant-message", ["text", "other"])), null);
  assert.deepEqual(projectConversationContent(item("assistant-message", { parts: [] })), { kind: "activity-detail" });
});
test("plain text message renders through the Markdown adapter", () => {
  assert.deepEqual(projectConversationContent(item("assistant-message", "Hello")), { kind: "markdown", text: "Hello" });
});
test("host can provide message text from its own schema", () => {
  assert.deepEqual(projectConversationContent(item("assistant-message", 99), { getText: () => "host text" }), { kind: "markdown", text: "host text" });
});
test("missing host text remains an unsupported shape", () => {
  assert.deepEqual(projectConversationContent(item("assistant-message", "original"), { getText: () => null }), { kind: "activity-detail" });
});
test("tool diff metadata never turns a normal message into a file approval", () => {
  const review = { oldFile: { contents: "old" }, newFile: { contents: "new" } };
  assert.deepEqual(projectConversationContent(item("assistant-message", "normal"), { getFileReview: () => review }), { kind: "markdown", text: "normal" });
});
test("host provided file review takes priority over tool body", () => {
  const review = { oldFile: { contents: "old" }, newFile: { contents: "new" } };
  assert.deepEqual(projectConversationContent(item("exec", "ignored"), { getFileReview: () => review }, "activity"), { kind: "file-review", review });
});
test("approval view only selected with host-supplied approval data", () => {
  const approval = { reviews: [{ id: "r1", status: "denied" }], isDeclined: true };
  assert.deepEqual(projectConversationContent(item("tool", "ordinary"), { getApprovalReviews: () => approval }, "activity"), { kind: "approval-reviews", approval });
});
test("tool activity with no private payload uses host detail renderer", () => {
  assert.deepEqual(projectConversationContent(item("tool", { output: "unknown" }), {}, "activity"), { kind: "activity-detail" });
});
test("malformed review data not inferred from item fields", () => {
  assert.deepEqual(projectConversationContent({ type: "exec", diff: "--- a\n+++ b" }, {}, "activity"), { kind: "activity-detail" });
});
test("review permissions default to no edit and no accept", () => {
  assert.deepEqual(restrictConversationReviewPermissions({ oldFile: { contents: "a" }, newFile: { contents: "b" } }), {
    oldFile: { contents: "a" }, newFile: { contents: "b" }, canEdit: false, canAccept: false,
  });
});
test("review actions can only be enabled with explicit true", () => {
  assert.deepEqual(restrictConversationReviewPermissions({ oldFile: { contents: "a" }, newFile: { contents: "b" }, canEdit: true, canAccept: false }), {
    oldFile: { contents: "a" }, newFile: { contents: "b" }, canEdit: true, canAccept: false,
  });
});
