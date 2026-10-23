import {test} from "node:test";
import assert from "node:assert/strict";
import {
 createSourceHistoricalTurnContentSource,
 createSourceHistoricalTurnStore,
 sourceHistoricalTurnQuery,
 selectSourceHistoricalTurnItems,
} from "../build/SourceHistoricalTurnContentSource.js";
const q={hostId:"h",threadId:"t",entityKey:"history-1"};
const entry={historyEntityKey:"history-1",hostId:"h",conversationId:"t",
 turn:undefined,turnItemIds:["a","b"],isAeonThread:false};
const payload={status:"completed",items:[
 {id:"a",type:"userMessage",content:"History"},
 {id:"b",type:"exec",command:"git status"},
 {id:"other",type:"exec",command:"not in this turn"},
]};

test("original Y history-summary query activates only after stripping inline turn",()=>{
 assert.deepEqual(sourceHistoricalTurnQuery(entry),q);
 assert.equal(sourceHistoricalTurnQuery({...entry,turn:{items:[]}}),null);
 assert.equal(sourceHistoricalTurnQuery({...entry,preserveServerUserMessages:true}),null);
 assert.equal(sourceHistoricalTurnQuery({...entry,isAeonThread:true}),null);
 assert.equal(sourceHistoricalTurnQuery({...entry,turnState:{}}),null);
 assert.equal(sourceHistoricalTurnQuery({...entry,transcriptBlock:{}}),null);
 assert.equal(sourceHistoricalTurnQuery({...entry,historyEntityKey:null}),null);
 assert.equal(sourceHistoricalTurnQuery({...entry,hostId:null}),null);
 assert.equal(sourceHistoricalTurnQuery({...entry,conversationId:null}),null);
});

test("host history event hydrates a stable snapshot and turnItemIds exclude unrelated content",()=>{
 const store=createSourceHistoricalTurnStore(),source=createSourceHistoricalTurnContentSource(q,store);
 const initial=source.getSnapshot(),seen=[];
 const stop=source.subscribe(()=>seen.push(source.getSnapshot().revision));
 assert.equal(initial.loaded,false);
 assert.deepEqual(selectSourceHistoricalTurnItems(initial,entry.turnItemIds),[]);
 store.publish(q,payload);
 const snap=source.getSnapshot();
 assert.equal(snap.loaded,true);
 assert.equal(snap.status,"completed");
 assert.deepEqual(selectSourceHistoricalTurnItems(snap,entry.turnItemIds).map(x=>x.id),["a","b"]);
 // Original Y keeps turnItemIds in source order, even if the host history
 // subscription replays its values in a different insertion order.
 assert.deepEqual(selectSourceHistoricalTurnItems(snap,["b","a"]).map(x=>x.id),["b","a"]);
 assert.deepEqual(selectSourceHistoricalTurnItems(snap,undefined).map(x=>x.id),["a","b","other"]);
 assert.notEqual(snap,initial);
 assert.equal(source.getSnapshot(),snap);
 store.publish(q,payload);
 assert.deepEqual(seen,[1]);
 stop();source.dispose();store.dispose();
});

test("cache replays already published content to a newly mounted virtual row",()=>{
 const store=createSourceHistoricalTurnStore();
 store.publish(q,payload);
 const source=createSourceHistoricalTurnContentSource(q,store);
 assert.equal(source.getSnapshot().loaded,true);
 assert.deepEqual(source.getSnapshot().items.map(x=>x.id),["a","b","other"]);
 source.dispose();store.dispose();
});

test("history clearing invalidates mounted rows and later recovery restores them",()=>{
 const store=createSourceHistoricalTurnStore(),source=createSourceHistoricalTurnContentSource(q,store);
 store.publish(q,payload);
 store.clearThread("h","other");
 assert.equal(source.getSnapshot().loaded,true);
 store.clearThread("h","t");
 assert.equal(source.getSnapshot().loaded,false);
 assert.equal(source.getSnapshot().items.length,0);
 store.publish(q,{status:"in_progress",items:[payload.items[0]]});
 assert.equal(source.getSnapshot().loaded,true);
 assert.equal(source.getSnapshot().status,"in_progress");
 source.dispose();store.dispose();
});

test("moving to another history identity drops stale updates from the prior thread",()=>{
 const handlers=new Map();
 const host={subscribeHistoryTurn(query,listener){
  handlers.set(query.threadId,listener);return ()=>{};
 }};
 const source=createSourceHistoricalTurnContentSource(q,host);
 const old=handlers.get("t");
 old(payload);
 source.updateQuery({hostId:"h",threadId:"t2",entityKey:"history-2"});
 const snapshot=source.getSnapshot();
 assert.equal(snapshot.loaded,false);
 old(payload);
 assert.equal(source.getSnapshot(),snapshot);
 handlers.get("t2")({status:"completed",items:[{id:"new",type:"exec"}]});
 assert.deepEqual(source.getSnapshot().items.map(x=>x.id),["new"]);
 source.dispose();
});

test("same identity does not resubscribe, disposal rejects callbacks",()=>{
 let subs=0,stops=0,listener=()=>{};
 const source=createSourceHistoricalTurnContentSource(q,{
  subscribeHistoryTurn(_query,cb){subs++;listener=cb;return ()=>{stops++;};},
 });
 source.updateQuery({...q});
 assert.equal(subs,1);
 source.dispose();
 assert.equal(stops,1);
 const snapshot=source.getSnapshot();
 listener(payload);
 assert.equal(source.getSnapshot(),snapshot);
});

test("missing host subscription and errors are exposed without throwing during render",()=>{
 const source=createSourceHistoricalTurnContentSource(q,{
  subscribeHistoryTurn(){throw new Error("cannot read history");},
 });
 assert.match(String(source.getSnapshot().error),/cannot read history/);
 assert.equal(source.getSnapshot().loaded,false);
 source.dispose();
});

test("null payload is loaded empty turn; undefined is still awaiting history",()=>{
 const store=createSourceHistoricalTurnStore(),source=createSourceHistoricalTurnContentSource(q,store);
 store.publish(q,null);
 assert.equal(source.getSnapshot().loaded,true);
 assert.deepEqual(source.getSnapshot().items,[]);
 store.publish(q,undefined);
 assert.equal(source.getSnapshot().loaded,false);
 source.dispose();store.dispose();
});
