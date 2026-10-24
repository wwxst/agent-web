import test from "node:test";
import assert from "node:assert/strict";
import {createSourceConversationHostEventBridge} from "../build/SourceConversationHostEventBridge.js";
import {createSourceHistoricalTurnContentSource} from "../build/SourceHistoricalTurnContentSource.js";
import {createSourceTurnRuntimeStatusSource} from "../build/SourceTurnRuntimeStatusSource.js";
import {createToolActivityHistorySource} from "../build/ToolActivityHistorySource.js";

const turnQuery={hostId:"host-A",threadId:"thread-A",entityKey:"history-A"};
const toolQuery={...turnQuery,itemId:"command-1"};
const nextQuery={hostId:"host-A",threadId:"thread-A"};
const runtimeInput={
 hostId:"host-A",threadId:"thread-A",historyEntityKey:"history-A",
 turnStatus:"in_progress",
 isTerminalOrSummaryTurn:false,assistantItem:null,hasInlineSubagentActivity:false,
 isMostRecentTurn:true,hasUpNextStatusItem:true,interruptedByThisClient:false,
};
const toolInput={
 item:{type:"exec",id:"command-1",commandExecutionItemId:"command-1",
  parsedCmd:{type:"unknown",cmd:"git status",isFinished:false}},
 queryContext:{hostId:"host-A",conversationId:"thread-A",historyEntityKey:"history-A"},
 hydrationContext:{isTurnInProgress:true},
};

test("single bridge fans out into Y historical turns, Fc qn/Qr and LO Au/Vd",()=>{
 const bridge=createSourceConversationHostEventBridge();
 const history=createSourceHistoricalTurnContentSource(turnQuery,bridge.historicalTurns);
 const runtime=createSourceTurnRuntimeStatusSource(runtimeInput,bridge.turnRuntime);
 const tool=createToolActivityHistorySource(toolInput,bridge.toolHistory);
 bridge.publish({type:"historical-turn",query:turnQuery,payload:{
  status:"completed",items:[{id:"user-1",type:"user-message",content:"Original item"}],
 }});
 bridge.publish({type:"up-next-ready",query:nextQuery,ready:true});
 bridge.publish({type:"turn-history-status",query:turnQuery,status:"inProgress"});
 bridge.publish({type:"tool-history-entity",query:toolQuery,entity:{
  type:"commandExecution",status:"completed",aggregatedOutput:"done",exitCode:0,
 }});
 bridge.publish({type:"assistant-message-presence",query:toolQuery,presence:{exists:true}});
 assert.equal(history.getSnapshot().loaded,true);
 assert.deepEqual(history.getSnapshot().items.map(i=>i.id),["user-1"]);
 assert.equal(runtime.getSnapshot().upNextReady,true);
 assert.equal(runtime.getSnapshot().historyStatusResolved,true);
 assert.equal(runtime.getSnapshot().allowLatestCompletedGroup,true);
 assert.equal(tool.getSnapshot().historyLoaded,true);
 assert.equal(bridge.toolHistory.getAssistantMessagePresenceSnapshot(toolQuery).loaded,true);
 history.dispose();runtime.dispose();tool.dispose();bridge.dispose();
});

test("host and conversation identities stay isolated across every store",()=>{
 const bridge=createSourceConversationHostEventBridge();
 const queryB={hostId:"host-A",threadId:"thread-B",entityKey:"history-A"};
 const historyA=createSourceHistoricalTurnContentSource(turnQuery,bridge.historicalTurns);
 const historyB=createSourceHistoricalTurnContentSource(queryB,bridge.historicalTurns);
 const runtimeA=createSourceTurnRuntimeStatusSource(runtimeInput,bridge.turnRuntime);
 const runtimeB=createSourceTurnRuntimeStatusSource({
  ...runtimeInput,threadId:"thread-B",
 },bridge.turnRuntime);
 bridge.publish({type:"historical-turn",query:turnQuery,payload:{
  items:[{id:"a",type:"exec"}],status:"completed",
 }});
 bridge.publish({type:"up-next-ready",query:nextQuery,ready:true});
 assert.equal(historyA.getSnapshot().loaded,true);
 assert.equal(historyB.getSnapshot().loaded,false);
 assert.equal(runtimeA.getSnapshot().upNextReady,true);
 assert.equal(runtimeB.getSnapshot().upNextReady,false);
 bridge.publish({type:"clear-thread",hostId:"host-A",threadId:"thread-A"});
 assert.equal(historyA.getSnapshot().loaded,false);
 assert.equal(historyB.getSnapshot().loaded,false);
 assert.equal(runtimeA.getSnapshot().upNextReady,false);
 assert.equal(runtimeB.getSnapshot().upNextReady,false);
 historyA.dispose();historyB.dispose();runtimeA.dispose();runtimeB.dispose();bridge.dispose();
});

