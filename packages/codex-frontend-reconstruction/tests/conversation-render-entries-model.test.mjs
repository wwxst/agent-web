import assert from "node:assert/strict";
import test from "node:test";
import { buildConversationRenderEntries } from "../build/ConversationRenderEntriesModel.js";

function makeTurn(id, overrides = {}) {
  return {
    turnId: id,
    turnSearchKey: `search-${id}`,
    requests: [],
    isLatestTurn: false,
    turn: {
      status: "complete",
      turnStartedAtMs: 1_000,
      finalAssistantStartedAtMs: 2_000,
      params: { input: ["hello"], threadId: "thread-1" },
      items: [{ id: `${id}-assistant`, type: "agentMessage" }],
    },
    ...overrides,
  };
}

function deps(overrides = {}) {
  return {
    isSpecialEntry: (entry) => entry.type === "special-row",
    expandPreservedTurn: ({ baseTurnEntry }) => [baseTurnEntry],
    ...overrides,
  };
}

test("projects ordinary turn rows with stable keys, numbering and latest-turn metadata", () => {
  const first = makeTurn("1");
  const latest = makeTurn("2", { isLatestTurn: true });
  const result = buildConversationRenderEntries({
    baseEntries: [first, latest],
    conversationId: "conversation-1",
    hostId: "local",
    cwd: "C:/work",
    isThreadResuming: true,
    showInProgressFixedContent: true,
    nowMs: 10_000_000,
  }, deps());

  assert.equal(result.entries.length, 2);
  assert.equal(result.entries[0].turnKey, "history-content:turn:1");
  assert.equal(result.entries[0].turnNumber, 1);
  assert.equal(result.entries[0].totalTurnCount, 2);
  assert.equal(result.entries[0].isMostRecentTurn, false);
  assert.equal(result.entries[1].turnKey, "history-content:turn:2");
  assert.equal(result.entries[1].turnNumber, 2);
  assert.equal(result.entries[1].isMostRecentTurn, true);
  assert.equal(result.entries[1].isWorkStatusLoading, true);
  assert.equal(result.entries[1].showInProgressFixedContent, true);
  assert.equal(result.latestRenderedTurnKey, "history-content:turn:2");
  assert.equal(result.entries[0].conversationId, "conversation-1");
});

test("special rows keep their stable object when their estimated height is unchanged", () => {
  const special = { type: "special-row", turnKey: "special-1", estimatedHeightPx: 32 };
  const previous = { ...special, conversationId: "conversation-1" };
  const result = buildConversationRenderEntries({
    baseEntries: [special], previousEntries: [previous], conversationId: "conversation-1",
  }, deps());
  assert.equal(result.entries[0], previous);
});

test("expands preserved-server-message turns once and counts multiple transcript rows as one turn", () => {
  const base = makeTurn("1", { preserveServerUserMessages: true });
  let expansionSawMostRecent = false;
  const result = buildConversationRenderEntries({
    baseEntries: [base], conversationId: "conversation-1", showFullTranscript: false,
  }, deps({
    expandPreservedTurn: ({ baseTurnEntry }) => {
      expansionSawMostRecent = baseTurnEntry.isMostRecentTurn === true;
      return [
        { ...baseTurnEntry, turnKey: `${baseTurnEntry.turnSearchKey}:transcript:u1`, transcriptBlock: { type: "user-message", key: "u1", item: { searchItemId: "u1", sentAtMs: 100 } } },
        { ...baseTurnEntry, turnKey: `${baseTurnEntry.turnSearchKey}:transcript:a1`, transcriptBlock: { type: "assistant-message", key: "a1", item: { searchItemId: "a1", sentAtMs: 200 } }, includeTranscriptTurnExtras: true },
      ];
    },
  }));
  assert.equal(expansionSawMostRecent, true);
  assert.equal(result.entries.length, 2);
  assert.equal(result.entries[0].turnNumber, 1);
  assert.equal(result.entries[1].turnNumber, 1);
  assert.equal(result.entries[0].totalTurnCount, 1);
  assert.equal(result.entries[1].totalTurnCount, 1);
  assert.equal(result.entries[1].includeTranscriptTurnExtras, true);
});

