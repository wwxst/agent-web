import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLiveConversationTimeline } from '../build/LiveConversationTimelineCoordinator.js';

const makeTurn = (turnId, source, items = []) => ({ turnId, params: { input: { source } }, items });
const base = (entry) => entry.type === 'base';
const defaults = {
  isBaseTurnEntry: base,
  getInputSource: (input) => input?.source ?? null,
  getMessageSource: (item) => item.source ?? null,
};

test('no loaded history produces an empty timeline', () => {
  let called = false;
  assert.deepEqual(buildLiveConversationTimeline({
    ...defaults, entries: [{ type: 'base', turnId: 't1' }], turns: [],
    history: { isLoaded: false, records: [], timeline: null },
    createProjectedVoiceEntries: () => { called = true; return { entries: [], projectedTurnIds: new Set() }; },
  }), []);
  assert.equal(called, false);
});

test('fast path preserves entry identity with no history projection', () => {
  const entries = [{ type: 'base', turnId: 't1' }];
  const out = buildLiveConversationTimeline({
    ...defaults, entries, turns: [makeTurn('t1', 'manual')],
    history: { isLoaded: true, records: [], timeline: null },
    createProjectedVoiceEntries: () => { throw new Error('not expected'); },
  });
  assert.equal(out, entries);
});

test('tail-flush-only turns are filtered before the projection callback', () => {
  const entries = [{ type: 'base', turnId: 'flush' }, { type: 'base', turnId: 'keep' }];
  const out = buildLiveConversationTimeline({
    ...defaults, entries,
    turns: [makeTurn('flush', 'transcript_tail_flush'), makeTurn('keep', 'manual')],
    history: { isLoaded: true, records: [], timeline: null },
    createProjectedVoiceEntries: () => { throw new Error('not expected'); },
  });
  assert.deepEqual(out.map((item) => item.turnId), ['keep']);
  assert.equal(out[0].isMostRecentTurn, true);
});

test('projection merges realtime history while preserving an unprojected base entry', () => {
  const entries = [{ type: 'base', turnId: 't1' }, { type: 'base', turnId: 't2' }];
  const out = buildLiveConversationTimeline({
    ...defaults, entries,
    turns: [makeTurn('t1', 'manual'), makeTurn('t2', 'manual')],
    history: { isLoaded: true, records: [{ type: 'session-started' }], timeline: null },
    createProjectedVoiceEntries: ({ turnsById, baseEntriesByTurnId }) => {
      assert.equal(turnsById.size, 2);
      assert.equal(baseEntriesByTurnId.get('t1'), entries[0]);
      return { entries: [{ type: 'voice-presentation', sourceTurnId: 't1' }], projectedTurnIds: new Set(['t1']) };
    },
  });
  assert.deepEqual(out.map((item) => item.type), ['voice-presentation', 'base']);
  assert.equal(out[1].turnId, 't2');
  assert.equal(out[1].isMostRecentTurn, true);
});

test('inline turns from existing base entries supersede independently listed versions', () => {
  const inline = makeTurn('t1', 'manual', [{ id: 'new', type: 'userMessage', source: 'manual' }]);
  buildLiveConversationTimeline({
    ...defaults, entries: [{ type: 'base', turnId: 't1', turn: inline }],
    turns: [makeTurn('t1', 'manual', [])],
    history: { isLoaded: true, records: [{ type: 'session-started' }], timeline: null },
    createProjectedVoiceEntries: ({ turnsById }) => {
      assert.equal(turnsById.get('t1'), inline);
      return { entries: [], projectedTurnIds: new Set() };
    },
  });
});
