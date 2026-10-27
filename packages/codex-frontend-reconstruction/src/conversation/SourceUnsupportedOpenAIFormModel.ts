/**
 * Uploaded original Windows assets:
 * mcp-server-elicitation-request-panel-7318114289f7.js
 *   at("unsupportedOpenAIForm") -> request-panel ke / bn.
 * request-panel-26c348285c1a.js:
 *   bn shows serverName, "Dismiss" -> cancel and "Skip" -> decline.
 * app-initial-5851df3f6cb1.js q2t (export iSr) encodes
 *   {action:"decline"|"cancel",content:null,_meta:null}.
 *
 * Independent typed transport. NEVER downcast source "cancel" to generic
 * MCP "decline" or invent answers for fields the client cannot display.
 */
export interface SourceUnsupportedOpenAIFormRequest{
 hostId:string;
 conversationId:string;
 requestId:string;
 serverName:string;
}
export interface SourceUnsupportedOpenAIFormReply{
 hostId:string;
 conversationId:string;
 requestId:string;
 action:"decline"|"cancel";
}
export type SourceUnsupportedOpenAIFormReplyTransport=(
 reply:SourceUnsupportedOpenAIFormReply,
)=>Promise<void>;
const record=(value:unknown):Record<string,unknown>|null=>
 value!=null&&typeof value==="object"&&!Array.isArray(value)
 ?value as Record<string,unknown>:null;
const MAX_DISPLAY_LENGTH=256;
export function projectSourceUnsupportedOpenAIForm(
 elicitation:unknown,
 context:Pick<SourceUnsupportedOpenAIFormRequest,
   "hostId"|"conversationId"|"requestId">,
):SourceUnsupportedOpenAIFormRequest|null{
 const input=record(elicitation);
 if(input?.kind!=="unsupportedOpenAIForm"||
   typeof input.serverName!=="string"||
   input.serverName.trim().length===0||
   input.serverName.length>MAX_DISPLAY_LENGTH||
   /[\u0000-\u001f\u007f]/u.test(input.serverName))return null;
 return {...context,serverName:input.serverName};
}
export function sourceUnsupportedOpenAIFormReply(
 request:Pick<SourceUnsupportedOpenAIFormRequest,"hostId"|"conversationId"|"requestId">,
 action:"decline"|"cancel",
):SourceUnsupportedOpenAIFormReply{
 return {hostId:request.hostId,conversationId:request.conversationId,
  requestId:request.requestId,action};
}
export function sourceUnsupportedOpenAIFormWireResponse(
 action:"decline"|"cancel",
):{action:"decline"|"cancel";content:null;_meta:null}{
 return {action,content:null,_meta:null};
}
export function sourceUnsupportedOpenAIFormKey(
 request:Pick<SourceUnsupportedOpenAIFormRequest,"hostId"|"conversationId"|"requestId">,
):string{
 return JSON.stringify([request.hostId,request.conversationId,request.requestId]);
}
