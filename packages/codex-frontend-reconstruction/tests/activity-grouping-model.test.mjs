import assert from "node:assert/strict";
import test from "node:test";
import { classifyActivityItem, normalizeToolApprovalReviews } from "../build/ActivityGroupingModel.js";

const deps = {
  isExecOrPatchStandalone: (item) => item.forceStandalone === true,
  isMcpToolCallStandalone: (item) => item.forceStandalone === true,
  isMcpAppToolCall: (_item, _statuses) => false,
  getDynamicToolPresentation: (item) => item.presentation ?? null,
  hasSpecialLegacyFormProperty: (property) => property?.special === true,
};

test("classifies tool calls and respects private standalone predicate adapter", () => {
  assert.equal(classifyActivityItem({ type: "exec" }, {}, deps).grouping, "groupable");
  assert.equal(classifyActivityItem({ type: "patch", forceStandalone: true }, {}, deps).grouping, "standalone");
  assert.equal(classifyActivityItem({ type: "external-event" }, {}, deps).grouping, "groupable");
});

test("hides empty web searches and dynamic tools marked hidden", () => {
  assert.equal(classifyActivityItem({ type: "web-search", query: "   " }, {}, deps), null);
  assert.equal(classifyActivityItem({ type: "web-search", query: "find docs" }, {}, deps).grouping, "groupable");
  assert.equal(classifyActivityItem({ type: "dynamic-tool-call" }, { dynamicToolPresentation: { hiddenInConversation: true } }, deps), null);
});

test("generated images are included only when explicitly enabled", () => {
  const image = { type: "generated-image", id: "image-1" };
  assert.equal(classifyActivityItem(image, {}, deps), null);
  assert.equal(classifyActivityItem(image, { includeGeneratedImages: true }, deps).grouping, "standalone");
});

test("approval review grouping follows status", () => {
  assert.equal(classifyActivityItem({ type: "automatic-approval-review", status: "approved" }, {}, deps), null);
  assert.equal(classifyActivityItem({ type: "automatic-approval-review", status: "inProgress" }, {}, deps).grouping, "groupable");
  assert.equal(classifyActivityItem({ type: "automatic-approval-review", status: "denied" }, {}, deps).grouping, "standalone");
});

test("completed MCP elicitations are classified according to form shape", () => {
  assert.equal(classifyActivityItem({ type: "mcp-server-elicitation", completed: false, elicitation: { kind: "generic" } }, {}, deps), null);
  assert.equal(classifyActivityItem({ type: "mcp-server-elicitation", completed: true, elicitation: { kind: "unsupportedOpenAIForm" } }, {}, deps), null);
  assert.equal(classifyActivityItem({ type: "mcp-server-elicitation", completed: true, elicitation: { kind: "legacyOpenAIForm", schema: { properties: { x: { special: true } } } } }, {}, deps).grouping, "groupable");
});

test("approval normalization removes approved-only review metadata but preserves unresolved reviews", () => {
  const allApproved = { type: "mcp-tool-call", automaticApprovalReviews: [{ status: "approved" }] };
  assert.equal("automaticApprovalReviews" in normalizeToolApprovalReviews(allApproved), false);
  const unresolved = { type: "mcp-tool-call", automaticApprovalReviews: [{ status: "denied" }] };
  assert.equal(normalizeToolApprovalReviews(unresolved), unresolved);
});

test("message rows are standalone while metadata-only events are not activity rows", () => {
  assert.equal(classifyActivityItem({ type: "assistant-message" }, {}, deps).grouping, "standalone");
  assert.equal(classifyActivityItem({ type: "turn-diff" }, {}, deps), null);
});
