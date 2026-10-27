import * as React from "react";
import {
 sourceUnsupportedOpenAIFormKey,
 sourceUnsupportedOpenAIFormReply,
 type SourceUnsupportedOpenAIFormRequest,
 type SourceUnsupportedOpenAIFormReplyTransport,
} from "../conversation/SourceUnsupportedOpenAIFormModel.js";
import "./sourceUnsupportedOpenAIFormCard.css";

export interface SourceUnsupportedOpenAIFormCardProps{
 request:SourceUnsupportedOpenAIFormRequest;
 /** Host owns the actual source cancel/decline wire and settlement. */
 onReply?:SourceUnsupportedOpenAIFormReplyTransport;
}
/**
 * Source request-panel bn (ke): a SPECIFIC unsupported field fallback.
 * A missing source field renderer is not permission to invent a generic form.
 * Both actions stay mounted until the host actually settles the request.
 */
export function SourceUnsupportedOpenAIFormCard({
 request,onReply,
}:SourceUnsupportedOpenAIFormCardProps){
 const identity=sourceUnsupportedOpenAIFormKey(request);
 const [phase,setPhase]=React.useState<"idle"|"submitting"|"error"|"submitted">("idle");
 const [error,setError]=React.useState<string|null>(null);
 const pending=React.useRef(false);
 const generation=React.useRef(0);
 React.useEffect(()=>{
   generation.current++;
   pending.current=false;setPhase("idle");setError(null);
   return ()=>{generation.current++;};
 },[identity,request.serverName]);
 const disabled=onReply==null||phase==="submitting"||phase==="submitted";
 async function respond(action:"cancel"|"decline"){
   if(disabled||pending.current||onReply==null)return;
   pending.current=true;
   setPhase("submitting");setError(null);
   const attempt=generation.current;
   try{
     await onReply(sourceUnsupportedOpenAIFormReply(request,action));
     if(attempt===generation.current)setPhase("submitted");
   }catch(failure){
     if(attempt!==generation.current)return;
     pending.current=false;setPhase("error");
     setError(failure instanceof Error&&
       failure.message.includes("UNSUPPORTED_FORM_BACKEND_UNAVAILABLE")
       ?"Unable to respond: form backend unavailable. The request is still pending."
       :"Unable to respond to this form. No action was confirmed.");
   }
 }
 return <section className="codex-source-unsupported-form"
    data-source-unsupported-form-request-id={identity}
    data-source-unsupported-form-phase={phase}
    aria-label="Unsupported OpenAI form"
    onKeyDown={event=>{
      if(event.key==="Escape"&&!disabled){
        event.preventDefault();event.stopPropagation();void respond("cancel");
      }
    }}>
    <div className="codex-source-unsupported-form__content">
      <div className="codex-source-unsupported-form__title">
        This form isn’t supported in this version
      </div>
      <div className="codex-source-unsupported-form__description">
        {request.serverName} requested this form. You can skip it and keep going, or dismiss the request
      </div>
      {phase==="submitting"?<div role="status">Sending form response to host…</div>:null}
      {phase==="submitted"?<div role="status">
        Response sent to host; awaiting request settlement.
      </div>:null}
      {error?<div className="codex-source-unsupported-form__error" role="alert">
        {error}
      </div>:null}
      {onReply==null?<div className="codex-source-unsupported-form__readonly">
        No form response transport is connected. This request is read-only.
      </div>:null}
    </div>
    <div className="codex-source-unsupported-form__footer">
      <button type="button" className="codex-source-unsupported-form__dismiss"
        disabled={disabled} onClick={()=>{void respond("cancel");}}>Dismiss</button>
      <button type="button" className="codex-source-unsupported-form__skip"
        disabled={disabled} onClick={()=>{void respond("decline");}}>Skip</button>
    </div>
  </section>;
}
