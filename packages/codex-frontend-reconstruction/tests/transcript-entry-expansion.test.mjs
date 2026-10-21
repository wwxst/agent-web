import assert from "node:assert/strict";
import test from "node:test";
import { expandTurnIntoTranscriptEntries } from "../build/TranscriptEntryExpansion.js";

const deps = {
  isTurnEmpty: (turn) => turn.items.length === 0,
  projectTurn: (turn) => ({ items: turn.items, status: turn.status }),
  mapItemsToTranscriptBlocks: (items) => items.map((item, i) => ({ type: item.type, key: item.id ?? `k${i}`, item })),
  compactAeonTranscript: (_items, blocks) => ({ items: blocks, hasPendingReply: false }),
  groupTranscriptBlocks: (blocks) => blocks,
  getComputerHandoffs: () => ({ byItemId: new Map() }),
  getMessageThreadInfo: () => null,
  isPendingTranscriptItem: () => false,
  estimateHeight: (block) => block.type === "user-message" ? 128 : 144,
  emptySummaryMinHeightPx: 12,
};

test("returns a bare entry when no turn is attached", () => {
  const base = { turnKey: "turn-a", turn: null };
  assert.deepEqual(expandTurnIntoTranscriptEntries({ baseTurnEntry: base, collapseActivityBeforeAssistant: false }, deps), [
    { ...base, renderMcpApps: undefined },
  ]);
});

test("maps projected blocks into transcript entries with stable turn keys and heights", () => {
  const base = {
    turnSearchKey: "search-a",
    turn: { status: "complete", items: [
      { type: "user-message", id: "u1", searchItemId: "u1" },
      { type: "assistant-message", id: "a1", searchItemId: "a1" },
    ], params: { input: ["hello"], threadId: "t1" } },
    requests: [],
    isAeonThread: false,
    showFullTranscript: true,
  };
  const result = expandTurnIntoTranscriptEntries({ baseTurnEntry: base, collapseActivityBeforeAssistant: false }, deps);
  assert.equal(result.length, 2);
  assert.equal(result[0].turnKey, "search-a:transcript:u1");
  assert.equal(result[0].estimatedHeightPx, 128);
  assert.equal(result[1].turnKey, "search-a:transcript:a1");
  assert.equal(result[1].includeTranscriptTurnExtras, true);
});

test("honors the empty summary pagination placeholder", () => {
  const base = { turn: { items: [], itemsPagination: { summaryItemIds: [] } }, requests: [] };
  const result = expandTurnIntoTranscriptEntries({ baseTurnEntry: base, collapseActivityBeforeAssistant: false }, deps);
  assert.equal(result.length, 1);
  assert.equal(result[0].minHeightPx, 12);
});

test("reuses previous transcript entries when turn and rendering inputs are stable", () => {
  const turn = { items: [{ type: "user-message", id: "u1" }], params: { input: ["hello"] } };
  const requests = [];
  const block = { type: "user-message", key: "b1", item: { searchItemId: "u1" } };
  const previous = [{ turn, requests, isLatestTurn: true, isAeonThread: false, showFullTranscript: true,
    preserveServerUserMessages: false, isBackgroundSubagentsEnabled: false, requestUserInputAsyncUiEnabled: false,
    modelProvider: "openai", showStrictReviewNotices: false, transcriptBlock: block, turnKey: "old-key",
    estimatedHeightPx: 99, replyChain: { id: "chain" } }];
  const base = { turn, requests, isLatestTurn: true, isAeonThread: false, showFullTranscript: true,
    preserveServerUserMessages: false, isBackgroundSubagentsEnabled: false, requestUserInputAsyncUiEnabled: false,
    modelProvider: "openai", showStrictReviewNotices: false, turnSearchKey: "search" };
  const result = expandTurnIntoTranscriptEntries({ baseTurnEntry: base, collapseActivityBeforeAssistant: false, previousEntries: previous }, deps);
  assert.equal(result[0].turnKey, "old-key");
  assert.equal(result[0].estimatedHeightPx, 99);
  assert.equal(result[0].transcriptBlock, block);
});
