import test from "node:test";
import assert from "node:assert/strict";
import {createToolActivityHistorySource} from "../build/ToolActivityHistorySource.js";

function makeHost() {
 const history=[];
 const assistant=[];
 const host={
  subscribeHistoryEntity(query,listener) {
   const entry={query,listener,active:true};
   history.push(entry);
   return ()=>{entry.active=false;};
  },
  subscribeAssistantMessagePresence(query,listener) {
   const entry={query,listener,active:true};
   assistant.push(entry);
   return ()=>{entry.active=false;};
  },
 };
 return {host,history,assistant};
}
const queryContext=(conversationId="thread-A")=>({
 hostId:"host-A",conversationId,historyEntityKey:"entities",
});
const execItem=(id="cmd-1")=>({
 type:"exec",commandExecutionItemId:id,executionStatus:"inProgress",
 parsedCmd:{type:"command",isFinished:false,command:"npm test"},
});
test("source subscribes through the history host and hydrates command status/output",()=>{
 const {host,history,assistant}=makeHost();
 const source=createToolActivityHistorySource({item:execItem(),queryContext:queryContext()},host);
 assert.equal(history.length,1);assert.equal(assistant.length,0);
 assert.equal(source.getSnapshot().state,"loading");
 assert.equal(history[0].query.hostId,"host-A");
 assert.equal(history[0].query.threadId,"thread-A");
 assert.equal(history[0].query.entityKey,"entities");
 assert.equal(history[0].query.itemId,"cmd-1");
 history[0].listener({type:"commandExecution",status:"completed",durationMs:12,
  aggregatedOutput:"done",exitCode:0,processId:"pid-1"});
 const snapshot=source.getSnapshot();
 assert.equal(snapshot.state,"ready");
 assert.equal(snapshot.item?.executionStatus,"completed");
 assert.deepEqual(snapshot.item?.output,{aggregatedOutput:"done",exitCode:0});
 assert.equal(snapshot.item?.durationMs,12);
 assert.equal(snapshot.item?.processId,"pid-1");
 source.dispose();
});
test("assistant messages bind both history and assistant-entity subscriptions",()=>{
 const {host,history,assistant}=makeHost();
 const source=createToolActivityHistorySource({
  item:{type:"assistant-message",searchItemId:"msg-1",content:"streaming",completed:false},
  queryContext:queryContext(),hydrationContext:{isTurnInProgress:true},
 },host);
 assert.equal(history.length,1);assert.equal(assistant.length,1);
 assert.deepEqual(assistant[0].query,history[0].query);
 history[0].listener({type:"agentMessage",text:"<![CDATA[ final answer ]]>",phase:"final_answer"});
 assert.equal(source.getSnapshot().state,"loading");
 assistant[0].listener({type:"agentMessage"});
 const snapshot=source.getSnapshot();
 assert.equal(snapshot.state,"ready");
 assert.equal(snapshot.item?.content,"final answer");
 assert.equal(snapshot.item?.phase,"final_answer");
 source.dispose();
});
test("query-plan changes unsubscribe old entities and reject stale callbacks",()=>{
 const {host,history}=makeHost();
 const source=createToolActivityHistorySource({item:execItem(),queryContext:queryContext()},host);
 const stale=history[0].listener;
 source.updateInput({item:execItem("cmd-2"),queryContext:queryContext("thread-B")});
 assert.equal(history.length,2);
 assert.equal(history[0].active,false);
 assert.equal(history[1].query.threadId,"thread-B");
 stale({type:"commandExecution",status:"failed",exitCode:1,aggregatedOutput:"stale"});
 assert.equal(source.getSnapshot().item?.executionStatus,"inProgress");
 history[1].listener({type:"commandExecution",status:"failed",exitCode:1,aggregatedOutput:"current"});
 assert.equal(source.getSnapshot().item?.executionStatus,"failed");
 assert.equal(source.getSnapshot().item?.output?.aggregatedOutput,"current");
 source.dispose();
});
test("same query updates rehydrate without restarting host subscriptions",()=>{
 const {host,history}=makeHost();
 const source=createToolActivityHistorySource({item:execItem(),queryContext:queryContext()},host);
 history[0].listener({type:"commandExecution",status:"completed",aggregatedOutput:"ok"});
 const before=source.getSnapshot();
 source.updateInput({item:{...execItem(),content:"new local fields"},queryContext:queryContext()});
 assert.equal(history.length,1);
 assert.equal(source.getSnapshot().revision,before.revision+1);
 assert.equal(source.getSnapshot().item?.executionStatus,"completed");
 assert.equal(source.getSnapshot().item?.content,"new local fields");
 source.dispose();
});
test("items without a canonical query remain available without host subscriptions",()=>{
 const {host,history,assistant}=makeHost();
 const source=createToolActivityHistorySource({
  item:{type:"fallback",content:"local"},queryContext:{hostId:"host",conversationId:"thread"},
 },host);
 assert.equal(source.getSnapshot().state,"unavailable");
 assert.equal(source.getSnapshot().item?.content,"local");
 assert.equal(history.length,0);assert.equal(assistant.length,0);
 source.dispose();
});
test("dispose unsubscribes all queries and makes callbacks inert",()=>{
 const {host,history,assistant}=makeHost();
 const source=createToolActivityHistorySource({
  item:{type:"assistant-message",searchItemId:"msg-1",content:"local",completed:false},
  queryContext:queryContext(),
 },host);
 let calls=0;source.subscribe(()=>calls++);
 const oldHistory=history[0].listener,oldAssistant=assistant[0].listener;
 source.dispose();
 oldHistory({type:"agentMessage",text:"late"});oldAssistant({type:"agentMessage"});
 assert.equal(history[0].active,false);assert.equal(assistant[0].active,false);
 assert.equal(calls,0);
});
test("subscription failures are exposed and partial subscriptions are cleaned up",()=>{
 const history=[];
 const host={
  subscribeHistoryEntity(query,listener) {
   const entry={query,listener,active:true};history.push(entry);return ()=>{entry.active=false;};
  },
  subscribeAssistantMessagePresence() {throw new Error("assistant query unavailable");},
 };
 const source=createToolActivityHistorySource({
  item:{type:"assistant-message",searchItemId:"msg-1",content:"local",completed:false},
  queryContext:queryContext(),
 },host);
 assert.equal(source.getSnapshot().state,"error");
 assert.match(String(source.getSnapshot().error),/assistant query unavailable/);
 assert.equal(history[0].active,false);
 source.dispose();
});
