import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {validateUnsupportedFormReply,handleUnsupportedFormReply}
  =require("./unsupportedFormReply.cjs");
const payload={hostId:"host-a",conversationId:"thread-b",
 requestId:"request-c",action:"decline"};
test("source q2t unsupported forms permit only decline or cancel under scoped identity",()=>{
 for(const action of ["decline","cancel"])
  assert.equal(validateUnsupportedFormReply({...payload,action}),true);
 for(const candidate of [
  null,{}, {...payload,action:"accept"}, {...payload,action:"deny"},
  {...payload,action:"userCancelled"}, {...payload,requestId:""},
  {...payload,hostId:" other "}, {...payload,requestId:"id\nline"},
  {...payload,conversationId:55},
  {...payload,response:{decision:"accept"}},
  {hostId:payload.hostId,conversationId:payload.conversationId,requestId:payload.requestId},
 ]){
  assert.equal(validateUnsupportedFormReply(candidate),false);
 }
});
test("native response handler is sender-validated and fails closed without Agent backend",async()=>{
 const trusted=()=>true;
 assert.throws(()=>handleUnsupportedFormReply({
  isTrustedRenderer:()=>false,
 },{},payload),/UNSUPPORTED_FORM_UNTRUSTED_RENDERER/);
 assert.throws(()=>handleUnsupportedFormReply({
  isTrustedRenderer:trusted,
 },{},{...payload,action:"accept"}),/UNSUPPORTED_FORM_INVALID_REPLY/);
 assert.throws(()=>handleUnsupportedFormReply({
  isTrustedRenderer:trusted,
 },{},payload),/UNSUPPORTED_FORM_BACKEND_UNAVAILABLE/);
 const calls=[];
 const result=await handleUnsupportedFormReply({
  isTrustedRenderer:trusted,
  agentFormReplyTransport:async envelope=>{
   calls.push(envelope);return "delivered";
  },
 },{},payload);
 assert.equal(result,"delivered");
 assert.deepEqual(calls,[{hostId:"host-a",conversationId:"thread-b",
  requestId:"request-c",
  response:{action:"decline",content:null,_meta:null}}]);
});
