import test from 'node:test';
import assert from 'node:assert/strict';
import {
  inferLiveTurnPhase, initialFollowState, reduceFollowState, isStaticOrWatchingFollowMode,
  responseSpacerOverflow, serializeViewportFollow, readLatestTurnStatus,
} from '../build/LiveViewportFollowState.js';

test('default follow state is static', () => assert.deepEqual(initialFollowState(), { followMode: 'static' }));

test('prework starts watch, overflow enters prework follow, final answer enters user follow', () => {
  let s = reduceFollowState(initialFollowState(), { type: 'latest_turn_phase_changed', previousLatestTurnPhase: 'idle', latestTurnPhase: 'prework' });
  assert.equal(s.followMode, 'prework_watch');
  s = reduceFollowState(s, { type: 'latest_turn_follow_content_changed', latestTurnPhase: 'prework', followContentOverflowPx: 50 });
  assert.equal(s.followMode, 'prework_follow');
  s = reduceFollowState(s, { type: 'latest_turn_phase_changed', previousLatestTurnPhase: 'prework', latestTurnPhase: 'final_answer' });
  assert.equal(s.followMode, 'user_follow');
});

test('prework watch without overflow goes static at final answer', () => {
  const s = reduceFollowState({ followMode: 'prework_watch' }, { type: 'latest_turn_phase_changed', previousLatestTurnPhase: 'prework', latestTurnPhase: 'final_answer' });
  assert.equal(s.followMode, 'static');
});

test('a user-follow phase transition is preserved and explicit hold/placement returns static', () => {
  const state = { followMode: 'user_follow' };
  assert.equal(reduceFollowState(state, { type: 'latest_turn_phase_changed', previousLatestTurnPhase: 'prework', latestTurnPhase: 'idle' }), state);
  assert.equal(reduceFollowState(state, { type: 'hold_viewport' }).followMode, 'static');
  assert.equal(reduceFollowState(state, { type: 'latest_turn_placed' }).followMode, 'static');
  assert.equal(reduceFollowState(state, { type: 'latest_turn_removed' }).followMode, 'static');
});

test('scrolling away from bottom suspends follow after the 24px tolerance', () => {
  assert.equal(reduceFollowState({ followMode: 'user_follow' }, { type: 'scroll_distance_changed', distanceFromBottomPx: 24, latestTurnPhase: 'idle' }).followMode, 'user_follow');
  assert.equal(reduceFollowState({ followMode: 'user_follow' }, { type: 'scroll_distance_changed', distanceFromBottomPx: 25, latestTurnPhase: 'prework' }).followMode, 'prework_watch');
  assert.equal(reduceFollowState({ followMode: 'user_follow' }, { type: 'scroll_distance_changed', distanceFromBottomPx: 50, latestTurnPhase: 'final_answer' }).followMode, 'static');
  assert.equal(reduceFollowState({ followMode: 'prework_follow' }, { type: 'scroll_distance_changed', distanceFromBottomPx: 50, latestTurnPhase: 'prework' }).followMode, 'prework_watch');
});

test('explicit scroll-to-bottom enters user follow from any mode', () => {
  for (const followMode of ['static', 'prework_watch', 'prework_follow']) {
    assert.equal(reduceFollowState({ followMode }, { type: 'scroll_to_bottom' }).followMode, 'user_follow');
  }
});

test('static and watch follow modes can persist scroll metadata', () => {
  assert.equal(isStaticOrWatchingFollowMode('static'), true);
  assert.equal(isStaticOrWatchingFollowMode('prework_watch'), true);
  assert.equal(isStaticOrWatchingFollowMode('user_follow'), false);
});

test('completed turns are idle and in-progress commentary is prework', () => {
  assert.equal(inferLiveTurnPhase({ status: 'complete', items: [{ type: 'agentMessage', phase: 'final_answer' }] }), 'idle');
  assert.equal(inferLiveTurnPhase({ status: 'inProgress', items: [{ type: 'agentMessage', phase: 'commentary' }] }), 'prework');
  assert.equal(inferLiveTurnPhase({ status: 'inProgress', items: [], firstTurnWorkItemStartedAtMs: 1 }), 'prework');
  assert.equal(inferLiveTurnPhase({ status: 'inProgress', items: [], finalAssistantStartedAtMs: 2 }), 'final_answer');
  assert.equal(inferLiveTurnPhase({ status: 'inProgress', items: [{ type: 'agentMessage', phase: 'final_answer' }] }), 'final_answer');
});

test('latest steering user message ID is found in reverse order', () => {
  const result = readLatestTurnStatus({ status: 'inProgress', items: [
    { type: 'steeringUserMessage', restoreMessage: { id: 'old' } },
    { type: 'agentMessage', phase: 'commentary' },
    { type: 'steeringUserMessage', restoreMessage: { id: 'new' } },
  ] });
  assert.equal(result.latestSteeringUserMessageKey, 'new');
  assert.equal(result.phase, 'prework');
});

test('response spacer overflow and persistence use the 24px threshold', () => {
  const state = { followMode: 'static' };
  assert.equal(responseSpacerOverflow({ distanceFromBottomPx: 0, responseSpacerHeightPx: 100, scrollPaddingBottomPx: 10 }), 90);
  assert.deepEqual(serializeViewportFollow({ distanceFromBottomPx: 0, responseSpacerHeightPx: 100, scrollPaddingBottomPx: 10, scrollState: state }), { distanceFromBottomPx: 0, scrollState: state });
  assert.deepEqual(serializeViewportFollow({ distanceFromBottomPx: 50, responseSpacerHeightPx: 60, scrollPaddingBottomPx: 10, scrollState: state }), { distanceFromBottomPx: 0, scrollState: state });
  assert.deepEqual(serializeViewportFollow({ distanceFromBottomPx: 120, responseSpacerHeightPx: 60, scrollPaddingBottomPx: 10, scrollState: state }), { distanceFromBottomPx: 60, scrollState: state });
});
