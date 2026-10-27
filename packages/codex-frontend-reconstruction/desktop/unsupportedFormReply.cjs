"use strict";
/**
 * Uploaded request-panel bn and app-initial q2t (export iSr):
 * unsupportedOpenAIForm supports Skip => decline, Dismiss/Escape => cancel.
 * q2t(action) returns {action,content:null,_meta:null}, NOT
 * {decision:"decline"} and not a generic MCP approval grant.
 *
 * This independent Electron shell has NO authenticated Agent form backend.
 * The only optional transport is injected by a verified host; default
 * ALWAYS fails closed even for syntactically valid renderer requests.
 */
const isObject=value=>value!=null&&typeof value==="object"&&!Array.isArray(value);
const validId=value=>typeof value==="string"&&value.trim()===value&&
 value.length>0&&value.length<=256&&!/[\u0000-\u001f\u007f]/u.test(value);
function validateUnsupportedFormReply(envelope){
 return isObject(envelope)&&
  Object.keys(envelope).length===4&&
  ["hostId","conversationId","requestId","action"].every(k=>Object.hasOwn(envelope,k))&&
  ["hostId","conversationId","requestId"].every(k=>validId(envelope[k]))&&
  (envelope.action==="decline"||envelope.action==="cancel");
}
function handleUnsupportedFormReply({
 isTrustedRenderer,agentFormReplyTransport=null,
},event,envelope){
 if(typeof isTrustedRenderer!=="function"||!isTrustedRenderer(event))
  throw new Error("UNSUPPORTED_FORM_UNTRUSTED_RENDERER");
 if(!validateUnsupportedFormReply(envelope))
  throw new TypeError("UNSUPPORTED_FORM_INVALID_REPLY");
 if(typeof agentFormReplyTransport!=="function")
  throw new Error("UNSUPPORTED_FORM_BACKEND_UNAVAILABLE");
 return agentFormReplyTransport({
  hostId:envelope.hostId,conversationId:envelope.conversationId,
  requestId:envelope.requestId,
  response:{action:envelope.action,content:null,_meta:null},
 });
}
module.exports={validateUnsupportedFormReply,handleUnsupportedFormReply};
