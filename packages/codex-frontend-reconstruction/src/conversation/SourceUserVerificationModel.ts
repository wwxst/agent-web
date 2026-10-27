/**
 * Original Windows assets:
 * mcp-server-elicitation-request-panel-7318114289f7.js (at userVerification)
 * mcp-plugin-logo-807452fde2d3.js (Re render, Ke biometric lifecycle).
 *
 * Original Ke uses beginUserVerification with a native biometric provider,
 * then calls a verified session's accept method. Never infer successful
 * biometric approval from an IPC result or a local button.
 */
export interface SourceUserVerificationRequest{
 hostId:string;conversationId:string;requestId:string;
 serverName:string;title:string;description:string;
}
export interface SourceUserVerificationCancelEnvelope{
 hostId:string;conversationId:string;requestId:string;
 reason:"userCancelled";
}
export type SourceUserVerificationCancelTransport=(
 envelope:SourceUserVerificationCancelEnvelope,
)=>Promise<void>;
const record=(v:unknown):Record<string,unknown>|null=>
 v!=null&&typeof v==="object"&&!Array.isArray(v)?v as Record<string,unknown>:null;
const cleanText=(value:unknown):string|null=>
 typeof value==="string"&&value.trim().length>0&&
 value.length<=4096&& !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)
 ?value:null;
export function projectSourceUserVerificationRequest(
 value:unknown,
 context:Pick<SourceUserVerificationRequest,"hostId"|"conversationId"|"requestId">,
):SourceUserVerificationRequest|null{
 const obj=record(value);
 if(obj?.kind!=="userVerification")return null;
 const title=cleanText(obj.title),serverName=cleanText(obj.serverName),
 description=cleanText(obj.description);
 if(title==null||serverName==null||
   (obj.description!=null&&description==null))return null;
 return {...context,title,serverName,description:description??""};
}
export function sourceUserVerificationCancel(
 request:Pick<SourceUserVerificationRequest,"hostId"|"conversationId"|"requestId">,
):SourceUserVerificationCancelEnvelope{
 return {hostId:request.hostId,conversationId:request.conversationId,
  requestId:request.requestId,reason:"userCancelled"};
}
export function sourceUserVerificationKey(
 request:Pick<SourceUserVerificationRequest,"hostId"|"conversationId"|"requestId">,
):string{
 return JSON.stringify([request.hostId,request.conversationId,request.requestId]);
}
