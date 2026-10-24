import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDemoSource, getDemoBlocks, getDemoHistoryTurnItems, demoMessageEntry,
  makeLongHistory, appendDemoEntries,
} from '../../demo-model-build/demo/mockConversation.js';
import { buildConversationRenderEntries } from '../../demo-model-build/src/conversation/ConversationRenderEntriesModel.js';
import { projectDemoThreadFindRows } from '../../demo-model-build/demo/threadFindProjection.js';
import { findSourceThreadLiteralMatches } from '../../demo-model-build/src/conversation/SourceThreadFindModel.js';
import { createSourceHistoricalTurnContentSource, createSourceHistoricalTurnStore, sourceHistoricalTurnQuery } from '../../demo-model-build/src/conversation/SourceHistoricalTurnContentSource.js';
import { buildConversationMessageRenderPlan } from '../../demo-model-build/src/conversation/ConversationMessageRenderPlan.js';

const deps = { isSpecialEntry: () => false, expandPreservedTurn: ({ baseTurnEntry }) => [baseTurnEntry] };
const planDeps = {
  partitionActivities: (items) => [{type:'activity',items}],
  getSpecialActivityResult: () => null,
  hasPersistentActivity: () => true,
};

test('demo creates two separate deterministic conversations', () => {
  const a = createDemoSource('frontend');
  const b = createDemoSource('review');
  assert.equal(a.getSnapshot().conversationId, 'frontend');
  assert.equal(b.getSnapshot().conversationId, 'review');
  assert.ok(a.getSnapshot().entries.length > 0);
  assert.ok(b.getSnapshot().entries.length > 0);
  assert.equal(a.getSnapshot().entries.some(e => e.turnId === 'review-history-hydration'), false);
  assert.equal(b.getSnapshot().entries.some(e => e.turnId === 'review-history-hydration'), true);
  assert.notEqual(a.getSnapshot().entries[0].turnId, b.getSnapshot().entries[0].turnId);
  a.dispose(); b.dispose();
});

test('synthetic source updates notify once and keep current entries immutable', () => {
  const s = createDemoSource('frontend');
  const before = s.getSnapshot();
  let notifications = 0;
  const unsubscribe = s.subscribe(() => notifications++);
  appendDemoEntries(s, [demoMessageEntry('user', 'new', 'hello')]);
  assert.equal(notifications, 1);
  assert.equal(s.getSnapshot().entries.length, before.entries.length+1);
  assert.equal(before.entries.length, 15);
  assert.ok(Object.isFrozen(before.entries));
  assert.equal(s.getSnapshot().entries.at(-1).isLatestTurn, true);
  assert.equal(s.getSnapshot().entries.at(-2).isLatestTurn, false);
  unsubscribe();
  s.dispose();
  appendDemoEntries(s, [demoMessageEntry('assistant','ignored','ignored')]);
  assert.equal(notifications,1);
});

test('recovered projection hands original demo blocks through to recovered dispatcher', () => {
  const s=createDemoSource('frontend');
  const snapshot=s.getSnapshot();
  const projection=buildConversationRenderEntries({...snapshot.projection,baseEntries:[...snapshot.entries]},deps);
  assert.equal(projection.entries.length,15);
  assert.equal(projection.entries[0].turnKey,'history-content:turn:intro');
  const userBlocks=getDemoBlocks(projection.entries[0]);
  const firstPlan=buildConversationMessageRenderPlan(userBlocks,{isTurnInProgress:false},planDeps);
  assert.equal(firstPlan.nodes[0].kind,'user-message');
  const activityBlocks=getDemoBlocks(projection.entries.find(e=>e.turnId==='diff'));
  const activityPlan=buildConversationMessageRenderPlan(activityBlocks,{isTurnInProgress:false},planDeps);
  assert.equal(activityPlan.nodes[0].kind,'activity-group');
  assert.equal(activityPlan.nodes[0].items[0].type,'demo-file-review');
  const grouped=getDemoBlocks(projection.entries.find(e=>e.turnId==='batch-tools'));
  assert.equal(grouped[0].items.length,2);
  assert.equal(grouped[0].items[0].parsedCmd.isFinished,true);
  s.dispose();
});

test('long history adds unique keys and can be projected without duplicate rows', () => {
  const s=createDemoSource('review');
  const originalCount=s.getSnapshot().entries.length;
  const extraHistory=makeLongHistory();
  appendDemoEntries(s, extraHistory);
  const snapshot=s.getSnapshot();
  const output=buildConversationRenderEntries({...snapshot.projection,baseEntries:[...snapshot.entries]},deps);
  assert.equal(output.entries.length, originalCount + extraHistory.length); // no longer assumes a fixed number of synthetic scenario rows
  const keys=output.entries.map(e=>e.turnKey);
  assert.equal(new Set(keys).size,keys.length);
  assert.equal(keys.at(-1),'history-content:turn:history-45');
  s.dispose();
});

test('find indexes only Y hydrated canonical history and clears matches after host invalidation', () => {
  const live=createDemoSource('review');
  const current=live.getSnapshot();
  const projected=buildConversationRenderEntries({
    ...current.projection,baseEntries:[...current.entries],
  },deps).entries;
  const entry=projected.find(item=>item.turnId==='review-history-hydration');
  assert.ok(entry);
  assert.equal(entry.turn,null); // Y must strip raw demo items first
  const query=sourceHistoricalTurnQuery(entry);
  assert.deepEqual(query,{
    hostId:'demo-host',threadId:'review',entityKey:'fixture-history-content',
  });
  const host=createSourceHistoricalTurnStore();
  const hydrated=createSourceHistoricalTurnContentSource(query,host);
  let updates=0;
  const unsubscribe=hydrated.subscribe(()=>updates++);
  const project=()=>projectDemoThreadFindRows(projected,item=>{
    const key=sourceHistoricalTurnQuery(item);
    return key?.hostId===query.hostId&&key?.threadId===query.threadId&&
      key?.entityKey===query.entityKey?hydrated.getSnapshot():null;
  });
  const phrase='历史正文已通过订阅恢复';
  assert.equal(findSourceThreadLiteralMatches(project(),phrase).length,0);
  assert.equal(project().some(row=>row.turnKey==='history-content:turn:review-history-hydration'),false);
  // The same source store drives Y's mounted React historical row.
  host.publish(query,{status:'completed',items:getDemoHistoryTurnItems()});
  assert.equal(updates,1);
  let matches=findSourceThreadLiteralMatches(project(),phrase);
  assert.deepEqual(matches.map(match=>match.turnKey),['history-content:turn:review-history-hydration']);
  const loaded=project().find(row=>row.turnKey==='history-content:turn:review-history-hydration');
  assert.match(loaded.text,/这是历史记录的用户消息/);
  host.clearThread('demo-host','review');
  assert.equal(updates,2);
  assert.equal(findSourceThreadLiteralMatches(project(),phrase).length,0);
  // Replay hydration with the same canonical entity, without remounting.
  host.publish(query,{status:'completed',items:getDemoHistoryTurnItems()});
  assert.equal(updates,3);
  assert.equal(findSourceThreadLiteralMatches(project(),phrase).length,1);
  unsubscribe();
  hydrated.dispose();host.dispose();live.dispose();
});
