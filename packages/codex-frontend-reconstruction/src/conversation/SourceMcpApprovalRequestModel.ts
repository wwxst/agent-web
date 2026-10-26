/**
 * Source: frontend/webview/assets/mcp-request-card-e83948fa712b.js
 *   ye -> approve/deny & persistence scopes, Ce -> parameter entries,
 *   we/Ee/Ne -> parameter expansion and preview limits.
 *
 * The host alone may send a response to the MCP elicitation request;
 * this model neither grants permission nor makes any network request.
 */
export type SourceMcpApprovalDecision="accept"|"decline";
export type SourceMcpApprovalPersistence="session"|"always";
export interface SourceMcpApprovalRequest {
  requestId:string;
  title:string;
  connectorName:string;
  subtitle?:string|null;
  reason?:string|null;
  riskLevel?:string|null;
  /** Approved scopes from original host request, never fabricated by UI. */
  persist?:readonly SourceMcpApprovalPersistence[]|null;
  disabled?:boolean;
  approveDisabled?:boolean;
  collapseToolParams?:boolean;
  toolParams?:Readonly<Record<string,unknown>>|null;
  toolParamsDisplay?:readonly SourceMcpApprovalParameter[]|null;
}
export interface SourceMcpApprovalParameter {
  name:string;
  displayName?:string;
  value:unknown;
}
export interface SourceMcpApprovalReply {
  decision:SourceMcpApprovalDecision;
  persist?:SourceMcpApprovalPersistence;
}
export type SourceMcpApprovalReplyTransport=(
  requestId:string,reply:SourceMcpApprovalReply,
)=>Promise<void>;
export const SOURCE_MCP_INITIAL_PARAMETER_COUNT=4;
export const SOURCE_MCP_PARAMETER_TEXT_LINES=4;
export const SOURCE_MCP_PARAMETER_TEXT_LENGTH=120;
export const SOURCE_MCP_PARAMETER_JSON_PREVIEW_LENGTH=48;

export function sourceMcpApprovalParameterEntries(
  params:SourceMcpApprovalRequest["toolParams"],
  display?:SourceMcpApprovalRequest["toolParamsDisplay"],
):readonly SourceMcpApprovalParameter[] {
  // Source Ce uses the host-supplied display projection verbatim.
  if(display!=null)return display;
  if(params==null)return [];
  return Object.entries(params).map(([name,value])=>({
    name,displayName:name.trim(),value,
  }));
}
export function sourceMcpApprovalReply(
  request:Pick<SourceMcpApprovalRequest,"disabled"|"approveDisabled"|"persist">,
  decision:SourceMcpApprovalDecision,
  persist?:SourceMcpApprovalPersistence|null,
):SourceMcpApprovalReply|null {
  if(request.disabled===true)return null;
  if(decision==="decline")return {decision:"decline"};
  if(request.approveDisabled===true)return null;
  if(persist==null)return {decision:"accept"};
  if(!request.persist?.includes(persist))return null;
  return {decision:"accept",persist};
}
export function sourceMcpApprovalParamText(value:unknown):{
  kind:"json"|"text";full:string;preview:string;expandable:boolean;
}{
  if(typeof value==="string"){
    const lines=value.split("\n",SOURCE_MCP_PARAMETER_TEXT_LINES+1);
    return {kind:"text",full:value,preview:value,
      expandable:value.length>SOURCE_MCP_PARAMETER_TEXT_LENGTH ||
        lines.length>SOURCE_MCP_PARAMETER_TEXT_LINES};
  }
  if(value===null||typeof value==="number"||typeof value==="boolean"||value===undefined){
    const text=String(value);
    return {kind:"text",full:text,preview:text,expandable:false};
  }
  let serialized:string;
  try{serialized=JSON.stringify(value)??"";}catch{serialized="[unserializable]";}
  let pretty:string;
  try{pretty=JSON.stringify(value,null,2)??"";}catch{pretty="[unserializable]";}
  const isTruncated=serialized.length>SOURCE_MCP_PARAMETER_JSON_PREVIEW_LENGTH;
  return {kind:"json",full:pretty,
    preview:isTruncated?serialized.slice(0,47)+"…":serialized,
    expandable:isTruncated};
}
