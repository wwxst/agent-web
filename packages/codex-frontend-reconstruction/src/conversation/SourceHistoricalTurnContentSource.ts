/**
 * Historical-turn content hydration at the original Y/rs boundary.
 *
 * Source local-conversation-thread-turn-entries-ed0916a7814f.js Y drops
 * the embedded turn for non-Aeon, non-preserved history-backed entries, and
 * keeps turnItemIds / turnStatus. The original private history entity query
 * runtime isn't shipped here. This adapter lets an independent frontend host
 * provide the same keyed history items without fabricating a second timeline.
 */
export interface SourceHistoricalTurnQuery {
  hostId:string;
  threadId:string;
  entityKey:string;
}
export interface SourceHistoricalTurnPayload<T extends {id?:string;type:string}> {
  items:readonly T[];
  status:string;
}
export interface SourceHistoricalTurnContentHost<T extends {id?:string;type:string}> {
  subscribeHistoryTurn(query:SourceHistoricalTurnQuery,
    listener:(payload:SourceHistoricalTurnPayload<T>|null|undefined)=>void):()=>void;
}
export interface SourceHistoricalTurnSnapshot<T extends {id?:string;type:string}> {
  revision:number;
  loaded:boolean;
  items:readonly T[];
  status:string|null;
  error:unknown|null;
}
export interface SourceHistoricalTurnSource<T extends {id?:string;type:string}> {
  getSnapshot():SourceHistoricalTurnSnapshot<T>;
  subscribe(listener:()=>void):()=>void;
}
export interface ConnectedSourceHistoricalTurnSource<T extends {id?:string;type:string}>
  extends SourceHistoricalTurnSource<T> {
  updateQuery(query:SourceHistoricalTurnQuery):void;
  dispose():void;
}
const keyOf=(query:SourceHistoricalTurnQuery)=>JSON.stringify([query.hostId,query.threadId,query.entityKey]);

export function createSourceHistoricalTurnContentSource<T extends {id?:string;type:string}>(
  initialQuery:SourceHistoricalTurnQuery,
  host:SourceHistoricalTurnContentHost<T>,
):ConnectedSourceHistoricalTurnSource<T>{
  let query=initialQuery,activeKey=keyOf(initialQuery),closed=false;
  let generation=0,revision=0,unsubscribe:(()=>void)|null=null;
  let items:readonly T[]=[],status:string|null=null,loaded=false,error:unknown|null=null;
  const listeners=new Set<()=>void>();
  let snapshot:SourceHistoricalTurnSnapshot<T>=Object.freeze({revision,loaded,items,status,error});
  function publish(){
    if(closed)return;
    revision++;
    snapshot=Object.freeze({revision,loaded,items,status,error});
    for(const listener of [...listeners])listener();
  }
  function stop(){
    const fn=unsubscribe;unsubscribe=null;
    if(fn!=null){try{fn();}catch{/* one host must not block disposal */}}
  }
  function connect(){
    const token=generation;
    try{
      const cancel=host.subscribeHistoryTurn(query,payload=>{
        if(closed||token!==generation)return;
        loaded=payload!==undefined;
        items=payload?.items==null?[]:Object.freeze([...payload.items]);
        status=payload?.status??null;
        error=null;publish();
      });
      if(typeof cancel!=="function")throw new TypeError("history turn subscription must return cleanup");
      if(closed||token!==generation)cancel();else unsubscribe=cancel;
    }catch(e){if(closed||token!==generation)return;error=e;loaded=false;publish();}
  }
  connect();
  return {
    getSnapshot:()=>snapshot,
    subscribe(listener){
      if(!closed)listeners.add(listener);
      return ()=>listeners.delete(listener);
    },
    updateQuery(next){
      if(closed)return;
      const key=keyOf(next);query=next;
      if(key===activeKey)return;
      generation++;stop();activeKey=key;
      items=[];status=null;error=null;loaded=false;publish();connect();
    },
    dispose(){if(closed)return;closed=true;generation++;stop();listeners.clear();},
  };
}

export interface SourceHistoricalTurnEntry {
  historyEntityKey?:string|null;
  hostId?:string|null;
  conversationId?:string|null;
  turn?:unknown;
  turnItemIds?:readonly string[];
  isAeonThread?:boolean;
  preserveServerUserMessages?:boolean;
  turnState?:unknown;
  transcriptBlock?:unknown;
}
/** Y removes the embedded turn only for this specific history-summary case. */
export function sourceHistoricalTurnQuery(entry:SourceHistoricalTurnEntry):SourceHistoricalTurnQuery|null{
  if(entry.historyEntityKey==null||entry.hostId==null||entry.conversationId==null||
     entry.turn!=null||entry.isAeonThread===true||
     entry.preserveServerUserMessages===true||
     entry.turnState!=null||entry.transcriptBlock!=null)return null;
  return {hostId:entry.hostId,threadId:entry.conversationId,entityKey:entry.historyEntityKey};
}
/** Filter by preserved Y turnItemIds: an unrelated cached entity is not
 * permitted to render as part of this virtualized turn. */
export function selectSourceHistoricalTurnItems<T extends {id?:string;type:string}>(
  snapshot:SourceHistoricalTurnSnapshot<T>,
  turnItemIds:readonly string[]|undefined,
):T[]{
  if(!snapshot.loaded)return [];
  if(turnItemIds===undefined)return [...snapshot.items];
  const allowed=new Set(turnItemIds);
  return snapshot.items.filter(item=>item.id!=null&&allowed.has(item.id));
}

export interface SourceHistoricalTurnStore<T extends {id?:string;type:string}> extends
  SourceHistoricalTurnContentHost<T>{
  publish(query:SourceHistoricalTurnQuery,payload:SourceHistoricalTurnPayload<T>|null|undefined):void;
  clearThread(hostId:string,threadId:string):void;
  dispose():void;
}
export function createSourceHistoricalTurnStore<T extends {id?:string;type:string}>():SourceHistoricalTurnStore<T>{
  type Entry={query:SourceHistoricalTurnQuery;hasValue:boolean;value:SourceHistoricalTurnPayload<T>|null|undefined;
    listeners:Set<(payload:SourceHistoricalTurnPayload<T>|null|undefined)=>void>};
  let closed=false;
  const entries=new Map<string,Entry>();
  function entryFor(query:SourceHistoricalTurnQuery):Entry{
    const key=keyOf(query);
    let entry=entries.get(key);
    if(entry==null){
      entry={query:{...query},hasValue:false,value:undefined,listeners:new Set()};
      entries.set(key,entry);
    }
    return entry;
  }
  return {
    subscribeHistoryTurn(query,listener){
      if(closed)return ()=>{};
      const entry=entryFor(query);
      entry.listeners.add(listener);
      if(entry.hasValue)listener(entry.value);
      return ()=>entry.listeners.delete(listener);
    },
    publish(query,value){
      if(closed)return;
      const entry=entryFor(query);
      if(entry.hasValue&&Object.is(entry.value,value))return;
      entry.hasValue=true;entry.value=value;
      for(const listener of [...entry.listeners])listener(value);
    },
    clearThread(hostId,threadId){
      if(closed)return;
      for(const entry of entries.values()){
        if(entry.query.hostId===hostId&&entry.query.threadId===threadId){
          entry.hasValue=false;entry.value=undefined;
          for(const listener of [...entry.listeners])listener(undefined);
        }
      }
    },
    dispose(){
      closed=true;
      for(const entry of entries.values())entry.listeners.clear();
      entries.clear();
    },
  };
}
