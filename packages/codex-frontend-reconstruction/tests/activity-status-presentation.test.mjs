import assert from "node:assert/strict";
import test from "node:test";
import {
  getActivityStatusPresentation, getExplicitAuthorizationNotice,
  isHighRiskDeniedAutomaticReview, isMcpApprovalForbiddenByNeverPolicy,
  ACTIVITY_STATUS_MESSAGE_ID, THINKING_STATUS_MESSAGE_ID,
} from "../build/ActivityStatusPresentation.js";

test("heading overrides live state and whitespace headings fall back", () => {
  assert.deepEqual(getActivityStatusPresentation({ heading: "  Updating files  ", state: "Searching" }), { kind: "heading", value: "Updating files" });
  assert.deepEqual(getActivityStatusPresentation({ heading: "    ", state: "Searching" }), { kind: "state", value: "Searching" });
  assert.deepEqual(getActivityStatusPresentation({ state: null }), { kind: "thinking" });
});

test("normalizes special translation keys without changing other states", () => {
  assert.deepEqual(getActivityStatusPresentation({ state: "Needs input" }), { kind: "state", value: "needsInput" });
  assert.deepEqual(getActivityStatusPresentation({ state: "-" }), { kind: "state", value: "unnamed" });
  assert.deepEqual(getActivityStatusPresentation({ state: "Blame" }), { kind: "state", value: "Blame" });
  assert.equal(ACTIVITY_STATUS_MESSAGE_ID, "restricted.aeonMessaging.activityState");
  assert.equal(THINKING_STATUS_MESSAGE_ID, "restricted.aeonMessaging.thinking");
});

test("only denied/high automatic reviews trigger the high-risk notice", () => {
  assert.equal(isHighRiskDeniedAutomaticReview({ status: "denied", riskLevel: "high" }), true);
  assert.equal(isHighRiskDeniedAutomaticReview({ status: "approved", riskLevel: "high" }), false);
  assert.equal(isHighRiskDeniedAutomaticReview({ status: "denied", riskLevel: "low" }), false);
  assert.equal(getExplicitAuthorizationNotice([{ status: "denied", riskLevel: "high" }]).id, "localConversation.automaticApprovalReview.explicitAuthorizationHighRisk");
  assert.equal(getExplicitAuthorizationNotice([{ status: "denied", riskLevel: "low" }]).defaultMessage, "Requires explicit authorization");
});

test("identifies the exact approval-policy-never MCP failure", () => {
  const error = "MCP tool call requires approval, but approval policy is never";
  assert.equal(isMcpApprovalForbiddenByNeverPolicy({ result: { type: "error", error } }), true);
  assert.equal(isMcpApprovalForbiddenByNeverPolicy({ result: { type: "success", error } }), false);
  assert.equal(isMcpApprovalForbiddenByNeverPolicy({ result: { type: "error", error: "Denied" } }), false);
});
