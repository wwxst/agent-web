import * as React from "react";
import {
 sourceUserVerificationCancel,sourceUserVerificationKey,
 type SourceUserVerificationRequest,type SourceUserVerificationCancelTransport,
} from "../conversation/SourceUserVerificationModel.js";
import "./sourceUserVerificationCard.css";

export interface SourceUserVerificationCardProps{
 request:SourceUserVerificationRequest;
 onCancel?:SourceUserVerificationCancelTransport;
 /** The original Ke private native biometric provider is NOT emulated.
  * Approval intentionally stays unavailable until a verified provider is
  * recovered and its challenge/accept lifecycle is implemented. */
}
export function SourceUserVerificationCard({
 request,onCancel,
}:SourceUserVerificationCardProps){
 const identity=sourceUserVerificationKey(request);
 const [phase,setPhase]=React.useState<"idle"|"submitting"|"error"|"submitted">("idle");
 const [error,setError]=React.useState<string|null>(null);
 const pending=React.useRef(false);
 const version=React.useRef(0);
 React.useEffect(()=>{
   version.current++;pending.current=false;setPhase("idle");setError(null);
   return ()=>{version.current++;};
 },[identity,request.title,request.description,request.serverName]);
 const busy=phase==="submitting"||phase==="submitted";
 async function cancel(){
   if(pending.current||busy||onCancel==null)return;
   pending.current=true;setPhase("submitting");setError(null);
   const attempt=version.current;
   try{
     await onCancel(sourceUserVerificationCancel(request));
     if(attempt===version.current)setPhase("submitted");
   }catch(failure){
     if(attempt!==version.current)return;
     pending.current=false;setPhase("error");
     const unavailable=failure instanceof Error&&
       failure.message.includes("USER_VERIFICATION_BACKEND_UNAVAILABLE");
     setError(unavailable
       ?"Unable to cancel verification: backend unavailable. The request is still pending."
       :"Unable to cancel verification. No response was confirmed.");
   }
 }
 return <section className="codex-source-user-verification"
   data-source-user-verification-request-id={identity}
   data-source-user-verification-phase={phase}
   data-codex-approval-surface="true"
   aria-label="Identity verification request"
   onKeyDown={event=>{
     if(event.key==="Escape"&&onCancel!=null&&!busy){
       event.preventDefault();event.stopPropagation();void cancel();
     }
   }}>
   <div className="codex-source-user-verification__body">
     <div className="codex-source-user-verification__heading">
       <div className="codex-source-user-verification__requested-by">
         Identity verification requested by {request.serverName}
       </div>
       <div className="codex-source-user-verification__title">{request.title}</div>
       {request.description?<div className="codex-source-user-verification__description">
         {request.description}
       </div>:null}
     </div>
     <p role="status" className="codex-source-user-verification__explanation">
       Review this request before approving it with Touch ID
     </p>
     <p className="codex-source-user-verification__unavailable">
       Device verification is unavailable in this host. No identity was verified.
     </p>
     {phase==="submitting"?<p role="status">Sending cancellation to host…</p>:null}
     {phase==="submitted"?<p role="status">
       Cancellation delivered to host; awaiting request settlement.
     </p>:null}
     {error?<p role="alert" className="codex-source-user-verification__error">
       {error}
     </p>:null}
     {onCancel==null?<p className="codex-source-user-verification__unavailable">
       Cancellation transport is unavailable in this host.
     </p>:null}
   </div>
   <form className="codex-source-user-verification__footer"
     onSubmit={event=>event.preventDefault()}>
     <button type="button" className="codex-source-user-verification__cancel"
       disabled={busy||onCancel==null} onClick={()=>{void cancel();}}>Cancel</button>
     <button type="submit" className="codex-source-user-verification__approve"
       disabled={true}>Approve with Touch ID</button>
   </form>
 </section>;
}
