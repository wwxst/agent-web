import * as React from "react";
import {
  sourceUrlActionReply,sourceUrlActionRequestKey,sourceUrlActionSafeHref,
  type SourceUrlActionRequest,type SourceUrlActionReplyTransport,
} from "../conversation/SourceUrlActionRequestModel.js";
import {SourceCompactElicitationCard} from "./SourceCompactElicitationCard.js";

export interface SourceUrlActionRequestCardProps {
  request:SourceUrlActionRequest;
  onReply?:SourceUrlActionReplyTransport;
  /** This is a real host result, never a fixture's simulated permission. */
  onOpenExternal?:(url:string)=>Promise<boolean>;
  /** Original dt offers this alternate branch when session host supplies it. */
  onOpenInThread?:()=>void;
}
/**
 * Source dt: first primary click opens the URL; only after a successful
 * host open does it change from Open link to Continue. Clicking Continue
 * dispatches accept. Not now dispatches decline. No external open or IPC
 * response is ever confused with a granted app permission.
 */
export function SourceUrlActionRequestCard({
  request,onReply,onOpenExternal,onOpenInThread,
}:SourceUrlActionRequestCardProps){
  const requestKey=sourceUrlActionRequestKey(request);
  const [opened,setOpened]=React.useState(false);
  const [busy,setBusy]=React.useState(false);
  const [phase,setPhase]=React.useState<"idle"|"opening"|"submitting"|"error"|"submitted">("idle");
  const [error,setError]=React.useState<string|null>(null);
  const pending=React.useRef(false);
  const generation=React.useRef(0);
  React.useEffect(()=>{
    generation.current++;pending.current=false;
    setOpened(false);setBusy(false);setPhase("idle");setError(null);
    return ()=>{generation.current++;};
  },[requestKey]);
  const href=sourceUrlActionSafeHref(request.url);
  const blocked=request.disabled===true||busy||phase==="submitted";
  async function send(decision:"accept"|"decline"){
    const reply=sourceUrlActionReply(decision,request.disabled);
    if(reply==null||onReply==null||pending.current||phase==="submitted")return;
    pending.current=true;setBusy(true);setPhase("submitting");setError(null);
    const version=generation.current;
    try{
      await onReply(request.requestId,reply,{
        hostId:request.hostId,conversationId:request.conversationId,
      });
      if(version!==generation.current)return;
      setPhase("submitted");
    }catch(failure){
      if(version!==generation.current)return;
      pending.current=false;setBusy(false);setPhase("error");
      const unavailable=failure instanceof Error&&failure.message.includes("MCP_BACKEND_UNAVAILABLE");
      setError(unavailable
        ?"Unable to send URL action response: backend unavailable. No action was confirmed."
        :"Unable to send URL action response. Retry or contact the host.");
    }
  }
  async function primary(){
    if(blocked)return;
    if(onOpenInThread!=null){onOpenInThread();return;}
    if(opened){void send("accept");return;}
    if(href==null||onOpenExternal==null)return;
    if(pending.current)return;
    pending.current=true;setBusy(true);setPhase("opening");setError(null);
    const version=generation.current;
    try{
      const openedByHost=await onOpenExternal(href);
      if(version!==generation.current)return;
      if(!openedByHost)throw new Error("OPEN_EXTERNAL_DENIED");
      setOpened(true);setPhase("idle");
    }catch{
      if(version!==generation.current)return;
      setPhase("error");
      setError("Unable to open this link using the desktop host. Nothing was approved.");
    }finally{
      if(version===generation.current){pending.current=false;setBusy(false);}
    }
  }
  const cannotOpen=href==null||onOpenExternal==null;
  const primaryDisabled=blocked||onOpenInThread==null&&(!opened&&cannotOpen||
    opened&&onReply==null);
  const status=<>
    {error?<div role="alert" className="codex-source-compact-request__error">{error}</div>:null}
    {phase==="submitting"?<div role="status" className="codex-source-compact-request__status">Submitting response to host…</div>:null}
    {phase==="opening"?<div role="status" className="codex-source-compact-request__status">Opening external link…</div>:null}
    {phase==="submitted"?<div role="status" className="codex-source-compact-request__status">Response sent to host; awaiting request settlement.</div>:null}
    {!opened&&onOpenInThread==null&&cannotOpen
      ?<div className="codex-source-compact-request__status">External link opening is unavailable in this host.</div>
      :null}
  </>;
  return <SourceCompactElicitationCard
    label="URL action request" requestId={requestKey} phase={phase}
    title="Action required" description={<>
      <div>{request.message}</div>
      <div className="codex-source-compact-request__url">
        <span className="codex-source-compact-request__url-label">URL</span>
        <span className="codex-source-compact-request__url-value">{request.url}</span>
      </div>
    </>}
    status={status}
    primaryLabel={opened?"Continue":"Open link"}
    secondaryLabel="Not now"
    primaryDisabled={primaryDisabled}
    secondaryDisabled={blocked||onReply==null}
    onPrimary={()=>{void primary();}}
    onSecondary={()=>{void send("decline");}}
  />;
}
