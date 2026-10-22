import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isComposerEditorSubmitReady,
  resolveComposerSubmitDecision,
} from "../build/ComposerInteractionModel.js";

const ready = {
  controllerReady: true,
  inputDisabled: false,
  isDictating: false,
  voiceInputEnabled: true,
  submissionBlocked: false,
  voiceSessionStatus: "idle",
  conversationDisabled: false,
  pendingActionCount: 0,
  requiresWorkHomePolicyAcceptance: false,
  hasWorkHomePolicyAcceptance: true,
};

test("editor readiness mirrors the source's controller/input/dictation gate", () => {
  assert.equal(isComposerEditorSubmitReady(ready), true);
  assert.equal(isComposerEditorSubmitReady({ ...ready, controllerReady: false }), false);
  assert.equal(isComposerEditorSubmitReady({ ...ready, inputDisabled: true }), false);
  assert.equal(isComposerEditorSubmitReady({ ...ready, isDictating: true }), false);
});

test("normal submission requires controller readiness and an enabled input", () => {
  assert.deepEqual(resolveComposerSubmitDecision(ready), { kind: "submit" });
  assert.deepEqual(resolveComposerSubmitDecision({ ...ready, controllerReady: false }), {
    kind: "blocked", reason: "controller-not-ready",
  });
  assert.deepEqual(resolveComposerSubmitDecision({ ...ready, inputDisabled: true }), {
    kind: "blocked", reason: "input-disabled",
  });
});

test("dictation is routed before normal editor readiness and uses its own gate", () => {
  assert.deepEqual(resolveComposerSubmitDecision({
    ...ready, isDictating: true, controllerReady: false,
  }), { kind: "voice-send" });
  assert.deepEqual(resolveComposerSubmitDecision({
    ...ready, isDictating: true, voiceInputEnabled: false,
  }), { kind: "blocked", reason: "voice-send-unavailable" });
  assert.deepEqual(resolveComposerSubmitDecision({
    ...ready, isDictating: true, submissionBlocked: true,
  }), { kind: "blocked", reason: "voice-send-unavailable" });
});

test("normal submission waits for an idle voice runtime", () => {
  assert.deepEqual(resolveComposerSubmitDecision({
    ...ready, voiceSessionStatus: "active",
  }), { kind: "blocked", reason: "voice-session-active" });
  assert.deepEqual(resolveComposerSubmitDecision({
    ...ready, voiceSessionStatus: "starting",
  }), { kind: "blocked", reason: "voice-session-active" });
});

test("normal submission respects disabled conversations and pending actions", () => {
  assert.deepEqual(resolveComposerSubmitDecision({
    ...ready, conversationDisabled: true,
  }), { kind: "blocked", reason: "conversation-disabled" });
  assert.deepEqual(resolveComposerSubmitDecision({
    ...ready, pendingActionCount: 1,
  }), { kind: "blocked", reason: "pending-action" });
});

test("work-home submission requires explicit policy acceptance", () => {
  assert.deepEqual(resolveComposerSubmitDecision({
    ...ready, requiresWorkHomePolicyAcceptance: true, hasWorkHomePolicyAcceptance: false,
  }), { kind: "blocked", reason: "work-home-policy-acceptance-required" });
  assert.deepEqual(resolveComposerSubmitDecision({
    ...ready, requiresWorkHomePolicyAcceptance: true, hasWorkHomePolicyAcceptance: true,
  }), { kind: "submit" });
});
