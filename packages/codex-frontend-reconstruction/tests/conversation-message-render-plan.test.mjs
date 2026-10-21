import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildConversationMessageRenderPlan,
  getLastAssistantBlockKey,
  isConversationMessageBlock,
} from '../build/ConversationMessageRenderPlan.js';

const base = { isTurnInProgress: false };
const deps = {
  partitionActivities: (items) => [{ type: 'activity', items }],
  getSpecialActivityResult: (item) => item.specialResult ?? null,
  hasPersistentActivity: (item) => item.type !== 'reasoning' && item.type !== 'automatic-approval-review',
};
const plan = (blocks, options = {}, dependencies = deps) =>
  buildConversationMessageRenderPlan(blocks, { ...base, ...options }, dependencies);

const user = (key, extra = {}) => ({ type: 'user-message', key, item: { type: 'user-message', id: key, content: key }, ...extra });
const assistant = (key, extra = {}) => ({ type: 'assistant-message', key, item: { type: 'assistant-message', id: key, completed: true, content: '  Hello  ' }, ...extra });
const group = (key, extra = {}) => ({ type: 'agent-activity', key, items: [{ type: 'exec', id: 'tool-1' }], ...extra });

test('routes the five compiled transcript block kinds in order', () => {
  const result = plan([user('u'), group('g'), { type: 'activity-item', key: 'a', item: { type: 'exec' } }, assistant('m'),
    { type: 'generated-images', key: 'images', items: [{ src: 'a.png' }] }]);
  assert.deepEqual(result.nodes.map((node) => node.kind), [
    'user-message', 'activity-group', 'activity-item', 'assistant-message', 'generated-images',
  ]);
  assert.deepEqual(result.nodes.map((node) => node.key), ['u', 'g', 'a', 'm', 'images']);
});

test('filters invalid generated image entries using the compiled src predicate', () => {
  const result = plan([{ type: 'generated-images', key: 'images', items: [
    { src: 'image.png' }, { src: null }, { url: 'no-src.png' }, { src: '' },
  ] }]);
  assert.equal(result.nodes.length, 1);
  assert.deepEqual(result.nodes[0].images, [{ src: 'image.png' }, { src: '' }]);
  assert.equal(plan([{ type: 'generated-images', key: 'empty', items: [{ url: 'x' }] }]).nodes.length, 0);
});

test('marks last assistant message and copies trimmed text only when complete', () => {
  const result = plan([assistant('a'), assistant('b', { item: { type: 'assistant-message', completed: false, content: '  streaming  ' } })]);
  assert.equal(getLastAssistantBlockKey([assistant('a'), user('u'), assistant('b')]), 'b');
  assert.equal(result.nodes[0].assistantCopyText, 'Hello');
  assert.equal(result.nodes[0].isLastAssistantMessage, false);
  assert.equal(result.nodes[1].assistantCopyText, undefined);
  assert.equal(result.nodes[1].isLastAssistantMessage, true);
});

test('preserves first/last user message metadata and read-receipt opt-in', () => {
  const result = plan([user('u', { isFirstUserMessage: true, isLastUserMessage: true, readReceipt: { isRead: true } })],
    { showReadReceipts: true });
  const node = result.nodes[0];
  assert.equal(node.isFirstUserMessage, true);
  assert.equal(node.isLastUserMessage, true);
  assert.equal(node.showReadReceipt, true);
  assert.equal(node.canOwnLatestTurnFollowContent, false);
  assert.equal(node.isResponseContent, false);
});

test('marks the first response boundary on the first qualifying response only', () => {
  const result = plan([user('u'), group('g'), assistant('a'), assistant('b')], { hasFirstResponseBoundary: true });
  assert.deepEqual(result.nodes.map((node) => node.ownsFirstResponseBoundary), [false, true, false, false]);
  assert.deepEqual(result.gapBeforeNodeIndexes, [1, 2, 3]);
});

test('splits agent activities with indexed keys, preserving special external results', () => {
  const result = plan([group('g')], {}, {
    ...deps,
    partitionActivities: (items) => [
      { type: 'activity', items },
      { type: 'result', result: { external: true } },
    ],
  });
  assert.deepEqual(result.nodes.map((node) => node.key), ['g:0', 'g:1']);
  assert.deepEqual(result.nodes.map((node) => node.kind), ['activity-group', 'activity-result']);
  assert.equal(result.nodes[1].canOwnLatestTurnFollowContent, false);
});

test('suppresses visually empty activity partitions rather than generating phantom rows', () => {
  const result = plan([group('g')], {}, {
    ...deps,
    partitionActivities: () => [{ type: 'activity', items: [] }, { type: 'activity', items: [{ type: 'reasoning' }] }],
    hasRenderableActivity: (items) => items.some((item) => item.type === 'exec'),
  });
  assert.equal(result.nodes.length, 0);
});

test('activity activeness matches in-progress, Aeon, collapsing, sleeping and persistent rules', () => {
  const active = plan([group('g')], { isTurnInProgress: true });
  assert.equal(active.nodes[0].isActive, true);
  assert.equal(plan([group('g', { collapseWhenPossible: true })], { isTurnInProgress: true }).nodes[0].isActive, false);
  assert.equal(plan([group('g')], { isTurnInProgress: true, isAeonThread: true }).nodes[0].isActive, false);
  assert.equal(plan([group('g')], { isTurnInProgress: true, isAeonThread: true, isActiveAeonTurn: true }).nodes[0].isActive, true);
  assert.equal(plan([group('g')], { isTurnInProgress: true, footerStatus: 'sleeping' }).nodes[0].isActive, false);
  assert.equal(plan([group('g', { items: [{ type: 'reasoning' }] })], { isTurnInProgress: true, footerStatus: 'done' }).nodes[0].isActive, false);
});

