import * as React from "react";
import {
  sourceMcpApprovalParamText,
  sourceMcpApprovalParameterEntries,
  sourceMcpApprovalReply,
  SOURCE_MCP_INITIAL_PARAMETER_COUNT,
  type SourceMcpApprovalRequest,
  type SourceMcpApprovalPersistence,
  type SourceMcpApprovalDecision,
  type SourceMcpApprovalReplyTransport,
  type SourceMcpApprovalParameter,
} from "../conversation/SourceMcpApprovalRequestModel.js";
import "./sourceMcpApprovalRequestCard.css";

export interface SourceMcpApprovalRequestCardProps {
  request:SourceMcpApprovalRequest;
  /** Only the host can send MCP elicitation replies. Undefined = readonly. */
  onReply?:SourceMcpApprovalReplyTransport|undefined;
}
function Param({entry}:{entry:SourceMcpApprovalParameter}){
  const [expanded,setExpanded]=React.useState(false);
  const content=sourceMcpApprovalParamText(entry.value);
  return <div className="codex-source-mcp-approval__param" data-source-mcp-param={entry.name}>
    <span className="codex-source-mcp-approval__param-name">{entry.displayName??entry.name}</span>
    <div className="codex-source-mcp-approval__param-value">
      <pre className={content.kind==="json"?"codex-source-mcp-approval__json":""}
        data-source-mcp-param-preview={expanded?"expanded":"preview"}>{expanded?content.full:content.preview}</pre>
      {content.expandable?<button type="button" aria-expanded={expanded}
        aria-label={(expanded?"Collapse ":"Expand ")+(entry.displayName??entry.name)}
        onClick={()=>setExpanded(value=>!value)}>{expanded?"Collapse":"Expand"}</button>:null}
    </div>
  </div>;
}
/**
 * Real conversation-mounted source ye card. The private Nz design-system card,
 * Mxn transport, localization and connector icon are host responsibilities.
 * No capability/persistence is inferred from displayed request fields.
 */
export function SourceMcpApprovalRequestCard({
  request,onReply,
}:SourceMcpApprovalRequestCardProps){
  const [phase,setPhase]=React.useState<"idle"|"submitting"|"error"|"submitted">("idle");
  const [error,setError]=React.useState<string|null>(null);
  const [expanded,setExpanded]=React.useState(false);
  const [showAll,setShowAll]=React.useState(false);
  const submitting=React.useRef(false);
  const generation=React.useRef(0);
  React.useEffect(()=>{
    generation.current++;
    submitting.current=false;
    setPhase("idle");
    setError(null);
    setExpanded(false);
    setShowAll(false);
    return ()=>{generation.current++;};
  },[request.requestId]);
  const entries=sourceMcpApprovalParameterEntries(request.toolParams,request.toolParamsDisplay);
  const visible=showAll?entries:entries.slice(0,SOURCE_MCP_INITIAL_PARAMETER_COUNT);
  const remaining=entries.length-visible.length;
  const disabled=request.disabled===true||onReply==null||phase==="submitting"||phase==="submitted";
  const canApprove=!disabled&&request.approveDisabled!==true;
  async function respond(decision:SourceMcpApprovalDecision,persist?:SourceMcpApprovalPersistence){
    const reply=sourceMcpApprovalReply(request,decision,persist);
    if(reply==null||onReply==null||submitting.current||phase==="submitted")return;
    submitting.current=true;
    setPhase("submitting");setError(null);
    const current=generation.current;
    try{
      await onReply(request.requestId,reply,{
        hostId:request.hostId,conversationId:request.conversationId,
      });
      if(generation.current!==current)return;
      // Transport delivery is NOT permission approval. Wait for the host
      // to settle/remove this request via authoritative conversation state.
      setPhase("submitted");
    }catch(failure){
      if(generation.current!==current)return;
      submitting.current=false;
      setPhase("error");
      const backendUnavailable=failure instanceof Error&&
        failure.message.includes("MCP_BACKEND_UNAVAILABLE");
      setError(backendUnavailable
        ?"Unable to send response: MCP backend unavailable. No permission was changed."
        :"Unable to send response. Retry or contact the host.");
    }
  }
  return <section className="codex-source-mcp-approval"
    data-source-mcp-approval-card=""
    data-source-mcp-request-id={request.requestId}
    data-source-mcp-reply-phase={phase}
    aria-label="MCP tool approval request">
    <div className="codex-source-mcp-approval__header">
      <span className="codex-source-mcp-approval__connector">{request.connectorName}</span>
      {request.riskLevel==="high"
        ?<span className="codex-source-mcp-approval__risk">Elevated Risk</span>:null}
    </div>
    <h3 className="codex-source-mcp-approval__title">{request.title}</h3>
    {request.subtitle?<p className="codex-source-mcp-approval__subtitle">{request.subtitle}</p>:null}
    {request.reason?<p className="codex-source-mcp-approval__reason">{request.reason}</p>:null}
    {entries.length>0?<div className="codex-source-mcp-approval__params"
      data-source-mcp-parameter-count={entries.length}>
      {request.collapseToolParams?<button type="button" aria-expanded={expanded}
        onClick={()=>setExpanded(value=>!value)}>{expanded?"Hide details":"Show details"}</button>:null}
      {(!request.collapseToolParams||expanded)?<>
        {visible.map((entry,index)=>
          <Param key={entry.name+":"+index} entry={entry}/>)}
        {remaining>0?<button type="button" onClick={()=>setShowAll(true)}>
          Show {remaining} more items
        </button>:null}
        {showAll&&entries.length>SOURCE_MCP_INITIAL_PARAMETER_COUNT
          ?<button type="button" onClick={()=>setShowAll(false)}>Show fewer items</button>:null}
      </>:null}
    </div>:null}
    {error?<p role="alert" className="codex-source-mcp-approval__error">{error}</p>:null}
    {phase==="submitting"?<p role="status">Submitting response to host…</p>:null}
    {phase==="submitted"?<p role="status">Response sent to host; awaiting request settlement.</p>:null}
    {onReply==null?<p className="codex-source-mcp-approval__readonly">
      No approval transport is connected. This request is read-only.
    </p>:null}
    <div className="codex-source-mcp-approval__actions">
      <button type="button" disabled={disabled} onClick={()=>{void respond("decline");}}>
        Deny
      </button>
      {request.persist?.includes("session")?<button type="button" disabled={!canApprove}
        onClick={()=>{void respond("accept","session");}}>Allow for session</button>:null}
      {request.persist?.includes("always")?<button type="button" disabled={!canApprove}
        onClick={()=>{void respond("accept","always");}}>Always allow</button>:null}
      <button type="button" disabled={!canApprove} onClick={()=>{void respond("accept");}}>
        Allow once
      </button>
    </div>
  </section>;
}
