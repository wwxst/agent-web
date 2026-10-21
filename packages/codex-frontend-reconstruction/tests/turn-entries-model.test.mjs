import assert from 'node:assert/strict';
import test from 'node:test';
import {
  areTurnEntriesEqual,
  buildReplyChainIndex,
  estimateTranscriptEntryHeight,
  findTurnSearchKeyForItem,
  isRenderableTranscriptEntry,
  sameSet,
  sameTranscriptBlock,
  shouldInsertTimestampSeparator,
} from '../build/TurnEntriesModel.js';

const deepEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const userEntry = (id, chainId, extra = {}) => ({
  transcriptBlock: { type: 'user-message', key: `block-${id}`, item: { searchItemId: id, type: 'userMessage' } },
  replyChain: { id: chainId },
  turnSearchKey: `turn-${id}`,
  ...extra,
});

test('reply-chain index preserves the first root item and detects interspersed chains', () => {
  const index = buildReplyChainIndex([
    userEntry('u1', 'A'),
    userEntry('u2', 'A'),
    userEntry('u3', 'B'),
    userEntry('u4', 'A'),
  ]);
  assert.deepEqual(index.get('A'), { id: 'A', rootItemId: 'u1', hasInterspersedMessages: true });
  assert.deepEqual(index.get('B'), { id: 'B', rootItemId: 'u3', hasInterspersedMessages: false });
});

test('reply-chain index ignores non-renderable and non-message entries', () => {
  const entries = [
    { transcriptBlock: { type: 'voice-transcript' }, replyChain: { id: 'A' } },
    { transcriptBlock: { type: 'activity-item' }, replyChain: { id: 'A' } },
    userEntry('u1', 'A'),
  ];
  const index = buildReplyChainIndex(entries, isRenderableTranscriptEntry);
  assert.equal(index.size, 1);
  assert.equal(index.get('A').rootItemId, 'u1');
});

test('timestamp separators follow invalid timestamp, local day, and 30 minute boundary', () => {
  const t = new Date(2026, 9, 21, 10, 0, 0).getTime();
  assert.equal(shouldInsertTimestampSeparator(undefined, t), true);
  assert.equal(shouldInsertTimestampSeparator(t, Number.NaN), false);
  assert.equal(shouldInsertTimestampSeparator(t, t + 29 * 60_000), false);
  assert.equal(shouldInsertTimestampSeparator(t, t + 30 * 60_000), true);
  const nextDay = new Date(2026, 9, 22, 0, 1, 0).getTime();
  assert.equal(shouldInsertTimestampSeparator(t, nextDay), true);
});

test('item lookup searches from the newest entry and skips agent messages in summary-only turns', () => {
  const entries = [
    { turnSearchKey: 'older', turn: { items: [{ id: 'x', type: 'tool' }] } },
    { turnSearchKey: 'newer-summary', activitySummaryWithoutAssistant: true, turn: { items: [{ id: 'x', type: 'agentMessage' }] } },
    { turnSearchKey: 'newer-tool', activitySummaryWithoutAssistant: true, turn: { items: [{ id: 'x', type: 'tool' }] } },
  ];
  assert.equal(findTurnSearchKeyForItem(entries, 'x'), 'newer-tool');
  assert.equal(findTurnSearchKeyForItem([{ turnSearchKey: 'history', turnItemIds: ['old'] }], 'old'), 'history');
  assert.equal(findTurnSearchKeyForItem(entries, 'missing'), null);
});

test('virtualized transcript heights match the compiled constants', () => {
  assert.equal(estimateTranscriptEntryHeight({ type: 'agent-activity' }), 48);
  assert.equal(estimateTranscriptEntryHeight({ type: 'activity-item' }), 96);
  assert.equal(estimateTranscriptEntryHeight({ type: 'assistant-message' }), 144);
  assert.equal(estimateTranscriptEntryHeight({ type: 'assistant-message', attachedActivityItems: [1, 2] }), 240);
  assert.equal(estimateTranscriptEntryHeight({ type: 'generated-images' }), 180);
  assert.equal(estimateTranscriptEntryHeight({ type: 'user-message' }), 128);
});

test('set comparison is order-independent and handles missing sets', () => {
  assert.equal(sameSet(new Set(['a', 'b']), new Set(['b', 'a'])), true);
  assert.equal(sameSet(new Set(['a']), new Set(['b'])), false);
  assert.equal(sameSet(undefined, undefined), true);
  assert.equal(sameSet(undefined, new Set()), false);
});

test('transcript block equality follows type/key and assistant handoff/activity keys', () => {
  const a = { type: 'assistant-message', key: 'a', item: { computerHandoff: { x: 1 } }, attachedActivityItems: [{ key: 'activity-1' }] };
  const b = { type: 'assistant-message', key: 'a', item: { computerHandoff: { x: 1 } }, attachedActivityItems: [{ key: 'activity-1' }] };
  assert.equal(sameTranscriptBlock(a, b, deepEqual), true);
  assert.equal(sameTranscriptBlock(a, { ...b, attachedActivityItems: [{ key: 'activity-2' }] }, deepEqual), false);
  assert.equal(sameTranscriptBlock({ type: 'user-message', key: 'u' }, { type: 'user-message', key: 'u' }, deepEqual), true);
  assert.equal(sameTranscriptBlock(null, undefined, deepEqual), false);
});

test('entry memo equality catches history key and relevant display changes', () => {
  const base = {
    historyEntityKey: 'history-1',
    replyChain: { id: 'r' },
    transcriptBlock: { type: 'user-message', key: 'u', item: { searchItemId: 'u' } },
    supersededMcpAppWidgetCallIds: new Set(['x']),
    turn: { status: 'completed', items: [{ id: 'i1' }] },
    turnId: 'turn-1',
    turnKey: 'key-1',
    turnSearchKey: 'search-1',
  };
  assert.equal(areTurnEntriesEqual(base, { ...base }, deepEqual), true);
  assert.equal(areTurnEntriesEqual(base, { ...base, historyEntityKey: 'history-2' }, deepEqual), false);
  assert.equal(areTurnEntriesEqual(base, { ...base, turnStatus: 'failed' }, deepEqual), false);
  assert.equal(areTurnEntriesEqual(base, { ...base, supersededMcpAppWidgetCallIds: new Set(['y']) }, deepEqual), false);
});
