/**
 * Original Windows source: mcp-server-elicitation-request-panel-7318114289f7.js
 * _t selects the pending request by (hostId, conversationId, requestId), then
 * ft -> browser website / ge -> Computer Use / at -> other kinds.
 *
 * This independently designed host-event ingress is NOT original Codex IPC.
 * It preserves only live pending request identity and authoritative settle
 * events. React cards never mark the request settled on a local click.
 */
export interface SourcePendingElicitationKey {
  hostId:string;
  threadId:string;
  requestId:string;
}
export interface SourcePendingElicitationRecord extends SourcePendingElicitationKey {
  elicitation:Readonly<Record<string,unknown>>;
}
export interface SourcePendingElicitationStore {
  getSnapshot():readonly SourcePendingElicitationRecord[];
  get(key:SourcePendingElicitationKey):SourcePendingElicitationRecord|null;
  subscribe(listener:()=>void):()=>void;
  upsert(record:SourcePendingElicitationRecord):void;
  settle(key:SourcePendingElicitationKey):void;
  clearThread(hostId:string,threadId:string):void;
  dispose():void;
}
const MAX_ID_LENGTH=256;
const KNOWN_KINDS=new Set([
 "urlAction","generic","mcpToolCall","userVerification","browserAuth",
 "formElicitation","openaiForm","legacyOpenAIForm","unsupportedOpenAIForm",
 "toolSuggestion","connectorAuth",
]);
export function sourcePendingElicitationKey(key:SourcePendingElicitationKey):string{
 return JSON.stringify([key.hostId,key.threadId,key.requestId]);
}
export function validateSourcePendingElicitationKey(value:SourcePendingElicitationKey):void{
 if(value==null||typeof value!=="object"||
    ![value.hostId,value.threadId,value.requestId].every(id=>
      typeof id==="string"&&id.trim()===id&&id.length>0&&
      id.length<=MAX_ID_LENGTH&&!/[\u0000-\u001f\u007f]/u.test(id)))
   throw new TypeError("pending elicitation requires bounded hostId/threadId/requestId");
}
export function validateSourcePendingElicitationRecord(
  record:SourcePendingElicitationRecord,
):void{
 validateSourcePendingElicitationKey(record);
 const value=record.elicitation;
 if(value==null||typeof value!=="object"||Array.isArray(value)||
   typeof value.kind!=="string"||!KNOWN_KINDS.has(value.kind))
   throw new TypeError("pending elicitation requires source-recognized discriminant");
 // Prevent renderer overload or unbounded pending payloads, without attempting
 // to reinterpret private Codex form/auth schemas here.
 try{
   const serialized=JSON.stringify(value);
   if(typeof serialized!=="string"||serialized.length>32768)
     throw new TypeError("pending elicitation exceeds host event limit");
 }catch{
   throw new TypeError("pending elicitation is not bounded serializable data");
 }
}
export function createSourcePendingElicitationRequestStore():SourcePendingElicitationStore{
 const records=new Map<string,SourcePendingElicitationRecord>();
 const listeners=new Set<()=>void>();
 let snapshot:readonly SourcePendingElicitationRecord[]=Object.freeze([]);
 let closed=false;
 const emit=()=>{
   snapshot=Object.freeze([...records.values()]);
   for(const callback of [...listeners])callback();
 };
 return {
   getSnapshot:()=>snapshot,
   get:key=>{
     validateSourcePendingElicitationKey(key);
     return records.get(sourcePendingElicitationKey(key))??null;
   },
   subscribe(listener){
     if(!closed)listeners.add(listener);
     return ()=>listeners.delete(listener);
   },
   upsert(record){
     if(closed)return;
     validateSourcePendingElicitationRecord(record);
     const key=sourcePendingElicitationKey(record);
     // Fresh object forces view update for the SAME request identity, but
     // never implicitly changes grants or acknowledges a response.
     records.set(key,Object.freeze({...record,elicitation:Object.freeze({...record.elicitation})}));
     emit();
   },
   settle(key){
     if(closed)return;
     validateSourcePendingElicitationKey(key);
     if(records.delete(sourcePendingElicitationKey(key)))emit();
   },
   clearThread(hostId,threadId){
     if(closed)return;
     let changed=false;
     for(const [key,record] of records){
       if(record.hostId===hostId&&record.threadId===threadId){
         records.delete(key);changed=true;
       }
     }
     if(changed)emit();
   },
   dispose(){
     if(closed)return;
     closed=true;records.clear();listeners.clear();
     snapshot=Object.freeze([]);
   },
 };
}
