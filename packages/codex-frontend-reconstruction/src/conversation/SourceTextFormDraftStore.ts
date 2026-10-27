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
 sourceTextFormKey,type SourceTextFormRequest,
} from "./SourceTextFormElicitationModel.js";
export interface SourceTextFormDraft {
 fieldIndex:number;
 values:Readonly<Record<string,string>>;
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
  const values=Object.create(null) as Record<string,string>;
  let total=0;
  for(const [name,value] of Object.entries(draft.values)){
   if(!allowed.has(name)||typeof value!=="string"||value.length>16384||
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value))
     throw new TypeError("invalid text form draft field");
   total+=value.length;
   if(total>32768)throw new TypeError("text form draft too large");
   Object.defineProperty(values,name,{value,enumerable:true});
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
