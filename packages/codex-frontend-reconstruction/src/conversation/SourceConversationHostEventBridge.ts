/**
 * One independent-frontend host event ingress for the three *distinct*
 * source-recovered subscription families:
 *   Y  historical turn by {hostId,threadId,entityKey}
 *   Fc qn/Qr history status / up-next readiness
 *   LO Au/Vd tool entity / assistant-message presence by itemId
 *
 * This discriminated event protocol is OUR frontend host boundary. It is not
 * claimed to be the private Codex IPC protocol, and it makes no Agent calls.
 * Consumers retain the original separately-keyed query stores/React paths.
 */
import type {ConversationMessageItem} from "./ConversationMessageRenderPlan.js";
import {
  createSourcePendingElicitationRequestStore,
  validateSourcePendingElicitationKey,validateSourcePendingElicitationRecord,
  type SourcePendingElicitationKey,type SourcePendingElicitationRecord,
  type SourcePendingElicitationStore,
} from "./SourcePendingElicitationRequestStore.js";
import {
 createSourceHistoricalTurnStore,
 type SourceHistoricalTurnPayload,
 type SourceHistoricalTurnQuery,
 type SourceHistoricalTurnStore,
} from "./SourceHistoricalTurnContentSource.js";
import {
 createSourceTurnRuntimeStatusStore,
 type SourceTurnHistoryStatusQuery,
 type SourceTurnUpNextQuery,
 type SourceTurnRuntimeStatusStore,
} from "./SourceTurnRuntimeStatusSource.js";
import {
 createToolActivityHistoryEntityStore,
 type ToolActivityHistoryEntityStore,
} from "./ToolActivityHistoryEntityStore.js";
import type {
 ToolActivityHistoryEntity,
 ToolActivityHistoryEntityQuery,
} from "./ToolActivityHistoryHydrationModel.js";

export type SourceConversationHostEvent =
  | {type:"historical-turn";query:SourceHistoricalTurnQuery;
      payload:SourceHistoricalTurnPayload<ConversationMessageItem>|null|undefined}
  | {type:"turn-history-status";query:SourceTurnHistoryStatusQuery;
      status:string|null|undefined}
  | {type:"up-next-ready";query:SourceTurnUpNextQuery;
      ready:boolean|null|undefined}
  | {type:"tool-history-entity";query:ToolActivityHistoryEntityQuery;
      entity:ToolActivityHistoryEntity|null|undefined}
  | {type:"assistant-message-presence";query:ToolActivityHistoryEntityQuery;
      presence:unknown}
  | {type:"pending-elicitation";request:SourcePendingElicitationRecord}
  | {type:"elicitation-settled";query:SourcePendingElicitationKey}
  | {type:"clear-thread";hostId:string;threadId:string};

export interface SourceConversationHostEventTransport {
 /** A real Electron or Agent host may implement this protocol after its
  * event schema has been confirmed. The demo is a synthetic in-memory feeder. */
 subscribe(listener:(event:SourceConversationHostEvent)=>void):()=>void;
}

export interface SourceConversationHostEventBridge {
 readonly historicalTurns:SourceHistoricalTurnStore<ConversationMessageItem>;
 readonly turnRuntime:SourceTurnRuntimeStatusStore;
 readonly toolHistory:ToolActivityHistoryEntityStore;
 readonly pendingElicitations:SourcePendingElicitationStore;
 publish(event:SourceConversationHostEvent):void;
 /** Replacing an upstream transport invalidates late callbacks from it. */
 connect(transport:SourceConversationHostEventTransport):void;
 disconnect():void;
 dispose():void;
}

const validId=(id:unknown)=>typeof id==="string"&&id.length>0;
function validateEvent(event:SourceConversationHostEvent):void {
 if(event==null||typeof event!=="object"||typeof event.type!=="string")
   throw new TypeError("invalid host event");
 if(event.type==="pending-elicitation"){
   validateSourcePendingElicitationRecord(event.request);
   return;
 }
 if(event.type==="elicitation-settled"){
   validateSourcePendingElicitationKey(event.query);
   return;
 }
 if(event.type==="clear-thread"){
   if(!validId(event.hostId)||!validId(event.threadId))
     throw new TypeError("clear-thread requires hostId and threadId");
   return;
 }
 const query=event.query as Partial<ToolActivityHistoryEntityQuery>|undefined;
 if(query==null||!validId(query.hostId)||!validId(query.threadId))
   throw new TypeError("host event requires canonical hostId/threadId");
 if(event.type!=="up-next-ready"&&!validId(query.entityKey))
   throw new TypeError("host event requires canonical entityKey");
 if((event.type==="tool-history-entity"||
     event.type==="assistant-message-presence")&&!validId(query.itemId))
   throw new TypeError("tool history event requires canonical itemId");
}

export function createSourceConversationHostEventBridge():SourceConversationHostEventBridge{
 const historicalTurns=createSourceHistoricalTurnStore<ConversationMessageItem>();
 const turnRuntime=createSourceTurnRuntimeStatusStore();
 const toolHistory=createToolActivityHistoryEntityStore();
 const pendingElicitations=createSourcePendingElicitationRequestStore();
 let closed=false,epoch=0;
 let upstream:(()=>void)|null=null;

 function disconnect(){
   epoch++;
   const stop=upstream;upstream=null;
   if(stop!=null)stop();
 }
 function publish(event:SourceConversationHostEvent){
   if(closed)return;
   validateEvent(event);
   switch(event.type){
     case "historical-turn":
       historicalTurns.publish(event.query,event.payload);
       return;
     case "turn-history-status":
       turnRuntime.publishHistoryStatus(event.query,event.status);
       return;
     case "up-next-ready":
       turnRuntime.publishUpNextReady(event.query,event.ready);
       return;
     case "tool-history-entity":
       toolHistory.publishHistoryEntity(event.query,event.entity);
       return;
     case "assistant-message-presence":
       toolHistory.publishAssistantMessagePresence(event.query,event.presence);
       return;
     case "pending-elicitation":
       pendingElicitations.upsert(event.request);
       return;
     case "elicitation-settled":
       pendingElicitations.settle(event.query);
       return;
     case "clear-thread":
       pendingElicitations.clearThread(event.hostId,event.threadId);
       historicalTurns.clearThread(event.hostId,event.threadId);
       turnRuntime.clearThread(event.hostId,event.threadId);
       toolHistory.clearThread(event.hostId,event.threadId);
       return;
     default:{
       const exhaustive:never=event;
       throw new TypeError("unknown host event: "+String(exhaustive));
     }
   }
 }
 function connect(transport:SourceConversationHostEventTransport){
   if(closed)throw new Error("host event bridge has been disposed");
   disconnect();
   const token=epoch;
   let stop:()=>void;
   try{
     stop=transport.subscribe(event=>{
       if(closed||token!==epoch)return;
       publish(event);
     });
     if(typeof stop!=="function")
       throw new TypeError("host event transport must return an unsubscribe function");
   }catch(error){
     epoch++;
     throw error;
   }
   // A synchronous publisher may replace/dispose the upstream in subscribe().
   if(closed||token!==epoch)stop();
   else upstream=stop;
 }
 return {
   historicalTurns,turnRuntime,toolHistory,pendingElicitations,publish,connect,disconnect,
   dispose(){
     if(closed)return;
     closed=true;
     disconnect();
     historicalTurns.dispose();
     turnRuntime.dispose();
     toolHistory.dispose();
     pendingElicitations.dispose();
   },
 };
}
