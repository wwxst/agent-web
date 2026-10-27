import * as React from "react";
import {
  sourceComputerUseDecision,
  sourceComputerUseRequestKey,
  sourceComputerUseSubtitle,
  sourceComputerUseTitle,
  type SourceComputerUseApprovalRequest,
  type SourceComputerUseReplyTransport,
} from "../conversation/SourceComputerUseApprovalModel.js";
import {SourceApprovalCardSurface} from "./SourceApprovalCardSurface.js";
import "./sourceMcpApprovalRequestCard.css";
import "./sourceComputerUseApprovalRequestCard.css";

export interface SourceComputerUseApprovalRequestCardProps {
  request:SourceComputerUseApprovalRequest;
  /** Only an authenticated host may supply reply delivery. No callback is readonly. */
  onReply?:SourceComputerUseReplyTransport|undefined;
}
/**
 * Original E is a distinct approval family sharing source qbd, not ye's
 * generic MCP title, parameters or Allow-once split menu.
 *
 * An IPC response being *delivered* is not evidence permission was granted.
 * This card stays in "submitted" until the authoritative host removes or
 * replaces the pending request. It never writes the approval preference.
 */
export function SourceComputerUseApprovalRequestCard({
  request,onReply,
}:SourceComputerUseApprovalRequestCardProps){
  const requestKey=sourceComputerUseRequestKey(request);
  const [phase,setPhase]=React.useState<"idle"|"submitting"|"error"|"submitted">("idle");
  const [error,setError]=React.useState<string|null>(null);
  const submitting=React.useRef(false);
  const generation=React.useRef(0);

  React.useEffect(()=>{
    generation.current++;
    submitting.current=false;
    setPhase("idle");
    setError(null);
    return ()=>{generation.current++;};
  },[requestKey]);

  const disabled=request.disabled===true||onReply==null||
    phase==="submitting"||phase==="submitted";
  const canAlwaysAllow=request.persistModes.includes("always");
  const highRisk=request.riskLevel==="high";
  const subtitle=sourceComputerUseSubtitle(request);
  async function respond(decision:"accept"|"decline",scope:"primary"|"always"="primary"){
    const reply=sourceComputerUseDecision(request,decision,scope);
    if(reply==null||onReply==null||submitting.current||phase==="submitted")return;
    submitting.current=true;
    setError(null);
    setPhase("submitting");
    const current=generation.current;
    try{
      await onReply(request.requestId,reply,{
        hostId:request.hostId,conversationId:request.conversationId,
      });
      if(generation.current!==current)return;
      // Response delivery is not an authorization confirmation.
      setPhase("submitted");
    }catch(failure){
      if(generation.current!==current)return;
      submitting.current=false;
      setPhase("error");
      const unavailable=failure instanceof Error&&
        failure.message.includes("MCP_BACKEND_UNAVAILABLE");
      setError(unavailable
        ?"Unable to send Computer Use response: backend unavailable. No permission was changed."
        :"Unable to send Computer Use response. Retry or contact the host.");
    }
  }

  const header=highRisk
    ?<span className="codex-source-mcp-approval__risk"
      data-source-computer-use-header="high">
      <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16"
        fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.3 3.5a2 2 0 0 1 3.4 0l8 14A2 2 0 0 1 20 20.5H4a2 2 0 0 1-1.7-3z"/>
        <path d="M12 9v4.2M12 16.6h.01"/>
      </svg>
      Elevated Risk
    </span>
    // Original E uses a packaged computer-use-plugin-icon asset that
    // is absent from this supplied resources ZIP. Do not fabricate it.
    :<span className="codex-source-computer-use__connector"
      data-source-computer-use-header="app">
      <span className="codex-source-computer-use__icon-fallback" aria-hidden="true">CU</span>
      {request.connectorName}
    </span>;
  const status=<>
    {error?<p role="alert" className="codex-source-mcp-approval__error">{error}</p>:null}
    {phase==="submitting"
      ?<p role="status">Submitting Computer Use response to host…</p>:null}
    {phase==="submitted"
      ?<p role="status">Response sent to host; awaiting request settlement.</p>:null}
    {onReply==null
      ?<p className="codex-source-mcp-approval__readonly">
        No Computer Use reply transport is connected. This request is read-only.
      </p>:null}
  </>;
  const actions=<>
    {canAlwaysAllow
      ?<button type="button"
        className="codex-source-mcp-approval__action codex-source-mcp-approval__action--leading"
        disabled={disabled} onClick={()=>{void respond("accept","always");}}>
        Always allow
      </button>:null}
    <div className="codex-source-mcp-approval__trailing">
      <button type="button" className="codex-source-mcp-approval__action"
        disabled={disabled} onClick={()=>{void respond("decline");}}>Deny</button>
      <button type="submit" disabled={disabled}
        className="codex-source-mcp-approval__action codex-source-mcp-approval__action--primary">
        Allow this conversation
      </button>
    </div>
  </>;
  return <SourceApprovalCardSurface kind="computer-use"
    requestId={requestKey} phase={phase} headerContent={header}
    title={sourceComputerUseTitle(request)}
    subtitle={subtitle
      ?<span className="codex-source-computer-use__disclosure"
        data-source-computer-use-first-disclosure={!request.hasPreviouslyApproved?"true":"false"}>{subtitle}</span>
      :undefined}
    status={status} actions={actions}
    onSubmit={event=>{event.preventDefault();void respond("accept");}}
  />;
}