test("calculates timestamp separators for ordinary turns and resets adjacency across excluded entries", () => {
  const old = makeTurn("1", {
    turn: {
      status: "complete", turnStartedAtMs: 1_000, finalAssistantStartedAtMs: 2_000,
      params: { input: ["old"] }, items: [{ id: "a1", type: "agentMessage" }],
    },
  });
  const excluded = { type: "special-row", turnKey: "boundary", estimatedHeightPx: 20 };
  const recent = makeTurn("2", {
    turn: {
      status: "complete", turnStartedAtMs: 8_000_000, finalAssistantStartedAtMs: 9_000_000,
      params: { input: ["new"] }, items: [{ id: "a2", type: "agentMessage" }],
    },
  });
  const next = makeTurn("3", {
    turn: {
      status: "complete", turnStartedAtMs: 13_000_000, finalAssistantStartedAtMs: 13_000_100,
      params: { input: ["next"] }, items: [{ id: "a3", type: "agentMessage" }],
    },
  });
  const result = buildConversationRenderEntries({
    baseEntries: [old, excluded, recent, next], conversationId: "conversation-1", nowMs: 14_000_000,
  }, deps());
  assert.equal(result.entries[0].timestampSeparatorAtMs, 1_000);
  assert.equal(result.entries[1].timestampSeparatorAtMs, undefined);
  assert.equal(result.entries[2].timestampSeparatorAtMs, null);
  assert.equal(result.entries[3].timestampSeparatorAtMs, 13_000_000);
});

test("places compact Aeon timestamp markers and normalizes external channel labels", () => {
  const base = makeTurn("1", { isAeonThread: true, preserveServerUserMessages: true });
  const result = buildConversationRenderEntries({
    baseEntries: [base], conversationId: "conversation-1", isAeonThread: true,
    showFullTranscript: false, compactAeonTypingEnabled: true, nowMs: 3_000_000,
  }, deps({
    expandPreservedTurn: ({ baseTurnEntry }) => [
      { ...baseTurnEntry, turnKey: "search-1:transcript:u1", transcriptBlock: { type: "user-message", key: "u1", item: { searchItemId: "u1", sentAtMs: 1_000, externalSurface: "imessage" } }, replyChain: { id: "chain-1", rootItemId: "u1" } },
      { ...baseTurnEntry, turnKey: "search-1:transcript:a1", transcriptBlock: { type: "assistant-message", key: "a1", item: { searchItemId: "a1", sentAtMs: 2_000_000, externalDelivery: { state: "sent", provider: "imessage" } } }, replyChain: { id: "chain-1", rootItemId: "u1" } },
    ],
  }));
  assert.equal(result.initialAeonMessageSentAtMs, 1_000);
  assert.equal(result.entries[0].aeonThreadTimestampMarkerSentAtMs, 1_000);
  assert.equal(result.entries[0].aeonChannelChange, "phone");
  assert.equal(result.entries[1].aeonThreadTimestampMarkerSentAtMs, 2_000_000);
  assert.equal(result.entries[1].aeonChannelChange, undefined);
  assert.equal(result.entries[0].showReplyQuote, true);
  assert.equal(result.entries[1].showReplyQuote, false);
  assert.equal(result.entries[1].replyChain.hasInterspersedMessages, false);
});

test("uses injected duplicate-turn policy rather than guessing which Aeon turns are redundant", () => {
  const keep = makeTurn("keep", { requests: [] });
  const remove = makeTurn("remove", { requests: [], turn: { ...makeTurn("remove").turn, params: { input: [] } } });
  const result = buildConversationRenderEntries({
    baseEntries: [keep, remove], conversationId: "conversation-1", isAeonThread: true, showFullTranscript: true,
  }, deps({
    findRedundantAeonTurnObjects: (candidateTurns) => new Set(candidateTurns.filter((turn) => turn != null && turn.params.input.length === 0)),
  }));
  assert.equal(result.entries.length, 1);
  assert.equal(result.entries[0].turnId, "keep");
});

