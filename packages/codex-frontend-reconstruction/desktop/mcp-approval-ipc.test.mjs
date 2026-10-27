import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {
 validateMcpApprovalReplyEnvelope,handleMcpApprovalReply,MAX_MCP_REPLY_ID_LENGTH,
}=require("./mcpApprovalReply.cjs");
const valid=Object.freeze({
 hostId:"demo-host",conversationId:"frontend",requestId:"mcp-pending:42",
 response:{decision:"accept",persist:"session"},
});
test("source ye native MCP envelope permits only explicit scoped responses",()=>{
 assert.equal(validateMcpApprovalReplyEnvelope(valid),true);
 assert.equal(validateMcpApprovalReplyEnvelope({...valid,response:{decision:"decline"}}),true);
 const bad=[
  null,{},[],{...valid,requestId:""},
  {...valid,requestId:"x".repeat(MAX_MCP_REPLY_ID_LENGTH+1)},
  {...valid,requestId:" bad "},{...valid,requestId:"bad\nrequest"},
  {...valid,hostId:undefined},{...valid,conversationId:null},
  {...valid,response:{decision:"decline",persist:"always"}},
  {...valid,response:{decision:"accept",persist:"forever"}},
  {...valid,response:{decision:"admin"}},
  {...valid,response:{decision:"accept",extra:"untrusted"}},
  {...valid,response:{decision:"accept"},channel:"run-command"},
 ];
 for(const item of bad){
   assert.equal(validateMcpApprovalReplyEnvelope(item),false,
     "invalid or unscoped reply must not pass the main-process guard");
 }
});
test("main IPC rejects untrusted frames and cannot approve without Agent backend",()=>{
 assert.throws(()=>handleMcpApprovalReply({
   isTrustedRenderer:()=>false,
 },{},valid),/MCP_UNTRUSTED_RENDERER/);
 assert.throws(()=>handleMcpApprovalReply({
   isTrustedRenderer:()=>true,
 },{},{...valid,response:{decision:"decline",persist:"session"}}),
 /MCP_INVALID_REPLY/);
 assert.throws(()=>handleMcpApprovalReply({
   isTrustedRenderer:()=>true,
 },{},valid),/MCP_BACKEND_UNAVAILABLE/);
});
test("explicitly installed verified host transport alone may receive validated decisions",async()=>{
 const sent=[];
 const transport=async value=>{sent.push(value);};
 await handleMcpApprovalReply({
   isTrustedRenderer:()=>true,agentReplyTransport:transport,
 },{},valid);
 assert.deepEqual(sent,[valid]);
 const refused={...valid,response:{decision:"decline",persist:"always"}};
 assert.throws(()=>handleMcpApprovalReply({
   isTrustedRenderer:()=>true,agentReplyTransport:transport,
 },{},refused),/MCP_INVALID_REPLY/);
 assert.equal(sent.length,1);
});
