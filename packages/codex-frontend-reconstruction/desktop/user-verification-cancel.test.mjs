import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {validateUserVerificationCancel,handleUserVerificationCancel}
  =require("./userVerificationCancel.cjs");
const envelope={hostId:"demo-host",conversationId:"frontend",
 requestId:"verify-1",reason:"userCancelled"};
test("verification cancellation is a separate exact source decision, never generic MCP decline",()=>{
 assert.equal(validateUserVerificationCancel(envelope),true);
 const invalid=[
  null,{}, {...envelope,reason:"decline"}, {...envelope,reason:"accepted"},
  {...envelope,hostId:""}, {...envelope,requestId:"bad\nid"},
  {...envelope,conversationId:" a "},
  {...envelope,extra:"untrusted"},
  {hostId:envelope.hostId,conversationId:envelope.conversationId,
    requestId:envelope.requestId},
 ];
 for(const input of invalid)assert.equal(validateUserVerificationCancel(input),false,
  "invalid exact request or response scope");
});
test("native handler validates trusted sender, fails closed without actual authenticated Agent",async()=>{
 const trusted=()=>true;
 assert.throws(()=>handleUserVerificationCancel({isTrustedRenderer:()=>false},
  {},envelope),/USER_VERIFICATION_UNTRUSTED_RENDERER/);
 assert.throws(()=>handleUserVerificationCancel({isTrustedRenderer:trusted},
  {},{...envelope,reason:"accept"}),/USER_VERIFICATION_INVALID_CANCEL/);
 assert.throws(()=>handleUserVerificationCancel({isTrustedRenderer:trusted},
  {},envelope),/USER_VERIFICATION_BACKEND_UNAVAILABLE/);
 const calls=[];
 const output=handleUserVerificationCancel({
  isTrustedRenderer:trusted,
  agentCancelTransport:async body=>{calls.push(body);return "delivered";},
 },{},envelope);
 assert.equal(await output,"delivered");
 assert.deepEqual(calls,[{...envelope,response:{
  decision:"cancel","openai/userVerificationReason":"userCancelled",
 }}]);
});