test("converts historical summary entries to item IDs without retaining the full turn payload", () => {
  const base = makeTurn("history", { historyEntityKey: "history-entity" });
  const result = buildConversationRenderEntries({
    baseEntries: [base], conversationId: "conversation-1",
  }, deps());
  assert.equal(result.entries[0].turn, undefined);
  assert.deepEqual(result.entries[0].turnItemIds, ["history-assistant"]);
  assert.equal(result.entries[0].turnStatus, "complete");
});

test("reuses unchanged render rows from the previous projection", () => {
  const base = makeTurn("1", { isLatestTurn: true });
  const first = buildConversationRenderEntries({
    baseEntries: [base], conversationId: "conversation-1", nowMs: 10_000_000,
  }, deps());
  const second = buildConversationRenderEntries({
    baseEntries: [base], previousEntries: first.entries, conversationId: "conversation-1", nowMs: 10_000_000,
  }, deps());
  assert.equal(second.entries[0], first.entries[0]);
});

test("places thread-handoff operation on the surviving prior target, falling back to the latest row", () => {
  const first = makeTurn("1");
  const second = makeTurn("2", { isLatestTurn: true });
  const previous = [{ turnKey: "history-content:turn:1", threadHandoffOperation: { id: "handoff-1" } }];
  const anchored = buildConversationRenderEntries({
    baseEntries: [first, second], previousEntries: previous, conversationId: "conversation-1",
    threadHandoffOperation: { id: "handoff-1", kind: "handoff" },
  }, deps());
  assert.equal(anchored.entries[0].threadHandoffOperation.id, "handoff-1");
  assert.equal(anchored.entries[1].threadHandoffOperation, undefined);

  const fallback = buildConversationRenderEntries({
    baseEntries: [first, second], conversationId: "conversation-1",
    threadHandoffOperation: { id: "handoff-2", kind: "handoff" },
  }, deps());
  assert.equal(fallback.entries[0].threadHandoffOperation, undefined);
  assert.equal(fallback.entries[1].threadHandoffOperation.id, "handoff-2");
});

test("projected transcript rows feed directly into virtualizer geometry", async () => {
  const { buildThreadVirtualizerLayout } = await import("../build/ThreadVirtualizerModel.js");
  const base = makeTurn("1", { preserveServerUserMessages: true });
  const result = buildConversationRenderEntries({
    baseEntries: [base], conversationId: "conversation-1", isAeonThread: true, showFullTranscript: false,
  }, deps({
    expandPreservedTurn: ({ baseTurnEntry }) => [
      { ...baseTurnEntry, isAeonThread: true, turnKey: "search-1:transcript:u1", estimatedHeightPx: 128, transcriptBlock: { type: "user-message", key: "u1", item: { sentAtMs: 100 } }, replyChain: { id: "chain-1", rootItemId: "u1" } },
      { ...baseTurnEntry, isAeonThread: true, turnKey: "search-1:transcript:a1", estimatedHeightPx: 144, transcriptBlock: { type: "assistant-message", key: "a1", item: { sentAtMs: 200 } }, replyChain: { id: "chain-2", rootItemId: "a1" } },
    ],
  }));
  const layout = buildThreadVirtualizerLayout({
    entries: result.entries.map((entry) => ({
      turnKey: entry.turnKey,
      estimatedHeightPx: entry.estimatedHeightPx,
      minHeightPx: entry.minHeightPx,
      gapBeforePx: entry.gapBeforePx,
    })),
    gapPx: 0,
  });
  assert.deepEqual(layout.heightsPx, [128, 144]);
  assert.deepEqual(layout.gapsBeforePx, [0, 32]);
  assert.equal(layout.totalHeightPx, 304);
});


test("resets compact Aeon reveal state when the transcript is not in compact Aeon mode", () => {
  const revealState = { hasSeededInitialSnapshot: true, messageStates: new Map([["m1", "pending"]]) };
  buildConversationRenderEntries({
    baseEntries: [makeTurn("1")], conversationId: "conversation-1",
    isAeonThread: false, showFullTranscript: false,
    compactAeonAssistantMessageRevealState: revealState,
  }, deps());
  assert.equal(revealState.hasSeededInitialSnapshot, false);
  assert.equal(revealState.messageStates.size, 0);
});
