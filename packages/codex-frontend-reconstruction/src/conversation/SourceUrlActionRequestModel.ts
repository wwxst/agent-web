/**
 * Original Windows compiled source:
 * mcp-server-elicitation-request-panel-7318114289f7.js (at: urlAction)
 * mcp-plugin-logo-807452fde2d3.js (dt + shared ct compact request panel).
 *
 * Unlike an approval grant, opening an external resource NEVER settles
 * the elicitation. The reply is sent only on Continue or Not now.
 */
import type {
  SourceMcpApprovalContext,SourceMcpApprovalReply,
  SourceMcpApprovalReplyTransport,
} from "./SourceMcpApprovalRequestModel.js";

export interface SourceUrlActionRequest extends SourceMcpApprovalContext {
  requestId:string;
  url:string;
  message:string;
  disabled?:boolean;
}
export type SourceUrlActionReplyTransport=SourceMcpApprovalReplyTransport;
export type SourceUrlActionReply=SourceMcpApprovalReply;

function object(value:unknown):Record<string,unknown>|null {
  return value!==null&&typeof value==="object"&&!Array.isArray(value)
    ?value as Record<string,unknown>:null;
}
/** Original at selects only the urlAction discriminant. Host must identify
 * the pending request, not infer a consent request from a markdown URL. */
export function projectSourceUrlActionRequest(
  value:unknown,context:SourceMcpApprovalContext&{requestId:string},
):SourceUrlActionRequest|null {
  const data=object(value);
  if(data?.kind!=="urlAction")return null;
  const action=object(data.action)??data;
  if(typeof action.url!=="string"||typeof action.message!=="string")return null;
  if(sourceUrlActionSafeHref(action.url)==null)return null;
  return {...context,url:action.url,message:action.message};
}
/** The independent Electron host permits only external HTTPS links. It does
 * NOT implement Codex's private initiator/redirect/navigation bridge. */
export function sourceUrlActionSafeHref(value:string):string|null {
  if(typeof value!=="string"||value.length>2048||
    /[\u0000-\u001f\u007f]/u.test(value))return null;
  try{
    const url=new URL(value);
    if(url.protocol!=="https:"||!url.hostname||url.username||url.password)return null;
    return url.href;
  }catch{return null;}
}
export function sourceUrlActionReply(
  decision:"accept"|"decline",disabled=false,
):SourceUrlActionReply|null {
  return disabled?null:{decision};
}
export function sourceUrlActionRequestKey(
  request:Pick<SourceUrlActionRequest,"hostId"|"conversationId"|"requestId">,
):string{
  return JSON.stringify([request.hostId,request.conversationId,request.requestId]);
}
