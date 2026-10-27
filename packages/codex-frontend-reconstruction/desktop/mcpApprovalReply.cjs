"use strict";
/**
 * Standalone Electron response IPC boundary, NOT Codex's private protocol.
 * Original mcp-request-card ye passes {conversationId,hostId,requestId}
 * to replyWithMcpServerElicitationResponse. This independent application
 * has no verified Agent authorization backend; all syntactically valid
 * replies must therefore fail closed, never report a completed approval.
 */
const MAX_MCP_REPLY_ID_LENGTH=256;
const isRecord=x=>x!==null&&typeof x==="object"&&!Array.isArray(x);
const onlyKeys=(record,keys)=>Object.keys(record).every(key=>keys.includes(key));
const validId=id=>typeof id==="string"&&id.length>0&&
  id.length<=MAX_MCP_REPLY_ID_LENGTH&&id.trim()===id&&
  !/[\u0000-\u001f\u007f]/.test(id);
function validateMcpApprovalReplyEnvelope(value){
  if(!isRecord(value)||!onlyKeys(value,["hostId","conversationId","requestId","response"]))
    return false;
  if(!validId(value.hostId)||!validId(value.conversationId)||!validId(value.requestId))
    return false;
  const response=value.response;
  if(!isRecord(response)||!onlyKeys(response,["decision","persist"]))return false;
  if(response.decision!=="accept"&&response.decision!=="decline")return false;
  if(Object.hasOwn(response,"persist")){
    if(response.decision!=="accept")return false;
    if(response.persist!=="session"&&response.persist!=="always")return false;
  }
  return true;
}
function handleMcpApprovalReply({isTrustedRenderer,agentReplyTransport=null},event,envelope){
  if(typeof isTrustedRenderer!=="function"||!isTrustedRenderer(event))
    throw new Error("MCP_UNTRUSTED_RENDERER");
  if(!validateMcpApprovalReplyEnvelope(envelope))
    throw new TypeError("MCP_INVALID_REPLY");
  // A reply bridge must be explicitly supplied by an independently verified
  // Agent host. Never interpret syntactic validity as approval permission.
  if(typeof agentReplyTransport!=="function")
    throw new Error("MCP_BACKEND_UNAVAILABLE");
  return agentReplyTransport(envelope);
}
module.exports={
  validateMcpApprovalReplyEnvelope,handleMcpApprovalReply,
  MAX_MCP_REPLY_ID_LENGTH,
};
