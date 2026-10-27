/**
 * Binds authenticated host pending-elicitation events to the EXISTING
 * LiveConversationSource that feeds the canonical virtualized transcript.
 * This is an independently authored host adapter, not original Codex IPC.
 *
 * Request identity is [hostId,threadId,requestId]; a settlement removes only
 * that row. No click on a local button can remove a request from this store.
 */
import type {LiveConversationSource} from "./LiveConversationSource.js";
import type {ConversationRenderEntry} from "./ConversationRenderEntriesModel.js";
import {
 sourcePendingElicitationKey,
 type SourcePendingElicitationRecord,
 type SourcePendingElicitationStore,
} from "./SourcePendingElicitationRequestStore.js";
type WritableSource=LiveConversationSource & {
 update(next:{entries:readonly ConversationRenderEntry[]|ConversationRenderEntry[]}):void;
};
export interface SourcePendingElicitationTimelineBind {
 readonly hostId:string;
 readonly threadId:string;
 source:WritableSource;
 store:SourcePendingElicitationStore;
 createEntry:(request:SourcePendingElicitationRecord,turnId:string)=>ConversationRenderEntry;
}
export function sourcePendingElicitationTurnId(
 request:Pick<SourcePendingElicitationRecord,"hostId"|"threadId"|"requestId">,
):string{
 return "host-elicitation:"+sourcePendingElicitationKey(request);
}
export function bindSourcePendingElicitationsToTimeline({
 hostId,threadId,source,store,createEntry,
}:SourcePendingElicitationTimelineBind):()=>void {
 let closed=false;
 const managed=new Map<string,{record:SourcePendingElicitationRecord;entry:ConversationRenderEntry}>();
 function sync(){
   if(closed)return;
   // NEVER turn an event from another thread/host into this conversation's
   // request card, even when requestId is identical.
   const active=store.getSnapshot().filter(
     request=>request.hostId===hostId&&request.threadId===threadId);
   const next=new Map<string,{record:SourcePendingElicitationRecord;entry:ConversationRenderEntry}>();
   for(const request of active){
     const id=sourcePendingElicitationTurnId(request);
     const old=managed.get(id);
     next.set(id,old?.record===request?old:{
       record:request,entry:createEntry(request,id),
     });
   }
   const prior=source.getSnapshot().entries;
   const threadPrefix="host-elicitation:"+
     JSON.stringify([hostId,threadId]).slice(0,-1)+",";
   // Rebinding after a thread switch must replace prior rows for this exact
   // host/thread rather than append duplicate request cards.
   const surviving=prior.filter(entry=>
     entry.turnId==null||!entry.turnId.startsWith(threadPrefix));
   const additions=[...next.values()].map(x=>x.entry);
   const sameManaged=next.size===managed.size&&[...next].every(
     ([id,current])=>managed.get(id)?.entry===current.entry);
   if(sameManaged&&additions.every((entry,index)=>
     prior[prior.length-additions.length+index]===entry))return;
   managed.clear();
   for(const [id,item] of next)managed.set(id,item);
   const updated=[...surviving,...additions];
   if(updated.length===prior.length&&updated.every((item,i)=>item===prior[i]))return;
   // Latest-turn identity changes ONLY for actual pending events. Preserve
   // other canonical rows, but keep exactly one latest entry for follow-to-end.
   const final=updated.map((entry,index)=>{
     const latest=index===updated.length-1;
     return entry.isLatestTurn===latest?entry:{...entry,isLatestTurn:latest};
   });
   source.update({entries:final});
 }
 const unsubscribe=store.subscribe(sync);
 sync(); // host may have published before React subscribed
 return ()=>{
   if(closed)return;
   closed=true;unsubscribe();
   // On thread-switch, leave the old source's actual entries unchanged so
   // reattaching it rehydrates from the still-authoritative registry.
 };
}
