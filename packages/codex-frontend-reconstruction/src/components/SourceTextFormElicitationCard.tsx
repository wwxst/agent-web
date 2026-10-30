import * as React from "react";
import {
 sourceTextFormKey,sourceTextFormReply,sourceTextFormValidate,sourceFormFieldAnswer,
 type SourceTextFormRequest,type SourceTextFormReplyTransport,
 type SourceFormDraftValue,type SourceFormAnswerContent,
} from "../conversation/SourceTextFormElicitationModel.js";
import type {SourceTextFormDraft} from "../conversation/SourceTextFormDraftStore.js";
import "./sourceTextFormElicitationCard.css";

export interface SourceTextFormElicitationCardProps{
 request:SourceTextFormRequest;
 onReply?:SourceTextFormReplyTransport;
 initialDraft?:SourceTextFormDraft|null;
 onDraftChange?:(draft:SourceTextFormDraft)=>void;
}
/**
 * Extracted from original request-panel ei/Yr/Wr/ur/wn: one active question,
 * retained answers across navigation, Skip for now, Next and final Continue.
 * Only the source plain-string subset is projected. Host settlement owns
 * removal; local submit does not create a fake successful Agent response.
 */
export function SourceTextFormElicitationCard({
 request,onReply,initialDraft,onDraftChange,
}:SourceTextFormElicitationCardProps){
 const key=sourceTextFormKey(request);
 const schemaKey=JSON.stringify(request.fields);
 const [values,setValues]=React.useState<Record<string,SourceFormDraftValue>>(
   ()=>({...initialDraft?.values}));
 const [fieldIndex,setFieldIndex]=React.useState(
   ()=>initialDraft?.fieldIndex??0);
 const [invalid,setInvalid]=React.useState<readonly string[]>([]);
 const [phase,setPhase]=React.useState<"idle"|"submitting"|"error"|"submitted">("idle");
 const [error,setError]=React.useState<string|null>(null);
 const pending=React.useRef(false);
 const generation=React.useRef(0);
 // The schema projector accepts 1–12 fields; the fallback is non-null.
 const active=request.fields[fieldIndex]??request.fields[0]!;
 const last=fieldIndex===request.fields.length-1;
 React.useEffect(()=>{
   generation.current++;pending.current=false;
   setValues({...initialDraft?.values});
   setFieldIndex(initialDraft?.fieldIndex??0);setInvalid([]);
   setPhase("idle");setError(null);
   return ()=>{generation.current++;};
 },[key,schemaKey]);
 const busy=phase==="submitting"||phase==="submitted";
 const disabled=busy;
 const replyDisabled=busy||onReply==null;
 const currentValue=values[active.name];
 const hasError=invalid.includes(active.name);
 const validation=sourceTextFormValidate(request,values);
 async function send(action:"accept"|"decline"|"cancel",content:SourceFormAnswerContent|null=null){
   if(replyDisabled||pending.current||onReply==null)return;
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
 function changeQuestion(next:number){
   const bounded=Math.max(0,Math.min(next,request.fields.length-1));
   setFieldIndex(bounded);
   onDraftChange?.({fieldIndex:bounded,values});
 }
 function handleNext(){
   if(disabled)return;
   if(!last){
     // Source ei validates the current question independently on Next.
     // Do not inject placeholder answers into other field types.
     const result=sourceFormFieldAnswer(active,values[active.name]);
     if(!result.valid){
       setInvalid([active.name]);return;
     }
     setInvalid([]);changeQuestion(fieldIndex+1);
     return;
   }
   if(validation.content==null){
     setInvalid(validation.invalidFieldNames);
     const next=request.fields.findIndex(f=>validation.invalidFieldNames.includes(f.name));
     if(next>=0)changeQuestion(next);
     return;
   }
   setInvalid([]);void send("accept",validation.content);
 }
 function setCurrent(value:SourceFormDraftValue){
   if(disabled)return;
   const next={...values,[active.name]:value};
   setValues(next);
   onDraftChange?.({fieldIndex,values:next});
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
             onClick={()=>{changeQuestion(fieldIndex-1);setInvalid([]);}}>‹</button>
           <span role="status" className="codex-source-text-form__progress">
             {fieldIndex+1} of {request.fields.length}
           </span>
           <button type="button" aria-label="Next question"
             disabled={disabled||last}
             onClick={()=>{changeQuestion(fieldIndex+1);setInvalid([]);}}>›</button>
         </>:null}
         <button type="button" aria-label="Cancel" title="Cancel"
           disabled={replyDisabled} onClick={()=>{void send("cancel");}}>×</button>
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
       {active.choices!=null
         ?<fieldset className="codex-source-text-form__choices"
           aria-label={active.title} data-mcp-form-choices="true"
           aria-invalid={hasError}>
           {active.choices.map(choice=>{
             const multiple=active.type==="array";
             const selected=multiple
               ?Array.isArray(currentValue)&&currentValue.includes(choice.value)
               :currentValue===choice.value;
             const chosen=Array.isArray(currentValue)?currentValue:[];
             return <label key={choice.value}
               className="codex-source-text-form__choice">
               <input type={multiple?"checkbox":"radio"}
                 name={active.name} value={choice.value}
                 aria-label={choice.title}
                 checked={selected} disabled={disabled||
                   multiple&&!selected&&active.maxItems!==undefined&&
                   chosen.length>=active.maxItems}
                 onChange={()=>{
                   if(multiple){
                     setCurrent(selected?chosen.filter(x=>x!==choice.value)
                       :[...chosen,choice.value]);
                   }else setCurrent(choice.value);
                 }}/>
               <span className="codex-source-text-form__choice-content">
                 <span className="codex-source-text-form__choice-title">
                   {choice.title}</span>
                 {choice.description?<span
                   className="codex-source-text-form__choice-description">
                   {choice.description}</span>:null}
               </span>
             </label>;
           })}
         </fieldset>
         :active.type==="boolean"
         ?<label className="codex-source-text-form__checkbox-row">
           <input type="checkbox" id={"source-form-field-"+key}
             name={active.name} aria-label={active.title}
             aria-invalid={hasError} disabled={disabled}
             data-source-text-form-field={active.name}
             checked={currentValue===true}
             onChange={e=>setCurrent(e.currentTarget.checked)}/>
           <span>{active.title}</span>
         </label>
         :active.type==="integer"||active.type==="number"
           ?<input type="number" id={"source-form-field-"+key}
             aria-invalid={hasError} aria-label={active.title}
             name={active.name} data-source-text-form-field={active.name}
             min={active.minimum} max={active.maximum}
             step={active.type==="integer"?1:"any"}
             value={typeof currentValue==="string"?currentValue:""}
             disabled={disabled}
             onChange={e=>setCurrent(e.currentTarget.value)}/>
           :<textarea id={"source-form-field-"+key}
             aria-invalid={hasError} aria-label={active.title}
             name={active.name} data-source-text-form-field={active.name}
             maxLength={active.maxLength}
             value={typeof currentValue==="string"?currentValue:""}
             disabled={disabled} rows={3}
             onChange={e=>setCurrent(e.currentTarget.value)}/>}
       {hasError?<p role="alert" className="codex-source-text-form__error">
         {active.required&&(currentValue===undefined||currentValue===""||
             Array.isArray(currentValue)&&currentValue.length===0)
           ?"This question is required.":
          active.type==="string"&&typeof currentValue==="string"&&
            active.minLength!==undefined&&currentValue.length<active.minLength
            ?"Use at least "+active.minLength+" characters.":
          active.type==="string"&&typeof currentValue==="string"&&
            active.maxLength!==undefined&&currentValue.length>active.maxLength
            ?"Use at most "+active.maxLength+" characters.":
          active.type==="array"?"Choose the required number of options.":
          active.choices!=null?"Choose a valid option.":
          active.type==="integer"?"Enter a whole number within the allowed range.":
          active.type==="number"?"Enter a number within the allowed range.":
          "Invalid response."}
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
           onClick={()=>{void send("cancel");}} disabled={replyDisabled}>Cancel</button>
         :!last?<button type="button" className="codex-source-text-form__secondary"
           disabled={busy} onClick={()=>{setInvalid([]);changeQuestion(fieldIndex+1);}}>Skip for now</button>:null}
       <button type="submit" className="codex-source-text-form__primary"
         disabled={disabled||(last&&onReply==null)}>{last?"Continue":"Next"}</button>
     </footer>
   </form>
 </section>;
}
