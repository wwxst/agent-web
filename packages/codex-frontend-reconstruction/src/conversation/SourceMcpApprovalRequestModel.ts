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
/** Original ye's host-scoped request identity, not a global request ID. */
export interface SourceMcpApprovalContext {
  hostId:string;
  conversationId:string;
}
export interface SourceMcpApprovalRequest extends SourceMcpApprovalContext {
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
  context:SourceMcpApprovalContext,
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


/**
 * Original be/ke/Ae/je/Me generic elicitation presentation:
 * metadata.reason is a trimmed nonempty string only. A duplicate trailing
 * "Reason: <reason>" is removed from the visible message; when the remaining
 * text is the generic approval boilerplate, the reason becomes its title.
 * No request permissions are inferred from a message or its metadata.
 */
export function projectSourceMcpGenericApprovalMessage(
  message:string,metadata:unknown,
):{title:string;reason:string|null}{
  const data=metadata!=null&&typeof metadata==="object"&&!Array.isArray(metadata)
    ? metadata as Record<string,unknown> : null;
  const candidate=data?.reason;
  const reason=typeof candidate==="string"&&candidate.trim().length>0
    ?candidate.trim():null;
  const text=message.trim();
  let title=text;
  if(reason!=null){
    const suffix="Reason: "+reason;
    if(title.endsWith(suffix)){
      const cleaned=title.slice(0,-suffix.length).trim();
      if(cleaned.length>0)title=cleaned;
    }
  }
  const boilerplate=title.trim().toLowerCase();
  if(reason!=null&&
    (boilerplate==="tool call needs your approval."||
      boilerplate==="tool call needs your approval")){
    return {title:reason,reason:null};
  }
  return {title,reason};
}

/** Original Se only transforms this literal MCP approval title shape, and
 * uses trusted matched connectorName rather than the raw message name. */
export function projectSourceMcpToolApprovalTitle(
  message:string,connectorName:string,
):{prefix:string;toolName:string;suffix:string}|null{
  const match=/^Allow\s+(.+?)\s+to\s+run\s+tool\s+"([^"]+)"\?$/.exec(message);
  return match==null?null:{
    prefix:"Allow "+connectorName+" to run ",
    toolName:match[2],
    suffix:" tool?",
  };
}
