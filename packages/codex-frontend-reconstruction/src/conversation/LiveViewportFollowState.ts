/**
 * Independently typed behavior recovery from compiled `EO`, `DO`, `OO`,
 * `kO`, `AO`, `Mk`, `Nk`, and `Pk` in
 * `local-conversation-thread-6999d2419a30.js` (1549–1574, 1746–1754).
 *
 * These pure state transitions govern scroll-follow and turn phase. They are
 * separate from the private virtualized list and DOM scroll controller.
 */

export type FollowMode = 'static' | 'prework_watch' | 'prework_follow' | 'user_follow';
export type TurnPhase = 'idle' | 'prework' | 'final_answer';
export interface FollowState { followMode: FollowMode }

export type FollowEvent =
  | { type: 'latest_turn_follow_content_changed'; latestTurnPhase: TurnPhase; followContentOverflowPx: number }
  | { type: 'latest_turn_phase_changed'; latestTurnPhase: TurnPhase; previousLatestTurnPhase: TurnPhase }
  | { type: 'hold_viewport' | 'latest_turn_placed' | 'latest_turn_removed' }
  | { type: 'scroll_distance_changed'; distanceFromBottomPx: number; latestTurnPhase: TurnPhase }
  | { type: 'scroll_to_bottom' };

export function initialFollowState(mode: FollowMode = 'static'): FollowState {
  return { followMode: mode };
}

function withMode(state: FollowState, followMode: FollowMode): FollowState {
  return state.followMode === followMode ? state : { ...state, followMode };
}

/** Pure event reducer corresponding to the compiled follow-state transition switch. */
export function reduceFollowState(state: FollowState, event: FollowEvent): FollowState {
  switch (event.type) {
    case 'latest_turn_follow_content_changed':
      if (event.latestTurnPhase !== 'prework' || state.followMode !== 'prework_watch') return state;
      return event.followContentOverflowPx > 0 ? withMode(state, 'prework_follow') : state;
    case 'latest_turn_phase_changed': {
      if (state.followMode === 'user_follow') return state;
      let result = state;
      if (
        event.previousLatestTurnPhase !== 'prework' &&
        event.latestTurnPhase === 'prework' &&
        result.followMode === 'static'
      ) result = withMode(result, 'prework_watch');
      if (event.previousLatestTurnPhase === 'prework' && event.latestTurnPhase === 'final_answer') {
        result = withMode(result, result.followMode === 'prework_follow' ? 'user_follow' : 'static');
      }
      if (event.previousLatestTurnPhase !== 'idle' && event.latestTurnPhase === 'idle') {
        result = withMode(result, 'static');
      }
      return result;
    }
    case 'hold_viewport':
    case 'latest_turn_placed':
    case 'latest_turn_removed':
      return withMode(state, 'static');
    case 'scroll_distance_changed':
      if (event.distanceFromBottomPx <= 24) return state;
      if (state.followMode === 'prework_follow') return withMode(state, 'prework_watch');
      if (state.followMode === 'user_follow') {
        return withMode(state, event.latestTurnPhase === 'prework' ? 'prework_watch' : 'static');
      }
      return state;
    case 'scroll_to_bottom':
      return withMode(state, 'user_follow');
  }
}

export function isStaticOrWatchingFollowMode(mode: FollowMode): boolean {
  return mode === 'static' || mode === 'prework_watch';
}

export interface PhaseTurnItem {
  type?: string;
  phase?: string;
}

/** Phase inferred from an in-progress turn's messages and work events. */
export function inferLiveTurnPhase(turn: {
  status: string;
  items: PhaseTurnItem[];
  firstTurnWorkItemStartedAtMs?: number | null;
  finalAssistantStartedAtMs?: number | null;
}): TurnPhase {
  if (turn.status !== 'inProgress') return 'idle';
  let sawCommentary = false;
  for (const item of turn.items) {
    if (item?.type !== 'agentMessage') continue;
    if (item.phase === 'commentary') {
      sawCommentary = true;
      continue;
    }
    return 'final_answer';
  }
  if (sawCommentary || turn.firstTurnWorkItemStartedAtMs != null) return 'prework';
  return turn.finalAssistantStartedAtMs == null ? 'idle' : 'final_answer';
}

export function readLatestTurnStatus(turn: {
  status: string;
  items: (PhaseTurnItem & {
    restoreMessage?: { id?: string };
  })[];
  firstTurnWorkItemStartedAtMs?: number | null;
  finalAssistantStartedAtMs?: number | null;
}): { isInProgress: boolean; latestSteeringUserMessageKey: string | null; phase: TurnPhase } {
  let latestSteeringUserMessageKey: string | null = null;
  for (let index = turn.items.length - 1; index >= 0; index--) {
    const item = turn.items[index];
    if (item?.type === 'steeringUserMessage') {
      latestSteeringUserMessageKey = item.restoreMessage?.id ?? null;
      break;
    }
  }
  return {
    isInProgress: turn.status === 'inProgress',
    latestSteeringUserMessageKey,
    phase: inferLiveTurnPhase(turn),
  };
}

export function responseSpacerOverflow(args: {
  distanceFromBottomPx: number;
  responseSpacerHeightPx: number;
  scrollPaddingBottomPx: number;
}): number {
  return Math.max(0, args.responseSpacerHeightPx - args.distanceFromBottomPx - args.scrollPaddingBottomPx);
}

export function serializeViewportFollow(args: {
  distanceFromBottomPx: number;
  responseSpacerHeightPx: number;
  scrollPaddingBottomPx: number;
  scrollState: FollowState;
}): { distanceFromBottomPx: number; scrollState: FollowState } {
  return {
    distanceFromBottomPx: responseSpacerOverflow(args) > 24
      ? 0
      : Math.max(0, args.distanceFromBottomPx - args.responseSpacerHeightPx),
    scrollState: args.scrollState,
  };
}
