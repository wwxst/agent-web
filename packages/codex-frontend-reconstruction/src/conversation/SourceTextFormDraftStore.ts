/**
 * Request-panel ei uses the original host Ge draft store by the request
 * identity [hostId,conversationId,requestId], rather than storing answers
 * only inside lazily mounted virtualized React rows.
 *
 * This independent scoped cache follows that ownership boundary. It is
 * session-only, limited to 64 requests, cleared on authoritative settlement
 * and thread-clear, and never sent to Agent except on user submit.
 */
import {
 sourceTextFormKey,type SourceTextFormRequest,type SourceFormDraftValue,
} from "./SourceTextFormElicitationModel.js";
export interface SourceTextFormDraft {
 fieldIndex:number;
 values:Readonly<Record<string,SourceFormDraftValue>>;
}
export interface SourceTextFormDraftStore {
 get(request:SourceTextFormRequest):SourceTextFormDraft|null;
 save(request:SourceTextFormRequest,draft:SourceTextFormDraft):void;
 settle(request:Pick<SourceTextFormRequest,"hostId"|"conversationId"|"requestId">):void;
 clearThread(hostId:string,conversationId:string):void;
 dispose():void;
}
const MAX_DRAFT_COUNT=64;
export function createSourceTextFormDraftStore():SourceTextFormDraftStore {
 const drafts=new Map<string,{
  request:Pick<SourceTextFormRequest,"hostId"|"conversationId"|"requestId">;
  signature:string;draft:SourceTextFormDraft;
 }>();
 let disposed=false;
 function get(request:SourceTextFormRequest):SourceTextFormDraft|null {
  if(disposed)return null;
  const record=drafts.get(sourceTextFormKey(request));
  if(!record||record.signature!==JSON.stringify(request.fields))return null;
  return record.draft;
 }
 function save(request:SourceTextFormRequest,draft:SourceTextFormDraft){
  if(disposed)return;
  if(!Number.isInteger(draft.fieldIndex)||draft.fieldIndex<0||
    draft.fieldIndex>=request.fields.length)throw new TypeError("invalid field index");
  const allowed=new Map(request.fields.map(f=>[f.name,f]));
  const values=Object.create(null) as Record<string,SourceFormDraftValue>;
  let total=0;
  for(const [name,value] of Object.entries(draft.values)){
   const field=allowed.get(name);
   if(field==null)throw new TypeError("unknown form draft field");
   const valid=field.type==="array"
     ?Array.isArray(value)&&value.length<=12&&
       new Set(value).size===value.length&&
       value.every(item=>typeof item==="string"&&
         field.choices?.some(c=>c.value===item))
     :field.type==="boolean"
     ?typeof value==="boolean"
     :typeof value==="string"&&
       value.length<=(field.type==="string"?16384:128)&&
       !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value);
   if(!valid)throw new TypeError("invalid form draft field");
   total+=Array.isArray(value)?value.reduce((n,item)=>n+item.length,0)
     :typeof value==="string"?value.length:1;
   if(total>32768)throw new TypeError("text form draft too large");
   Object.defineProperty(values,name,{
     value:Array.isArray(value)?Object.freeze([...value]):value,enumerable:true,
   });
  }
  const key=sourceTextFormKey(request);
  drafts.delete(key);
  drafts.set(key,{
   request:{hostId:request.hostId,conversationId:request.conversationId,
     requestId:request.requestId},
   signature:JSON.stringify(request.fields),
   draft:{fieldIndex:draft.fieldIndex,values:Object.freeze(values)},
  });
  while(drafts.size>MAX_DRAFT_COUNT){
   const first=drafts.keys().next().value;
   if(first===undefined)break;
   drafts.delete(first);
  }
 }
 return {
  get,save,
  settle(request){
   if(disposed)return;
   drafts.delete(sourceTextFormKey(request));
  },
  clearThread(hostId,conversationId){
   if(disposed)return;
   for(const [key,value] of drafts){
    if(value.request.hostId===hostId&&value.request.conversationId===conversationId)
      drafts.delete(key);
   }
  },
  dispose(){disposed=true;drafts.clear();},
 };
}
