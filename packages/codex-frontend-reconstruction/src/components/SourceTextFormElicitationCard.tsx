import * as React from "react";
import {
 sourceTextFormKey,sourceTextFormReply,sourceTextFormValidate,
 type SourceTextFormRequest,type SourceTextFormReplyTransport,
} from "../conversation/SourceTextFormElicitationModel.js";
import "./sourceTextFormElicitationCard.css";

export interface SourceTextFormElicitationCardProps{
 request:SourceTextFormRequest;
 onReply?:SourceTextFormReplyTransport;
}
/**
 * Extracted from original request-panel ei/Yr/Wr/ur/wn: one active question,
 * retained answers across navigation, Skip for now, Next and final Continue.
 * Only the source plain-string subset is projected. Host settlement owns
 * removal; local submit does not create a fake successful Agent response.
 */
export function SourceTextFormElicitationCard({
 request,onReply,
}:SourceTextFormElicitationCardProps){
 const key=sourceTextFormKey(request);
 const schemaKey=JSON.stringify(request.fields);
 const [values,setValues]=React.useState<Record<string,string>>({});
 const [fieldIndex,setFieldIndex]=React.useState(0);
 const [invalid,setInvalid]=React.useState<readonly string[]>([]);
 const [phase,setPhase]=React.useState<"idle"|"submitting"|"error"|"submitted">("idle");
 const [error,setError]=React.useState<string|null>(null);
 const pending=React.useRef(false);
 const generation=React.useRef(0);
 const active=request.fields[fieldIndex]??request.fields[0];
 const last=fieldIndex===request.fields.length-1;
 React.useEffect(()=>{
   generation.current++;pending.current=false;
   setValues({});setFieldIndex(0);setInvalid([]);
   setPhase("idle");setError(null);
   return ()=>{generation.current++;};
 },[key,schemaKey]);
 const busy=phase==="submitting"||phase==="submitted";
 const disabled=busy||onReply==null;
 const currentValue=values[active.name]??"";
 const hasError=invalid.includes(active.name);
 const validation=sourceTextFormValidate(request,values);
 async function send(action:"accept"|"decline"|"cancel",content:Record<string,string>|null=null){
   if(disabled||pending.current||onReply==null)return;
   pending.current=true;setPhase("submitting");setError(null);
   const version=generation.current;
   try{
     await onReply(sourceTextFormReply(request,action,content));
     if(version===generation.current)setPhase("submitted");
   }catch(failure){
     if(version!==generation.current)return;
     pending.current=false;setPhase("error");
     setError(failure instanceof Error&&failure.message.includes("TEXT_FORM_BACKEND_UNAVAILABLE")
       ?"Unable to send form response: backend unavailable. Answers remain pending."
       :"Unable to send form response. Answers were not accepted by the host.");
   }
 }
 function handleNext(){
   if(disabled)return;
   if(!last){
     const result=sourceTextFormValidate(request,{
       // Validate only active question for Next; previous required questions
       // are verified at final Continue, matching source ei/xe.
       ...Object.fromEntries(request.fields.filter(f=>f.name!==active.name)
         .map(f=>[f.name, f.required?"placeholder":""])),...values,
     });
     if(result.invalidFieldNames.includes(active.name)){
       setInvalid([active.name]);return;
     }
     setInvalid([]);setFieldIndex(i=>Math.min(i+1,request.fields.length-1));
     return;
   }
   if(validation.content==null){
     setInvalid(validation.invalidFieldNames);
     const next=request.fields.findIndex(f=>validation.invalidFieldNames.includes(f.name));
     if(next>=0)setFieldIndex(next);
     return;
   }
   setInvalid([]);void send("accept",validation.content);
 }
 function setCurrent(value:string){
   if(disabled)return;
   setValues(current=>({...current,[active.name]:value}));
   if(hasError)setInvalid(current=>current.filter(name=>name!==active.name));
 }
 return <section className="codex-source-text-form" data-source-text-form-request-id={key}
   data-source-text-form-phase={phase} aria-label="MCP form elicitation request"
   onKeyDown={event=>{
     if(event.nativeEvent.isComposing)return;
     if(event.key==="Escape"&&!disabled){
       event.preventDefault();event.stopPropagation();void send("cancel");return;
     }
     if(event.key==="Enter"&&(event.ctrlKey||event.metaKey)&&!event.repeat){
       event.preventDefault();event.stopPropagation();handleNext();
     }
   }}>
   <form noValidate className="codex-source-text-form__form"
     onSubmit={e=>{e.preventDefault();handleNext();}}>
     <header className="codex-source-text-form__header">
       <div className="codex-source-text-form__heading">
         {request.message}
       </div>
       <div className="codex-source-text-form__navigation">
         {request.fields.length>1?<>
           <button type="button" aria-label="Previous question"
             disabled={disabled||fieldIndex===0}
             onClick={()=>{setFieldIndex(i=>Math.max(0,i-1));setInvalid([]);}}>‹</button>
           <span role="status" className="codex-source-text-form__progress">
             {fieldIndex+1} of {request.fields.length}
           </span>
           <button type="button" aria-label="Next question"
             disabled={disabled||last}
             onClick={()=>{setFieldIndex(i=>Math.min(request.fields.length-1,i+1));setInvalid([]);}}>›</button>
         </>:null}
         <button type="button" aria-label="Cancel" title="Cancel"
           disabled={disabled} onClick={()=>{void send("cancel");}}>×</button>
       </div>
     </header>
     <div className="codex-source-text-form__content">
       <label htmlFor={"source-form-field-"+key}
         className="codex-source-text-form__field-title">
         {active.title}{active.required?<span aria-hidden="true"> *</span>:null}
       </label>
       {active.description?<div className="codex-source-text-form__description">
         {active.description}
       </div>:null}
       <textarea id={"source-form-field-"+key}
         aria-invalid={hasError} aria-label={active.title} name={active.name}
         data-source-text-form-field={active.name}
         maxLength={active.maxLength} value={currentValue}
         disabled={disabled} rows={3}
         onChange={e=>setCurrent(e.currentTarget.value)}/>
       {hasError?<p role="alert" className="codex-source-text-form__error">
         {active.required&&currentValue.length===0?"This question is required.":
          active.minLength!==undefined&&currentValue.length<active.minLength
            ?"Use at least "+active.minLength+" characters.":
          active.maxLength!==undefined&&currentValue.length>active.maxLength
            ?"Use at most "+active.maxLength+" characters.":"Invalid response."}
       </p>:null}
       {phase==="submitting"?<p role="status">Submitting form response to host…</p>:null}
       {phase==="submitted"?<p role="status">
         Response sent to host; awaiting request settlement.
       </p>:null}
       {error?<p role="alert" className="codex-source-text-form__error">{error}</p>:null}
       {onReply==null?<p className="codex-source-text-form__readonly">
         Form submission is unavailable in this host. Answers are not sent.
       </p>:null}
     </div>
     <footer className="codex-source-text-form__footer">
       {request.fields.length===1
         ?<button type="button" className="codex-source-text-form__secondary"
           onClick={()=>{void send("cancel");}} disabled={disabled}>Cancel</button>
         :!last?<button type="button" className="codex-source-text-form__secondary"
           disabled={busy} onClick={()=>{setInvalid([]);setFieldIndex(i=>
             Math.min(request.fields.length-1,i+1));}}>Skip for now</button>:null}
       <button type="submit" className="codex-source-text-form__primary"
         disabled={disabled}>{last?"Continue":"Next"}</button>
     </footer>
   </form>
 </section>;
}
