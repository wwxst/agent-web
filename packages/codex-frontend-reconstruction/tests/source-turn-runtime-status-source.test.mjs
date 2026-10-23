import test from "node:test";
import assert from "node:assert/strict";
import {
  createSourceTurnRuntimeStatusSource,
  createSourceTurnRuntimeStatusStore,
  sourceTurnHistoryQuery,
  sourceTurnUpNextQuery,
} from "../build/SourceTurnRuntimeStatusSource.js";

const base={
 hostId:"host-1",threadId:"thread-1",historyEntityKey:"history-1",
 turnStatus:"in_progress",isMostRecentTurn:true,hasUpNextStatusItem:true,
 interruptedByThisClient:false,isTerminalOrSummaryTurn:false,
 assistantItem:null,hasInlineSubagentActivity:false,
};
const h={hostId:"host-1",threadId:"thread-1",entityKey:"history-1"};
const u={hostId:"host-1",threadId:"thread-1"};

test("Fc enables qn only on in_progress/history and Qr only for eligible latest upNext",()=>{
 assert.deepEqual(sourceTurnHistoryQuery(base),h);
 assert.deepEqual(sourceTurnUpNextQuery(base),u);
 assert.equal(sourceTurnHistoryQuery({...base,turnStatus:"completed"}),null);
 assert.equal(sourceTurnHistoryQuery({...base,historyEntityKey:null}),null);
 assert.equal(sourceTurnUpNextQuery({...base,isMostRecentTurn:false}),null);
 assert.equal(sourceTurnUpNextQuery({...base,hasUpNextStatusItem:false}),null);
 assert.equal(sourceTurnUpNextQuery({...base,interruptedByThisClient:true}),null);
});
test("qn falls back to raw turn status for null and switches K for explicit history updates",()=>{
 const store=createSourceTurnRuntimeStatusStore();
 const source=createSourceTurnRuntimeStatusSource({...base,hasUpNextStatusItem:false},store);
 const revisions=[];
 const stop=source.subscribe(()=>revisions.push(source.getSnapshot().revision));
 assert.equal(source.getSnapshot().isTurnInProgress,true);
 assert.equal(source.getSnapshot().allowLatestCompletedGroup,true);
 store.publishHistoryStatus(h,"completed");
 assert.equal(source.getSnapshot().isTurnInProgress,false);
 assert.equal(source.getSnapshot().historyStatusResolved,true);
 assert.equal(source.getSnapshot().allowLatestCompletedGroup,false);
 store.publishHistoryStatus(h,null);
 assert.equal(source.getSnapshot().isTurnInProgress,true);
 assert.equal(source.getSnapshot().historyStatusResolved,false);
 store.publishHistoryStatus(h,"inProgress");
 assert.equal(source.getSnapshot().isTurnInProgress,true);
 assert.deepEqual(revisions,[1,2,3]);
 stop();source.dispose();store.dispose();
});
test("Qr readiness drives live Gi without a new parent transcript projection",()=>{
 const store=createSourceTurnRuntimeStatusStore();
 const source=createSourceTurnRuntimeStatusSource(base,store);
 const initial=source.getSnapshot();
 assert.equal(initial.upNextQueryEnabled,true);
 assert.equal(initial.allowLatestCompletedGroup,false);
 let notified=0;
 source.subscribe(()=>notified++);
 store.publishUpNextReady(u,true);
 const updated=source.getSnapshot();
 assert.notEqual(updated,initial);
 assert.equal(updated.allowLatestCompletedGroup,true);
 assert.equal(updated.latestActivityRetentionInput.hasResolvedUpNextState,true);
 store.publishUpNextReady(u,true);
 assert.equal(notified,1);
 store.publishHistoryStatus(h,"completed");
 assert.equal(source.getSnapshot().allowLatestCompletedGroup,false);
 store.publishHistoryStatus(h,"inProgress");
 assert.equal(source.getSnapshot().allowLatestCompletedGroup,true);
 assert.equal(notified,3);
 source.dispose();store.dispose();
});
test("cached entity store replays existing subscriptions synchronously",()=>{
 const store=createSourceTurnRuntimeStatusStore();
 store.publishHistoryStatus(h,"completed");
 store.publishUpNextReady(u,true);
 const source=createSourceTurnRuntimeStatusSource(base,store);
 assert.equal(source.getSnapshot().historyStatusResolved,true);
 assert.equal(source.getSnapshot().isTurnInProgress,false);
 assert.equal(source.getSnapshot().upNextReady,true);
 assert.equal(source.getSnapshot().allowLatestCompletedGroup,false);
 source.dispose();store.dispose();
});
test("query rebind drops old host/thread callbacks and clears retired query results",()=>{
 const subscriptions={history:new Map(),upNext:new Map()};
 const host={
  subscribeHistoryStatus(q,cb){subscriptions.history.set(q.threadId,cb);return ()=>{};},
  subscribeUpNextReady(q,cb){subscriptions.upNext.set(q.threadId,cb);return ()=>{};},
 };
 const source=createSourceTurnRuntimeStatusSource(base,host);
 const oldHistory=subscriptions.history.get("thread-1");
 const oldNext=subscriptions.upNext.get("thread-1");
 oldHistory("completed");oldNext(true);
 assert.equal(source.getSnapshot().isTurnInProgress,false);
 source.updateInput({...base,threadId:"thread-2"});
 assert.equal(source.getSnapshot().isTurnInProgress,true);
 assert.equal(source.getSnapshot().upNextReady,false);
 const after=source.getSnapshot();
 oldHistory("completed");oldNext(true);
 assert.equal(source.getSnapshot(),after);
 subscriptions.history.get("thread-2")("completed");
 assert.equal(source.getSnapshot().isTurnInProgress,false);
 source.dispose();
});
test("disabled queries never call host and terminal status falls back without subscriptions",()=>{
 const host={
  subscribeHistoryStatus(){throw Error("should not query history");},
  subscribeUpNextReady(){throw Error("should not query up-next");},
 };
 const source=createSourceTurnRuntimeStatusSource({
  ...base,turnStatus:"completed",hasUpNextStatusItem:false,
 },host);
 assert.equal(source.getSnapshot().isTurnInProgress,false);
 assert.equal(source.getSnapshot().error,null);
 assert.equal(source.getSnapshot().upNextQueryEnabled,false);
 source.dispose();
});
test("same query input updates context without reopening subscriptions",()=>{
 const store=createSourceTurnRuntimeStatusStore();
 const source=createSourceTurnRuntimeStatusSource({...base,hasUpNextStatusItem:false},store);
 const before=source.getSnapshot();
 source.updateInput({...base,hasUpNextStatusItem:false,
  assistantItem:{type:"assistant-message",content:"response"}});
 assert.equal(source.getSnapshot().isTurnInProgress,true);
 assert.equal(source.getSnapshot().allowLatestCompletedGroup,false);
 assert.notEqual(source.getSnapshot(),before);
 source.dispose();store.dispose();
});
test("failed host subscribe publishes error and remains safely disposable",()=>{
 const source=createSourceTurnRuntimeStatusSource(base,{
  subscribeHistoryStatus(){throw new Error("database unavailable");},
  subscribeUpNextReady(){throw new Error("should not run second subscription");},
 });
 assert.match(String(source.getSnapshot().error),/database unavailable/);
 source.dispose();
});