test("clear-thread invalidates all five keyed channels for only that conversation",()=>{
 const bridge=createSourceConversationHostEventBridge();
 const other={hostId:"host-A",threadId:"thread-B",entityKey:"history-B"};
 const otherTool={...other,itemId:"command-1"};
 const turnA=createSourceHistoricalTurnContentSource(turnQuery,bridge.historicalTurns);
 const stateA=createSourceTurnRuntimeStatusSource(runtimeInput,bridge.turnRuntime);
 for(const query of [turnQuery,other]){
  bridge.publish({type:"historical-turn",query,payload:{
   status:"completed",items:[{id:query.threadId,type:"exec"}],
  }});
  bridge.publish({type:"turn-history-status",query,status:"completed"});
  bridge.publish({type:"up-next-ready",query:{hostId:query.hostId,threadId:query.threadId},ready:true});
 }
 for(const query of [toolQuery,otherTool]){
  bridge.publish({type:"tool-history-entity",query,entity:{type:"commandExecution",status:"completed"}});
  bridge.publish({type:"assistant-message-presence",query,presence:true});
 }
 bridge.publish({type:"clear-thread",hostId:"host-A",threadId:"thread-A"});
 assert.equal(turnA.getSnapshot().loaded,false);
 assert.equal(stateA.getSnapshot().historyStatusResolved,false);
 assert.equal(stateA.getSnapshot().isTurnInProgress,true);
 assert.equal(stateA.getSnapshot().upNextReady,false);
 assert.equal(bridge.toolHistory.getHistoryEntitySnapshot(toolQuery).value,undefined);
 assert.equal(bridge.toolHistory.getAssistantMessagePresenceSnapshot(toolQuery).value,undefined);
 assert.equal(bridge.toolHistory.getHistoryEntitySnapshot(otherTool).loaded,true);
 assert.equal(bridge.toolHistory.getAssistantMessagePresenceSnapshot(otherTool).loaded,true);
 const historyOther=createSourceHistoricalTurnContentSource(other,bridge.historicalTurns);
 assert.equal(historyOther.getSnapshot().loaded,true);
 historyOther.dispose();turnA.dispose();stateA.dispose();bridge.dispose();
});

test("transport events replay synchronously, stale listeners are fenced after a swap",()=>{
 const bridge=createSourceConversationHostEventBridge();
 let left, right, leftStops=0,rightStops=0;
 bridge.connect({subscribe(listener){
  left=listener;
  listener({type:"up-next-ready",query:nextQuery,ready:true});
  return ()=>{leftStops++};
 }});
 const state=createSourceTurnRuntimeStatusSource(runtimeInput,bridge.turnRuntime);
 assert.equal(state.getSnapshot().upNextReady,true);
 bridge.connect({subscribe(listener){
  right=listener;
  return ()=>{rightStops++};
 }});
 assert.equal(leftStops,1);
 left({type:"up-next-ready",query:nextQuery,ready:false});
 assert.equal(state.getSnapshot().upNextReady,true);
 right({type:"up-next-ready",query:nextQuery,ready:false});
 assert.equal(state.getSnapshot().upNextReady,false);
 bridge.disconnect();
 assert.equal(rightStops,1);
 right({type:"up-next-ready",query:nextQuery,ready:true});
 assert.equal(state.getSnapshot().upNextReady,false);
 state.dispose();bridge.dispose();
});

test("invalid identities and malformed event types are rejected, disposed host cannot reconnect",()=>{
 const bridge=createSourceConversationHostEventBridge();
 assert.throws(()=>bridge.publish({type:"historical-turn",query:{...turnQuery,threadId:""},
   payload:{items:[],status:"completed"}}),/canonical/);
 assert.throws(()=>bridge.publish({type:"tool-history-entity",query:{...toolQuery,itemId:""},
   entity:null}),/itemId/);
 assert.throws(()=>bridge.publish({type:"clear-thread",hostId:"",threadId:"a"}),/clear-thread/);
 assert.throws(()=>bridge.publish({type:"not-supported"}),/canonical|unknown/);
 bridge.dispose();
 assert.throws(()=>bridge.connect({subscribe(){return ()=>{}}}),/disposed/);
 // Stale post-dispose messages are ignored and cannot resurrect stores.
 bridge.publish({type:"up-next-ready",query:nextQuery,ready:true});
});

test("host subscription failure never leaves old stream connected",()=>{
 const bridge=createSourceConversationHostEventBridge();
 let stopCount=0;
 bridge.connect({subscribe(){return ()=>{stopCount++}}});
 assert.throws(()=>bridge.connect({subscribe(){throw new Error("IPC unavailable")}}),/IPC unavailable/);
 assert.equal(stopCount,1);
 bridge.dispose();
});

test("qn/Qr subscriptions use canonical query fields regardless of event property order",()=>{
 const bridge=createSourceConversationHostEventBridge();
 const state=createSourceTurnRuntimeStatusSource(runtimeInput,bridge.turnRuntime);
 // JSON-decoded transports are not required to preserve source object insertion
 // order; hostId/threadId/entityKey identity is authoritative.
 bridge.publish({type:"up-next-ready",
  query:{threadId:"thread-A",hostId:"host-A"},ready:true});
 bridge.publish({type:"turn-history-status",
  query:{entityKey:"history-A",threadId:"thread-A",hostId:"host-A"},status:"completed"});
 assert.equal(state.getSnapshot().upNextReady,true);
 assert.equal(state.getSnapshot().historyStatusResolved,true);
 assert.equal(state.getSnapshot().isTurnInProgress,false);
 bridge.publish({type:"clear-thread",hostId:"host-A",threadId:"thread-A"});
 assert.equal(state.getSnapshot().isTurnInProgress,true);
 assert.equal(state.getSnapshot().upNextReady,false);
 state.dispose();bridge.dispose();
});
