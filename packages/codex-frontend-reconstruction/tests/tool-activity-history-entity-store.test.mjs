import test from "node:test";
import assert from "node:assert/strict";
import {createToolActivityHistoryEntityStore} from "../build/ToolActivityHistoryEntityStore.js";
import {createToolActivityHistorySource} from "../build/ToolActivityHistorySource.js";

const query=(hostId="host-A",threadId="thread-A",entityKey="history",itemId="cmd-1")=>({
 hostId,threadId,entityKey,itemId,
});
const commandItem=()=>({type:"exec",commandExecutionItemId:"cmd-1",executionStatus:"inProgress",
 parsedCmd:{type:"command",isFinished:false,cmd:"npm test"}});
const context={hostId:"host-A",conversationId:"thread-A",historyEntityKey:"history"};

test("history entity and assistant-presence channels stay independent for the same source key",()=>{
 const store=createToolActivityHistoryEntityStore(),q=query();
 let historyValue,presenceValue;
 store.subscribeHistoryEntity(q,value=>historyValue=value);
 store.subscribeAssistantMessagePresence(q,value=>presenceValue=value);
 const entity={type:"agentMessage",text:"answer"};
 store.publishHistoryEntity(q,entity);
 assert.equal(historyValue,entity);
 assert.equal(presenceValue,undefined);
 store.publishAssistantMessagePresence(q,true);
 assert.equal(presenceValue,true);
 assert.equal(store.getHistoryEntitySnapshot(q).loaded,true);
 assert.equal(store.getAssistantMessagePresenceSnapshot(q).value,true);
 store.dispose();
});

test("subscriptions replay loaded values and no-op publications do not notify twice",()=>{
 const store=createToolActivityHistoryEntityStore(),q=query();
 const entity={type:"commandExecution",status:"completed"};
 store.publishHistoryEntity(q,entity);
 assert.deepEqual(store.getHistoryEntitySnapshot(q),{loaded:true,value:entity});
 let calls=0;
 const stop=store.subscribeHistoryEntity(q,value=>{calls++;assert.equal(value,entity);});
 assert.equal(calls,1);
 store.publishHistoryEntity(q,entity);
 assert.equal(calls,1);
 store.publishHistoryEntity(q,{type:"commandExecution",status:"failed"});
 assert.equal(calls,2);
 stop();
 store.publishHistoryEntity(q,{type:"commandExecution",status:"inProgress"});
 assert.equal(calls,2);
 store.dispose();
});

test("query identity includes host, thread, entity key and item ID",()=>{
 const store=createToolActivityHistoryEntityStore();
 const qA=query("host-A","thread-A","history","same-id");
 const qB=query("host-B","thread-A","history","same-id");
 const qC=query("host-A","thread-B","history","same-id");
 const qD=query("host-A","thread-A","other-history","same-id");
 const qE=query("host-A","thread-A","history","other-id");
 store.publishHistoryEntity(qA,{type:"reasoning",summary:["A"]});
 for(const q of [qB,qC,qD,qE]) assert.equal(store.getHistoryEntitySnapshot(q).loaded,false);
 assert.equal(store.getHistoryEntitySnapshot(qA).value?.type,"reasoning");
 store.dispose();
});

test("clearThread releases cached history and presence values to active subscribers",()=>{
 const store=createToolActivityHistoryEntityStore(),q=query();
 store.publishHistoryEntity(q,{type:"commandExecution",status:"completed"});
 store.publishAssistantMessagePresence(q,true);
 const history=[],presence=[];
 store.subscribeHistoryEntity(q,value=>history.push(value));
 store.subscribeAssistantMessagePresence(q,value=>presence.push(value));
 store.clearThread("host-A","thread-A");
 assert.equal(history.length,2);
 assert.equal(history[1],undefined);
 assert.equal(presence.length,2);
 assert.equal(presence[1],undefined);
 assert.equal(store.getHistoryEntitySnapshot(q).loaded,true);
 store.dispose();
});

test("dispose closes the store and removes retained entries/listeners",()=>{
 const store=createToolActivityHistoryEntityStore(),q=query();
 let calls=0;
 store.subscribeHistoryEntity(q,()=>calls++);
 store.publishHistoryEntity(q,{type:"commandExecution",status:"completed"});
 assert.equal(calls,1);
 store.dispose();
 store.publishHistoryEntity(q,{type:"commandExecution",status:"failed"});
 const stop=store.subscribeHistoryEntity(q,()=>calls++);
 stop();
 assert.equal(calls,1);
 assert.equal(store.getHistoryEntitySnapshot(q).loaded,false);
});

test("concrete entity store feeds the history hydration source end-to-end",()=>{
 const store=createToolActivityHistoryEntityStore(),q=query();
 const source=createToolActivityHistorySource({item:commandItem(),queryContext:context},store);
 assert.equal(source.getSnapshot().state,"loading");
 store.publishHistoryEntity(q,{type:"commandExecution",status:"completed",durationMs:35,
  aggregatedOutput:"tests passed",exitCode:0,processId:"pid-1"});
 assert.equal(source.getSnapshot().state,"ready");
 assert.equal(source.getSnapshot().item?.executionStatus,"completed");
 assert.equal(source.getSnapshot().item?.output?.aggregatedOutput,"tests passed");
 assert.equal(source.getSnapshot().item?.durationMs,35);
 source.dispose();store.dispose();
});

test("assistant-message presence channel gates streaming exactly by truthiness",()=>{
 const store=createToolActivityHistoryEntityStore(),q=query("host-A","thread-A","history","msg-1");
 const source=createToolActivityHistorySource({
  item:{type:"assistant-message",searchItemId:"msg-1",content:"local",completed:false},
  queryContext:context,hydrationContext:{isTurnInProgress:true},
 },store);
 store.publishHistoryEntity(q,{type:"agentMessage",text:"partial",phase:"commentary"});
 assert.equal(source.getSnapshot().item?.completed,false);
 store.publishAssistantMessagePresence(q,{exists:true});
 assert.equal(source.getSnapshot().item?.completed,true);
 source.dispose();store.dispose();
});
