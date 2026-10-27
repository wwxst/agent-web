import test from "node:test";
import assert from "node:assert/strict";
import {
 createSourcePendingElicitationRequestStore,sourcePendingElicitationKey,
} from "../build/SourcePendingElicitationRequestStore.js";
import {
 bindSourcePendingElicitationsToTimeline,
 sourcePendingElicitationTurnId,
} from "../build/SourcePendingElicitationTimelineBinder.js";
import {createSourceConversationHostEventBridge}
 from "../build/SourceConversationHostEventBridge.js";
import {createLiveConversationSource}
 from "../build/LiveConversationSource.js";

const one={hostId:"demo-host",threadId:"frontend",requestId:"req-1"};
const two={...one,threadId:"review"};
const urlAction=(key=one,message="Open URL")=>({...key,
 elicitation:{kind:"urlAction",url:"https://example.org/",message},
});
function makeSource(conversationId="frontend"){
 return createLiveConversationSource({
  conversationId,
  entries:[{turnId:"prior",turnSearchKey:"prior",isLatestTurn:true,
    estimatedHeightPx:80,turn:{items:[],status:"completed"}}],
  connectionState:"connected",loadingHistory:false,
  projection:{hostId:"demo-host",conversationId,cwd:"/",showFullTranscript:true},
 });
}
function makeEntry(request,turnId){
 return {turnId,turnSearchKey:turnId,isLatestTurn:false,estimatedHeightPx:124,
  turn:{items:[],status:"completed",requestLabel:request.elicitation.message}};
}
test("pending requests use full [hostId,threadId,requestId] identity",()=>{
 assert.notEqual(sourcePendingElicitationKey(one),sourcePendingElicitationKey(two));
 assert.notEqual(sourcePendingElicitationKey(one),
  sourcePendingElicitationKey({...one,hostId:"other"}));
 assert.notEqual(sourcePendingElicitationKey(one),
  sourcePendingElicitationKey({...one,requestId:"req-2"}));
 const store=createSourcePendingElicitationRequestStore();
 const snapshot0=store.getSnapshot();
 let notifications=0;
 const stop=store.subscribe(()=>notifications++);
 store.upsert(urlAction());
 store.upsert(urlAction(two));
 assert.equal(store.getSnapshot().length,2);
 assert.equal(store.get(one).elicitation.kind,"urlAction");
 assert.equal(store.get(two).threadId,"review");
 assert.equal(snapshot0.length,0);
 store.settle({...one,hostId:"different"});
 assert.equal(store.get(one)?.requestId,"req-1");
 store.settle(one);
 assert.equal(store.get(one),null);
 assert.equal(store.get(two)?.requestId,"req-1");
 store.clearThread(two.hostId,two.threadId);
 assert.equal(store.getSnapshot().length,0);
 assert.equal(notifications,4);
 stop();store.dispose();
});
test("invalid identities and unrecognized/unbounded source payloads fail before store mutation",()=>{
 const store=createSourcePendingElicitationRequestStore();
 for(const payload of [
  {...urlAction(),threadId:" "},
  {...urlAction(),hostId:"bad\nhost"},
  {...urlAction(),requestId:"r".repeat(257)},
  {...urlAction(),elicitation:{kind:"invented",message:"fake"}},
  {...urlAction(),elicitation:{kind:"urlAction",url:"x".repeat(33000)}},
  {...urlAction(),elicitation:null},
 ]){
  assert.throws(()=>store.upsert(payload),/pending elicitation/);
 }
 assert.equal(store.getSnapshot().length,0);
 store.dispose();
});
test("real host bridge routes pending/settled/clear through one store and drops stale upstream",()=>{
 const bridge=createSourceConversationHostEventBridge();
 let sendOld;let disconnected=0;
 bridge.connect({subscribe(listener){sendOld=listener;return ()=>disconnected++;}});
 sendOld({type:"pending-elicitation",request:urlAction()});
 assert.equal(bridge.pendingElicitations.get(one)?.elicitation.kind,"urlAction");
 bridge.connect({subscribe(){return ()=>{};}});
 assert.equal(disconnected,1);
 sendOld({type:"elicitation-settled",query:one});
 assert.equal(bridge.pendingElicitations.get(one)?.requestId,"req-1",
  "late callback from old transport must be ignored");
 bridge.publish({type:"pending-elicitation",request:urlAction(two)});
 bridge.publish({type:"elicitation-settled",query:one});
 assert.equal(bridge.pendingElicitations.get(one),null);
 assert.equal(bridge.pendingElicitations.get(two)?.requestId,"req-1");
 bridge.publish({type:"clear-thread",hostId:two.hostId,threadId:two.threadId});
 assert.equal(bridge.pendingElicitations.get(two),null);
 bridge.dispose();
});
test("pending request changes join canonical source, remain under same turn ID and settle by host event only",()=>{
 const bridge=createSourceConversationHostEventBridge();
 const source=makeSource();
 const stop=bindSourcePendingElicitationsToTimeline({
  source,store:bridge.pendingElicitations,hostId:"demo-host",threadId:"frontend",
  createEntry:makeEntry,
 });
 assert.equal(source.getSnapshot().entries.length,1);
 bridge.publish({type:"pending-elicitation",request:urlAction(two)});
 assert.equal(source.getSnapshot().entries.length,1,"wrong thread never mounts");
 bridge.publish({type:"pending-elicitation",request:urlAction()});
 const first=source.getSnapshot();
 assert.equal(first.entries.length,2);
 assert.equal(first.entries[1].turnId,sourcePendingElicitationTurnId(one));
 assert.equal(first.entries[1].isLatestTurn,true);
 assert.equal(first.entries[0].isLatestTurn,false);
 bridge.publish({type:"pending-elicitation",request:urlAction(one,"Updated from host")});
 assert.equal(source.getSnapshot().entries.length,2,"same request does not duplicate");
 assert.equal(source.getSnapshot().entries[1].turnId,first.entries[1].turnId);
 assert.equal(source.getSnapshot().entries[1].turn.requestLabel,"Updated from host");
 // User clicks are intentionally not a store action. Only a HOST settlement
 // event removes a request, including when response IPC is unavailable.
 bridge.publish({type:"elicitation-settled",query:{...one,requestId:"different"}});
 assert.equal(source.getSnapshot().entries.length,2);
 bridge.publish({type:"elicitation-settled",query:one});
 assert.equal(source.getSnapshot().entries.length,1);
 assert.equal(source.getSnapshot().entries[0].isLatestTurn,true);
 stop();bridge.dispose();source.dispose();
});
test("remount after thread switch rehydrates without duplicating pending host rows",()=>{
 const bridge=createSourceConversationHostEventBridge();
 const source=makeSource();
 bridge.publish({type:"pending-elicitation",request:urlAction()});
 const bind=()=>bindSourcePendingElicitationsToTimeline({
  source,store:bridge.pendingElicitations,hostId:"demo-host",threadId:"frontend",
  createEntry:makeEntry,
 });
 const release=bind();
 assert.equal(source.getSnapshot().entries.length,2);
 release();
 const release2=bind();
 assert.equal(source.getSnapshot().entries.length,2);
 bridge.publish({type:"clear-thread",hostId:"demo-host",threadId:"frontend"});
 assert.equal(source.getSnapshot().entries.length,1);
 release2();bridge.dispose();source.dispose();
});
