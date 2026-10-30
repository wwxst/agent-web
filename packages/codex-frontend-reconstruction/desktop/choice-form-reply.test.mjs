import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {validFormTextReply,handleFormTextReply}=require("./textFormReply.cjs");
const ids={hostId:"demo-host",conversationId:"frontend",requestId:"choices-1"};
test("source radio and multi-choice native IPC preserves strict string-array shape",async()=>{
 const accept={...ids,action:"accept",content:{
  mode:"code",tasks:["plan","review"],enabled:false,
 }};
 assert.equal(validFormTextReply(accept),true);
 const sends=[];
 assert.equal(await handleFormTextReply({
  isTrustedRenderer:()=>true,
  agentFormReplyTransport:async reply=>{sends.push(reply);return true;},
 },{},accept),true);
 assert.deepEqual(sends,[{...ids,response:{
  action:"accept",content:accept.content,_meta:null,
 }}]);
 assert.throws(()=>handleFormTextReply({isTrustedRenderer:()=>true},
  {},accept),/TEXT_FORM_BACKEND_UNAVAILABLE/);
 for(const v of [
  ["plan","plan"],["plan",12],[""],["plan","bad\nkey"],
  ["x".repeat(257)],Array.from({length:13},(_,i)=>"choice"+i),
  [{value:"plan"}],
 ]){
  assert.equal(validFormTextReply({...accept,content:{tasks:v}}),false);
 }
});
