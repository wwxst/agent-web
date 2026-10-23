import assert from "node:assert/strict";
import test from "node:test";
import { createLiveConversationSource, acceptLiveConversationUpdate } from "../build/LiveConversationSource.js";
const initial = {
  conversationId: "thread-A", entries: [], loadingHistory: true,
  connectionState: "connecting", projection: { conversationId: "thread-A" },
};
test("snapshot identity is stable until update and revision increments", () => {
  const source = createLiveConversationSource(initial);
  const first = source.getSnapshot();
  assert.equal(first, source.getSnapshot());
  assert.equal(first.revision, 0);
  source.update({ loadingHistory: false });
  assert.equal(source.getSnapshot().revision, 1);
  assert.notEqual(source.getSnapshot(), first);
});
test("no-op updates do not notify subscribers", () => {
  const source = createLiveConversationSource(initial);
  let calls = 0;
  const unsubscribe = source.subscribe(() => calls++);
  source.update({ loadingHistory: true });
  assert.equal(calls, 0);
  source.update({ connectionState: "connected" });
  assert.equal(calls, 1);
  unsubscribe();
  source.update({ connectionState: "error" });
  assert.equal(calls, 1);
});
test("preserves previously published entry arrays", () => {
  const source = createLiveConversationSource(initial);
  const original = [];
  source.update({ entries: original });
  original.push({ turnKey: "late" });
  assert.equal(source.getSnapshot().entries.length, 0);
  assert.throws(() => source.getSnapshot().entries.push({}), TypeError);
});
test("dispose makes updates inert", () => {
  const source = createLiveConversationSource(initial);
  let calls = 0;
  source.subscribe(() => calls++);
  source.dispose();
  source.update({ loadingHistory: false });
  assert.equal(source.getSnapshot().revision, 0);
  assert.equal(calls, 0);
});
test("cross-thread and stale revisions are rejected", () => {
  const source = createLiveConversationSource(initial);
  assert.equal(acceptLiveConversationUpdate(source.getSnapshot(), { conversationId: "thread-B", revision: 3 }), false);
  assert.equal(acceptLiveConversationUpdate(source.getSnapshot(), { conversationId: "thread-A", revision: 0 }), false);
  assert.equal(acceptLiveConversationUpdate(source.getSnapshot(), { conversationId: "thread-A", revision: 1 }), true);
});
