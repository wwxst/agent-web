import test from 'node:test';
import assert from 'node:assert/strict';
import { getVoiceSubagentThreadIds, projectLiveVoiceBlocks } from '../build/LiveVoiceBlockProjection.js';

const turn = { turnId: 't1', items: [
  { id: 's1', type: 'subAgentActivity', agentThreadId: 'agent-a' },
  { id: 's2', type: 'subAgentActivity', agentThreadId: 'agent-a' },
  { id: 'command', type: 'exec' },
] };
const base = { type: 'base', conversationId: 'chat1', hostId: 'local', turnId: 't1' };
const makeContext = (overrides = {}) => ({
  conversationId: 'chat1', cwd: 'repo', hostId: 'local', canonical: true,
  isVoiceSessionActive: true, showNux: false, openAIFormElicitationsEnabled: false,
  turnsById: new Map([['t1', turn]]), baseEntriesByTurnId: new Map([['t1', base]]),
  historyEntityKeysByTurnId: new Map([['t1', 'history1']]),
  turnPresentationContexts: new Map([['t1', { kind: 'default' }]]),
  getPresentationMetadata: () => new Map(),
  estimateUserVoiceHeight: 40, estimateAssistantVoiceHeight: 72,
  estimatePendingArtifactHeight: 80, estimateNuxHeight: 16,
  ...overrides,
});
const adapters = {
  user: (_base, _turn, block) => ({ type: 'base', from: `user-${block.itemId}` }),
  segment: (_base, _turn, block, _presentation, _formsEnabled, subagents) => ({ type: 'base', from: 'segment', agentIds: [...(subagents ?? [])] }),
  item: (_base, _turn, block) => ({ type: 'base', from: block.itemId }),
  image: (_base, block) => ({ type: 'voice-image', from: block.itemId }),
  presentation: (_base, _turn, block) => ({ type: 'voice-presentation', from: block.presentationId }),
  resources: () => ({ type: 'voice-resources' }),
};

test('subagent IDs are collected by the source turn ID', () => {
  assert.deepEqual(getVoiceSubagentThreadIds([
    { type: 'bem-item', turnId: 't1', itemId: 's1', presentation: 'subagent' },
    { type: 'bem-item', turnId: 't1', itemId: 'command', presentation: 'subagent' },
  ], new Map([['t1', turn]])), new Map([['t1', new Set(['agent-a'])]]));
});

test('adjacent voice items are flushed as a single transcript entry', () => {
  const blocks = [
    { type: 'voice-item', item: { id: 'v1', role: 'user', text: 'Hello' } },
    { type: 'voice-item', item: { id: 'v2', role: 'assistant', text: 'Hi' } },
    { type: 'session-divider', sessionId: 'sess2' },
    { type: 'voice-item', item: { id: 'v3', role: 'user', text: 'Again' } },
  ];
  const output = projectLiveVoiceBlocks(blocks, makeContext({ showNux: true }), adapters);
  assert.deepEqual(output.map((x) => x.type), ['voice-nux','voice-transcript','voice-session-boundary','voice-transcript']);
  assert.equal(output[1].estimatedHeightPx, 112);
  assert.equal(output[3].turnKey, 'realtime-voice:transcript:v3');
});

test('terminal session markers are skipped and pending artifacts survive', () => {
  const output = projectLiveVoiceBlocks([
    { type: 'session-ended' },
    { type: 'pending-artifact', turnId: 't1', key: 'artifact1' },
  ], makeContext(), adapters);
  assert.equal(output.length, 1);
  assert.equal(output[0].isInProgress, false);
  assert.equal(output[0].turnKey, 'artifact1');
});

test('projected user/segment/item entries retain history source metadata', () => {
  const output = projectLiveVoiceBlocks([
    { type: 'bem-user', turnId: 't1', itemId: 'u1' },
    { type: 'bem-segment', turnId: 't1', itemIds: ['s1'] },
    { type: 'bem-item', turnId: 't1', itemId: 's1', presentation: 'subagent' },
  ], makeContext(), adapters);
  assert.deepEqual(output[0].liveVoiceSource.itemIds, ['u1']);
  assert.deepEqual(output[1].agentIds, ['agent-a']);
  assert.deepEqual(output[2].liveVoiceSource.itemIds, ['s1', 's2']);
});

test('image presentations use image adapter without attaching a history source', () => {
  const output = projectLiveVoiceBlocks([
    { type: 'bem-item', turnId: 't1', itemId: 'img1', presentation: 'image' },
  ], makeContext(), adapters);
  assert.deepEqual(output[0], { type: 'voice-image', from: 'img1' });
});

test('created thread presentation excludes entries that are not its first presentation', () => {
  const blocks = [
    { type: 'bem-presentation', turnId: 't1', itemId: 's1', presentationId: 'p2', presentation: { type: 'created-thread' } },
    { type: 'bem-presentation', turnId: 't1', itemId: 's1', presentationId: 'p1', presentation: { type: 'created-thread' } },
    { type: 'bem-resources', turnId: 't1' },
  ];
  const output = projectLiveVoiceBlocks(blocks, makeContext({
    getPresentationMetadata: () => new Map([['s1', { firstPresentationId: 'p1', results: [] }]]),
  }), adapters);
  assert.deepEqual(output.map((item) => item.type), ['voice-presentation','voice-resources']);
  assert.equal(output[0].from, 'p1');
});
