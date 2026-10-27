/**
 * Original source: mcp-server-elicitation-request-panel-7318114289f7.js
 * ft/pt/mt/Z/Q recognize browser origin approvals; Ge chooses response
 * scopes and Je requires an explicit all-sites risk confirmation.
 * No model method grants permissions.
 */
import type {SourceMcpApprovalContext,SourceMcpApprovalReply} from "./SourceMcpApprovalRequestModel.js";

export const SOURCE_BROWSER_ALL_SITES_SCOPE_KEY="browser_use_persistent_approval_scope" as const;
export const SOURCE_BROWSER_ALL_SITES_SCOPE_VALUE="all-sites" as const;

export type SourceBrowserWebsiteScope="once"|"site"|"all-sites"|"deny";
export interface SourceBrowserWebsiteSource {
  kind:"browser"|"connection";
  name:string;
}
export interface SourceBrowserWebsiteApprovalRequest extends SourceMcpApprovalContext {
  requestId:string;
  origin:string;
  reason:string|null;
  source:SourceBrowserWebsiteSource;
  /** Resolved host policy, not inferred from persisted request data. */
  allowAllSites:boolean;
  disabled?:boolean;
}
export type SourceBrowserWebsiteReply=SourceMcpApprovalReply & {
  [SOURCE_BROWSER_ALL_SITES_SCOPE_KEY]?:typeof SOURCE_BROWSER_ALL_SITES_SCOPE_VALUE;
};
export type SourceBrowserWebsiteReplyTransport=(
  requestId:string,reply:SourceBrowserWebsiteReply,
  context:SourceMcpApprovalContext,
)=>Promise<void>;

function record(value:unknown):Record<string,unknown>|null {
  return value!==null&&typeof value==="object"&&!Array.isArray(value)
    ?value as Record<string,unknown>:null;
}
function string(value:unknown):string|null{
  return typeof value==="string"&&value.trim()?value.trim():null;
}
/** mcp-identifier-ea561b7d1c34.js n/r: normalize and strip connector prefix. */
export function sourceBrowserIdentifier(value:string):boolean{
  const normalized=value.trim().toLowerCase().split(/[^a-z0-9]+/g)
    .filter(Boolean).join("-").replace(/^connector-/u,"");
  return normalized==="browser"||normalized==="browser-use";
}
function browserSource(names:readonly unknown[]):SourceBrowserWebsiteSource|null{
  const values=names.filter((name):name is string=>typeof name==="string")
    .map(name=>name.trim().toLowerCase());
  if(values.some(name=>name.includes("chrome")))return {kind:"connection",name:"Chrome"};
  if(values.some(sourceBrowserIdentifier))return {kind:"browser",name:"Browser"};
  return null;
}
function originAndReason(value:unknown):{origin:string;reason:string|null}|null{
  const obj=record(value),origin=string(obj?.origin);
  if(!origin)return null;
  if(obj?.reason!==undefined&&string(obj.reason)==null)return null;
  return {origin,reason:string(obj?.reason)};
}
/**
 * Original ft allows generic or the exact access_browser_origin MCP call.
 * Approval scope 'always' and recognized Browser/Chrome identity are REQUIRED.
 * This projection never treats unrelated elicitation or arbitrary URL as grant.
 */
export function projectSourceBrowserWebsiteApproval(
  raw:unknown,context:SourceMcpApprovalContext&{requestId:string;allowAllSites:boolean},
):SourceBrowserWebsiteApprovalRequest|null{
  const item=record(raw);
  if(!item)return null;
  let params:{origin:string;reason:string|null}|null=null;
  let persist:unknown=null;
  let source:SourceBrowserWebsiteSource|null=null;
  if(item.kind==="generic"){
    const meta=originAndReason(item.metadata);
    const tool=originAndReason(item.toolParams);
    params=tool==null?meta:{...tool,reason:meta?.reason??tool.reason};
    persist=item.persist;
    source=browserSource([item.serverName]);
  }else if(item.kind==="mcpToolCall"){
    const approval=record(item.approval);
    if(approval?.tool_name!=="access_browser_origin")return null;
    const base=originAndReason(approval),tool=originAndReason(approval?.tool_params);
    params=base==null?tool:{...base,reason:base.reason??tool?.reason??null};
    persist=approval?.persist;
    source=browserSource([approval?.connector_id,approval?.connector_name]);
  }else return null;
  const modes=Array.isArray(persist)?persist:[persist];
  if(params==null||source==null||!modes.includes("always"))return null;
  return {...context,...params,source};
}

export function sourceBrowserWebsiteReply(
  request:Pick<SourceBrowserWebsiteApprovalRequest,"disabled"|"allowAllSites">,
  scope:SourceBrowserWebsiteScope,
):SourceBrowserWebsiteReply|null{
  if(request.disabled)return null;
  if(scope==="deny")return {decision:"decline"};
  if(scope==="once")return {decision:"accept"};
  if(scope==="site")return {decision:"accept",persist:"always"};
  return request.allowAllSites
    ?{decision:"accept",persist:"always",[SOURCE_BROWSER_ALL_SITES_SCOPE_KEY]:SOURCE_BROWSER_ALL_SITES_SCOPE_VALUE}
    :null;
}
export function sourceBrowserWebsiteSafeHref(origin:string):string|null{
  try {
    const url=new URL(origin);
    return url.protocol==="https:"||url.protocol==="http:"?url.href:null;
  }catch{return null;}
}
export function sourceBrowserWebsiteRequestKey(
  request:Pick<SourceBrowserWebsiteApprovalRequest,"hostId"|"conversationId"|"requestId">,
):string{
  return JSON.stringify([request.hostId,request.conversationId,request.requestId]);
}
