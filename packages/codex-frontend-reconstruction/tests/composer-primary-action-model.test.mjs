import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveComposerPrimaryAction as resolve } from "../build/ComposerPrimaryActionModel.js";

const ready = {
  isStopping: false, isSubmitting: false, hasSubmissionMarker: false,
  isWaitingForFileUploads: false, canStopWhileSubmitting: false,
  isStreaming: false, streamState: "ready", hasHostStopSignal: false,
  isSteeringEnabled: false, canQueueNativeAnswerSubmission: false,
  hasUploadPolicy: false, hasText: true, hasAttachments: false,
  hostSendDisabled: false, submitLoading: false,
};

test("YMt default action is submit with host-controlled disabled and loading states", () => {
  assert.deepEqual(resolve(ready), {
    kind: "send", type: "submit", disabled: false,
    loading: false, shouldFocusEditorBeforeStop: false,
  });
  assert.equal(resolve({ ...ready, hostSendDisabled: true }).disabled, true);
  assert.equal(resolve({ ...ready, submitLoading: true }).loading, true);
  assert.equal(resolve({ ...ready, submitLoading: true, hasText: false }).loading, false);
  assert.equal(resolve({ ...ready, submitLoading: true, hasText: false, hasAttachments: true }).loading, true);
});

test("YMt selects a stop button for active streaming while eligible", () => {
  const action = resolve({ ...ready, streamState: "streaming", isStreaming: true });
  assert.deepEqual(action, {
    kind: "stop", type: "button", disabled: false,
    loading: false, shouldFocusEditorBeforeStop: true,
  });
});

test("waiting uploads suppress the stop button and disable the send path", () => {
  assert.deepEqual(resolve({
    ...ready, isWaitingForFileUploads: true, isStreaming: true, streamState: "streaming",
  }), {
    kind: "send", type: "submit", disabled: true,
    loading: true, shouldFocusEditorBeforeStop: false,
  });
});

test("upload policy presence independently suppresses the stop action", () => {
  assert.equal(resolve({ ...ready, isStreaming: true, streamState: "streaming", hasUploadPolicy: true }).kind, "send");
});

test("a submitting action can expose stop only if stopping while submitting is allowed", () => {
  const active = resolve({
    ...ready, isSubmitting: true, canStopWhileSubmitting: true,
  });
  assert.equal(active.kind, "stop");
  assert.equal(active.disabled, false);
  assert.equal(resolve({
    ...ready, isSubmitting: true, canStopWhileSubmitting: false,
  }).kind, "send");
  assert.equal(resolve({
    ...ready, isSubmitting: true, canStopWhileSubmitting: false,
    canQueueNativeAnswerSubmission: false,
  }).loading, true);
});

test("stopping state disables and loads the visible stop control", () => {
  const stopping = resolve({
    ...ready, isStopping: true, isStreaming: true, streamState: "streaming",
  });
  assert.equal(stopping.kind, "stop");
  assert.equal(stopping.disabled, true);
  assert.equal(stopping.loading, true);
});

test("a queued-native-answer capability and steering preserve the original stop gating", () => {
  const common = { ...ready, isStreaming: true, streamState: "other", hasText: false };
  assert.equal(resolve(common).kind, "stop");
  assert.equal(resolve({ ...common, isSteeringEnabled: true }).kind, "send");
  assert.equal(resolve({ ...common, canQueueNativeAnswerSubmission: true }).kind, "send");
  assert.equal(resolve({ ...common, hasHostStopSignal: true, canQueueNativeAnswerSubmission: true }).kind, "stop");
});

test("a private submission marker affects both disabled and loading branches", () => {
  const send = resolve({ ...ready, hasSubmissionMarker: true });
  assert.equal(send.kind, "send");
  assert.equal(send.disabled, true);
  assert.equal(send.loading, true);
  const stop = resolve({ ...ready, hasSubmissionMarker: true, canStopWhileSubmitting: true });
  assert.equal(stop.kind, "stop");
  assert.equal(stop.disabled, false);
});
