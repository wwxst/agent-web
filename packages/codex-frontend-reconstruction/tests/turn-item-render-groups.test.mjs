import assert from "node:assert/strict";
import test from "node:test";
import { splitTurnItemsIntoRenderGroups } from "../build/TurnItemRenderGroups.js";

const deps = {
  isAutomationNamespaceTool: () => false,
  parseUpNextStatus: () => undefined,
  getCloudAutomation: () => null,
  getActivityMetadata: (item) => item.activityMeta ?? (["assistant-message", "system-error"].includes(item.type) ? { grouping: "standalone" } : null),
  canGroupActivityWithNext: () => false,
};

test("keeps the initial user prompt in userItems and isolates the final answer", () => {
  const user = { type: "user-message", id: "u1", content: "Do this" };
  const activity = { type: "exec", callId: "c1", parsedCmd: { isFinished: true }, activityMeta: { grouping: "groupable" } };
  const answer = { type: "assistant-message", id: "a1", phase: "final_answer", completed: true, content: "Done" };
  const result = splitTurnItemsIntoRenderGroups([user, activity, answer], "complete", "all", undefined, null, deps);
  assert.deepEqual(result.userItems, [user]);
  assert.deepEqual(result.agentItems, [activity]);
  assert.equal(result.assistantItem.id, "a1");
});

test("routes unresolved patch and exec approvals to the single approval slot", () => {
  const patch = { type: "patch", callId: "p1", approvalRequestId: "approval-1", success: null };
  const exec = { type: "exec", callId: "e1", approvalRequestId: "approval-2", output: {} };
  const result = splitTurnItemsIntoRenderGroups([patch, exec], "in_progress", "all", undefined, null, deps);
  assert.equal(result.approvalItem, exec);
  assert.deepEqual(result.agentItems, []);
});

test("attaches automatic approval reviews to their tool and removes the standalone review", () => {
  const tool = { type: "exec", callId: "e1", commandExecutionItemId: "e1", activityMeta: { grouping: "standalone" } };
  const review = { type: "automatic-approval-review", id: "r1", targetItemId: "e1", status: "approved" };
  const result = splitTurnItemsIntoRenderGroups([tool, review], "in_progress", "all", undefined, null, deps);
  assert.deepEqual(result.agentItems, [{ ...tool, automaticApprovalReviews: [review] }]);
});

test("routes completed generated images to tool outputs and hides them from completed activity", () => {
  const image = { type: "generated-image", id: "img1", src: "image-data" };
  const result = splitTurnItemsIntoRenderGroups([image], "complete", "all", undefined, null, deps);
  assert.deepEqual(result.toolOutputItems, [image]);
  assert.deepEqual(result.agentItems, []);
});

test("groups contiguous non-message subagent activity", () => {
  const first = { type: "subagent-activity", id: "s1", isMessage: false };
  const second = { type: "subagent-activity", id: "s2", isMessage: false };
  const third = { type: "subagent-activity", id: "s3", isMessage: false };
  const result = splitTurnItemsIntoRenderGroups([first, second, third], "in_progress", "all", undefined, null, deps);
  assert.deepEqual(result.subagentActivityItemGroups, [[first, second, third]]);
  assert.deepEqual(result.agentItems, [first]);
});

test("surfaces a trailing system error separately after a failed turn", () => {
  const error = { type: "system-error", id: "err1", message: "failed" };
  const result = splitTurnItemsIntoRenderGroups([error], "failed", "all", undefined, null, deps);
  assert.equal(result.systemEventItem, error);
  assert.deepEqual(result.agentItems, []);
});

test("keeps latest-turn commentary filtered to the current commentary item", () => {
  const old = { type: "assistant-message", id: "old", phase: "commentary", content: "Thinking", completed: true };
  const current = { type: "assistant-message", id: "current", phase: "commentary", content: "Working", completed: false };
  const result = splitTurnItemsIntoRenderGroups([old, current], "in_progress", "latest", undefined, null, deps);
  assert.deepEqual(result.agentItems, []);
  assert.equal(result.assistantItem.id, "current");
  assert.equal(result.currentCommentaryItem.id, "current");
});
