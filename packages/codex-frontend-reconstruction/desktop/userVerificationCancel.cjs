"use strict";
/**
 * Original mcp-plugin-logo Ke cancel wire:
 * replyWithMcpServerElicitationResponse(conversationId,requestId,
 *   ye("cancel", {"openai/userVerificationReason":"userCancelled"})).
 *
 * Separate from generic MCP accept/decline. Authenticated backend absence
 * MUST reject. This independent API does not sign biometric challenges.
 */
const ID_MAX=256;
const validId=value=>typeof value==="string"&&value.length>0&&
 value.length<=ID_MAX&&value.trim()===value&&
 !/[\u0000-\u001f\u007f]/.test(value);
const object=value=>value!=null&&typeof value==="object"&&!Array.isArray(value);
function validateUserVerificationCancel(envelope){
 return object(envelope)&&
  Object.keys(envelope).length===4&&
  ["hostId","conversationId","requestId","reason"].every(k=>Object.hasOwn(envelope,k))&&
  ["hostId","conversationId","requestId"].every(k=>validId(envelope[k]))&&
  envelope.reason==="userCancelled";
}
function handleUserVerificationCancel({isTrustedRenderer,agentCancelTransport=null},event,envelope){
 if(typeof isTrustedRenderer!=="function"||!isTrustedRenderer(event))
  throw new Error("USER_VERIFICATION_UNTRUSTED_RENDERER");
 if(!validateUserVerificationCancel(envelope))
  throw new TypeError("USER_VERIFICATION_INVALID_CANCEL");
 if(typeof agentCancelTransport!=="function")
  throw new Error("USER_VERIFICATION_BACKEND_UNAVAILABLE");
 return agentCancelTransport({
  ...envelope,response:{
    decision:"cancel","openai/userVerificationReason":"userCancelled",
  },
 });
}
module.exports={validateUserVerificationCancel,handleUserVerificationCancel};
