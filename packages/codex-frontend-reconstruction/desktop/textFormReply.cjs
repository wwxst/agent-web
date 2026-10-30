"use strict";
/**
 * Source request-panel ei/Y calls St(action,null,content ?? {});
 * Original app-initial q2t => {action,content,_meta:null}.
 *
 * Independent host accepts ONLY text-only form answer envelopes and has no
 * authenticated Agent backend. The real Agent MUST revalidate content
 * against its authoritative pending schema before acting on it.
 */
const record=v=>v!==null&&typeof v==="object"&&!Array.isArray(v);
const id=v=>typeof v==="string"&&v.length>0&&v.length<=256&&
 v.trim()===v&&!/[\u0000-\u001f\u007f]/.test(v);
const SAFE_KEY=k=>id(k)&&!["__proto__","constructor","prototype"].includes(k);
const choiceArray=v=>Array.isArray(v)&&v.length<=12&&
 v.every(item=>typeof item==="string"&&item.length>0&&item.length<=256&&
  !/[\u0000-\u001f\u007f]/.test(item))&&new Set(v).size===v.length;
const answerValue=v=>
 choiceArray(v)||
 typeof v==="boolean"||
 typeof v==="number"&&Number.isFinite(v)&&Math.abs(v)<=1e12||
 typeof v==="string"&&v.length<=16384&&
 !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v);
function validFormTextReply(value){
 if(!record(value)||Object.keys(value).length!==5||
   !["hostId","conversationId","requestId","action","content"]
     .every(k=>Object.hasOwn(value,k))||
   ![value.hostId,value.conversationId,value.requestId].every(id)||
   !["accept","decline","cancel"].includes(value.action))return false;
 if(value.action!=="accept")return value.content===null;
 const content=value.content;
 if(!record(content))return false;
 const keys=Object.keys(content);
 if(keys.length>12)return false;
 if(keys.some(k=>!SAFE_KEY(k)||!answerValue(content[k])))return false;
 try{return JSON.stringify(value).length<=32768;}
 catch{return false;}
}
function handleFormTextReply({isTrustedRenderer,agentFormReplyTransport=null},event,envelope){
 if(typeof isTrustedRenderer!=="function"||!isTrustedRenderer(event))
  throw new Error("TEXT_FORM_UNTRUSTED_RENDERER");
 if(!validFormTextReply(envelope))
  throw new TypeError("TEXT_FORM_INVALID_REPLY");
 if(typeof agentFormReplyTransport!=="function")
  throw new Error("TEXT_FORM_BACKEND_UNAVAILABLE");
 // The real authenticated Agent must check choices against the authoritative
 // pending schema. Never accept a new value based on renderer shape alone.
 const content=envelope.action==="accept"
   ?Object.fromEntries(Object.entries(envelope.content).map(([k,v])=>
      [k,Array.isArray(v)?[...v]:v])):null;
 return agentFormReplyTransport({
  hostId:envelope.hostId,conversationId:envelope.conversationId,
  requestId:envelope.requestId,
  response:{action:envelope.action,content,_meta:null},
 });
}
module.exports={validFormTextReply,handleFormTextReply};