test('external MCP results get their own result presentation and bypass the standard activity item', () => {
  const result = plan([{ type: 'activity-item', key: 'call', item: { type: 'mcp-tool-call', specialResult: 'AUTOMATION' } }],
    { isAeonThread: true });
  assert.equal(result.nodes[0].kind, 'activity-result');
  assert.equal(result.nodes[0].result, 'AUTOMATION');
  assert.equal(plan([{ type: 'activity-item', key: 'call', item: { type: 'mcp-tool-call', specialResult: 'AUTOMATION' } }]).nodes[0].kind, 'activity-item');
});

test('non-message subagent activities use dedicated row presentation', () => {
  const result = plan([{ type: 'activity-item', key: 'sub', item: { type: 'subagent-activity', isMessage: false } }],
    { isTurnInProgress: true });
  assert.equal(result.nodes[0].presentation, 'subagent');
  assert.equal(result.nodes[0].isActive, true);
});

test('reserved thinking status renders a stable slot while preserving visibility flags', () => {
  const result = plan([], { reserveThinkingStatusSpace: true, showThinkingStatus: false });
  assert.equal(result.nodes[0].kind, 'thinking-status-slot');
  assert.equal(result.nodes[0].showThinking, false);
  assert.equal(result.nodes[0].canOwnLatestTurnFollowContent, false);
  assert.equal(result.nodes[0].isResponseContent, false);
});

test('compact typing omits a preceding gap and can follow content', () => {
  const result = plan([user('u')], { reserveThinkingStatusSpace: true, useCompactTyping: true, showThinkingStatus: true });
  assert.deepEqual(result.nodes.map((node) => node.kind), ['user-message', 'typing-status-slot']);
  assert.deepEqual(result.gapBeforeNodeIndexes, []);
  assert.deepEqual(result.followContentNodeIndexes, [1]);
  assert.equal(result.nodes[1].isResponseContent, false);
});

test('thinking placeholder and fixed in-progress content are appended in the compiled order', () => {
  const result = plan([user('u')], { isTurnInProgress: true, showThinkingStatus: true, showInProgressFixedContent: true });
  assert.deepEqual(result.nodes.map((node) => node.kind), ['user-message', 'thinking-placeholder', 'in-progress-fixed-content']);
  assert.equal(result.nodes.at(-1).canOwnLatestTurnFollowContent, false);
  assert.equal(result.footerNodeIndex, 1);
});

test('footer stays with the last follow-eligible node or falls back to last node', () => {
  assert.equal(plan([user('u'), group('g')]).footerNodeIndex, 1);
  assert.equal(plan([assistant('a'), group('g')]).footerNodeIndex, 0);
  assert.equal(plan([]).footerNodeIndex, -1);
  assert.equal(plan([user('u')]).footerNodeIndex, 0);
});

test('footer suppression and extras suppression prevent transient status rows', () => {
  assert.equal(plan([], { showThinkingStatus: true, footerStatus: 'sleeping' }).nodes.length, 0);
  assert.equal(plan([], { showThinkingStatus: true, includeTurnExtras: false }).nodes.length, 0);
  assert.equal(plan([], { showInProgressFixedContent: true, isTurnInProgress: false }).nodes.length, 0);
});

test('rejects malformed blocks without pretending to know their structure', () => {
  assert.equal(isConversationMessageBlock({ type: 'user-message', key: 'u', item: {} }), true);
  assert.equal(isConversationMessageBlock({ type: 'assistant-message', key: 'a' }), false);
  assert.equal(isConversationMessageBlock({ type: 'agent-activity', key: 'g', items: [] }), true);
  assert.equal(isConversationMessageBlock({ type: 'future-message', key: 'x' }), false);
});


test('standalone activity items can request the original activity-unit renderer', () => {
  const result = plan([{ type: 'activity-item', key: 'exec', item: { type: 'exec' } }], {}, {
    ...deps, shouldRenderActivityAsUnit: (item) => item.type === 'exec',
  });
  assert.equal(result.nodes[0].presentation, 'activity-units');
  assert.equal(plan([{ type: 'activity-item', key: 'cmd', item: { type: 'exec' } }]).nodes[0].presentation, 'ordinary');
});


test('in-progress extras forward todo/diff and blocking state to the host renderer', () => {
  const diff = { type: 'turn-diff', id: 'd' };
  const todo = { type: 'todo-list', id: 't' };
  const result = plan([], { isTurnInProgress: true, showInProgressFixedContent: true,
    todoListItem: todo, unifiedDiffItem: diff, hasBlockingRequest: true });
  assert.equal(result.nodes.length, 1);
  assert.equal(result.nodes[0].kind, 'in-progress-fixed-content');
  assert.equal(result.nodes[0].todoListItem, todo);
  assert.equal(result.nodes[0].unifiedDiffItem, diff);
  assert.equal(result.nodes[0].hasBlockingRequest, true);
});
