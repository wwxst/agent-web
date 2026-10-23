import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getEntrySourceTurnIdWithPredicate,
  markMostRecentTurn,
  coalesceAdjacentVoiceItems,
  reconcileProjectedTimeline,
  findTranscriptTailFlushTurnIds,
  isBemLifecycleRecord,
} from '../build/LiveTimelineMerge.js';

const base = (entry) => entry.type === 'base';
const source = (entry) => getEntrySourceTurnIdWithPredicate(entry, base);

test('source turn ID prefers the base entry, then projected sourceTurnId', () => {
  assert.equal(source({ type: 'base', turnId: 't1' }), 't1');
  assert.equal(source({ type: 'voice-presentation', sourceTurnId: 't2' }), 't2');
  assert.equal(source({ type: 'voice-session-boundary', sessionId: 's' }), null);
});

test('markMostRecentTurn flags only the last base turn and keeps voice entries intact', () => {
  const voice = { type: 'voice-transcript', sourceTurnId: 't1' };
  const out = markMostRecentTurn([
    { type: 'base', turnId: 't1', showInProgressFixedContent: true },
    voice,
    { type: 'base', turnId: 't2', showInProgressFixedContent: true },
  ], base);
  assert.equal(out[0].isMostRecentTurn, false);
  assert.equal(out[0].showInProgressFixedContent, false);
  assert.equal(out[1], voice);
  assert.equal(out[2].isMostRecentTurn, true);
  assert.equal(out[2].showInProgressFixedContent, true);
});

test('coalesces only adjacent voice segments of the same role', () => {
  const input = [
    { type: 'voice-item', item: { role: 'assistant', text: 'A', completed: false } },
    { type: 'voice-item', item: { role: 'assistant', text: 'B', completed: true } },
    { type: 'other' },
    { type: 'voice-item', item: { role: 'user', text: 'C' } },
    { type: 'voice-item', item: { role: 'assistant', text: 'D' } },
  ];
  const out = coalesceAdjacentVoiceItems(input);
  assert.equal(out.length, 4);
  assert.deepEqual(out[0].item, { role: 'assistant', text: 'AB', completed: true });
  assert.equal(out[2].item.text, 'C');
});

test('when no projected anchors exist append projected blocks excluding session boundaries', () => {
  const existing = [{ type: 'base', turnId: 't1' }];
  const projected = [{ type: 'voice-session-boundary' }, { type: 'voice-presentation', sourceTurnId: 't2' }];
  assert.deepEqual(reconcileProjectedTimeline(existing, projected, new Set(['t2']), source, base), [existing[0], projected[1]]);
});

test('reconciliation replaces projected base entries and preserves untouched entries', () => {
  const existing = [
    { type: 'note', value: 'prefix' },
    { type: 'base', turnId: 't1' },
    { type: 'note', value: 'between' },
    { type: 'base', turnId: 't2' },
    { type: 'base', turnId: 't3' },
  ];
  const projected = [
    { type: 'voice-presentation', sourceTurnId: 't1' },
    { type: 'voice-presentation', sourceTurnId: 't2' },
  ];
  const result = reconcileProjectedTimeline(existing, projected, new Set(['t1', 't2']), source, base);
  assert.deepEqual(result, [existing[0], projected[0], existing[2], projected[1], existing[4]]);
});

test('session-boundary defers source-less projected entries to the next sourced block', () => {
  const existing = [{ type: 'base', turnId: 'a' }, { type: 'note' }, { type: 'base', turnId: 'b' }];
  const projected = [
    { type: 'voice-presentation', sourceTurnId: 'a' },
    { type: 'voice-session-boundary' },
    { type: 'voice-nux' },
    { type: 'voice-presentation', sourceTurnId: 'b' },
  ];
  const out = reconcileProjectedTimeline(existing, projected, new Set(['a', 'b']), source, base);
  assert.deepEqual(out, [projected[0], existing[1], projected[2], projected[3]]);
});

test('session-boundary deferrals flush at the end of the stream', () => {
  const existing = [{ type: 'base', turnId: 'a' }];
  const projected = [
    { type: 'voice-presentation', sourceTurnId: 'a' },
    { type: 'voice-session-boundary' },
    { type: 'voice-nux', id: 'end' },
  ];
  const out = reconcileProjectedTimeline(existing, projected, new Set(['a']), source, base);
  assert.deepEqual(out, [projected[0], projected[2]]);
});

test('filters only tail-flush-only turns', () => {
  const turns = [
    { turnId: 'tail', params: { input: { source: 'transcript_tail_flush' } }, items: [] },
    { turnId: 'genuine', params: { input: { source: 'transcript_tail_flush' } }, items: [{ type: 'userMessage', source: 'manual' }] },
    { turnId: 'notTail', params: { input: { source: 'manual' } }, items: [] },
  ];
  assert.deepEqual(
    findTranscriptTailFlushTurnIds(turns, (input) => input?.source ?? null, (item) => item.source ?? null),
    new Set(['tail']),
  );
});

test('BEM lifecycle predicate accepts only lifecycle categories', () => {
  assert.equal(isBemLifecycleRecord({ type: 'bem-item-started' }), true);
  assert.equal(isBemLifecycleRecord({ type: 'bem-presentation-committed' }), true);
  assert.equal(isBemLifecycleRecord({ type: 'session-started' }), false);
});
