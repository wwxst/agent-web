import * as React from "react";
import {
  sourceToolSuggestionKey,sourceToolSuggestionPrimaryLabel,
  sourceToolSuggestionTitle,
  type SourceToolSuggestionRequest,type SourceToolSuggestionStart,
  type SourceToolSuggestionCheckReady,
  type SourceToolSuggestionReplyTransport,
} from "../conversation/SourceToolSuggestionRequestModel.js";
import {SourceCompactElicitationCard} from "./SourceCompactElicitationCard.js";

export interface SourceToolSuggestionRequestCardProps{
  request:SourceToolSuggestionRequest;
  onReply?:SourceToolSuggestionReplyTransport;
  /** Only real host install/enable services may provide BOTH actions. */
  onStartSetup?:SourceToolSuggestionStart;
  /** Must query the verified host after setup; no optimistic acceptance. */
  onCheckReady?:SourceToolSuggestionCheckReady;
}
/**
 * Source inline tool suggestion J shares original ct with URL action.
 * This does NOT implement Codex's private install/OAuth/app modal. When the
 * host has no verified setup+readiness capability, the primary is disabled;
 * "Not now" still sends a real, fail-closed host-scoped MCP decline reply.
 */
export function SourceToolSuggestionRequestCard({
  request,onReply,onStartSetup,onCheckReady,
}:SourceToolSuggestionRequestCardProps){
  const key=sourceToolSuggestionKey(request);
  const [setupStarted,setSetupStarted]=React.useState(false);
  const [busy,setBusy]=React.useState(false);
  const [phase,setPhase]=React.useState<
    "idle"|"starting"|"checking"|"submitting"|"error"|"submitted"
  >("idle");
  const [error,setError]=React.useState<string|null>(null);
  const submitting=React.useRef(false);
  const generation=React.useRef(0);
  React.useEffect(()=>{
    generation.current++;
    submitting.current=false;setSetupStarted(false);setBusy(false);
    setPhase("idle");setError(null);
    return ()=>{generation.current++;};
  },[key,request.toolId,request.targetType,request.suggestionAction]);

  const supported=onStartSetup!=null&&onCheckReady!=null&&onReply!=null;
  const disabled=busy||phase==="submitted";
  const origin={
    hostId:request.hostId,conversationId:request.conversationId,
  };
  async function reply(decision:"accept"|"decline"){
    if(submitting.current||onReply==null||phase==="submitted")return;
    submitting.current=true;setBusy(true);setPhase("submitting");setError(null);
    const version=generation.current;
    try{
      await onReply(request.requestId,{decision},origin);
      if(version===generation.current)setPhase("submitted");
    }catch(reason){
      if(version===generation.current){
        submitting.current=false;setBusy(false);setPhase("error");
        setError(reason instanceof Error&&reason.message.includes("MCP_BACKEND_UNAVAILABLE")
          ?"Unable to send tool suggestion response: backend unavailable. Nothing was installed or enabled."
          :"Unable to send tool suggestion response. No action was confirmed.");
      }
    }
  }
  async function primary(){
    if(disabled||!supported||submitting.current)return;
    submitting.current=true;setBusy(true);setError(null);
    const version=generation.current;
    try{
      if(!setupStarted){
        setPhase("starting");
        // Host callbacks must perform REAL authorization/setup, not UI mocks.
        const status=await onStartSetup(request);
        if(version!==generation.current)return;
        setSetupStarted(true);
        // Even a "ready" setup result must be verified again before accept.
        setPhase("idle");
        if(status!=="started"&&status!=="ready")throw Error("INVALID_HOST_SETUP_RESULT");
      }else{
        setPhase("checking");
        const ready=await onCheckReady(request);
        if(version!==generation.current)return;
        if(ready!==true){
          setPhase("error");
          setError(request.toolName+
            " is not ready yet. Finish setting it up, then continue.");
        }else{
          // Release reentrancy guard before explicit accept (still busy).
          submitting.current=false;
          await reply("accept");
          return;
        }
      }
    }catch{
      if(version===generation.current){
        setPhase("error");
        setError("Unable to complete tool setup in this host. No action was approved.");
      }
    }finally{
      if(version===generation.current){
        submitting.current=false;setBusy(false);
      }
    }
  }
  const status=<>
    {error?<div className="codex-source-compact-request__error"
      role="alert">{error}</div>:null}
    {phase==="starting"?<div className="codex-source-compact-request__status"
      role="status">Opening the verified tool setup flow…</div>:null}
    {phase==="checking"?<div className="codex-source-compact-request__status"
      role="status">Checking tool availability with host…</div>:null}
    {phase==="submitting"?<div className="codex-source-compact-request__status"
      role="status">Submitting response to host…</div>:null}
    {phase==="submitted"?<div className="codex-source-compact-request__status"
      role="status">Response sent to host; awaiting request settlement.</div>:null}
    {!supported?<div className="codex-source-compact-request__status">
      Tool installation and activation are unavailable in this host.
    </div>:null}
  </>;
  const icon=<svg viewBox="0 0 24 24" width="20" height="20" fill="none"
    stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"
    strokeLinejoin="round" aria-hidden="true">
    <path d="M8 3h8v4a2 2 0 0 0 4 0V3h1v7h-4a2 2 0 0 0 0 4h4v7h-7v-4a2 2 0 0 0-4 0v4H3v-7h4a2 2 0 0 0 0-4H3V3h5Z"/>
  </svg>;
  return <SourceCompactElicitationCard kind="tool-suggestion" icon={icon}
    label="Tool suggestion request" requestId={key} phase={phase}
    title={sourceToolSuggestionTitle(request,setupStarted)}
    description={request.description??null}
    status={status}
    primaryLabel={sourceToolSuggestionPrimaryLabel(request,setupStarted)}
    secondaryLabel="Not now"
    primaryDisabled={disabled||!supported}
    secondaryDisabled={disabled||onReply==null}
    onPrimary={()=>{void primary();}}
    onSecondary={()=>{void reply("decline");}}
  />;
}
