import {
  deriveSourceLatestActivityRetention,
  type SourceLatestActivityRetentionInput,
} from "./SourceLatestActivityRetentionGate.js";

/**
 * Turn-scoped observable boundary for source Fc.
 *
 * Original local-conversation-turn:
 * We = historyEntityKey != null && turn.status === "in_progress"
 *   ? {hostId,threadId,entityKey} : null;
 * Ge = G(qn,We); K = Ge == null ? turn.status === "in_progress"
 *   : Ge === "inProgress";
 * Bi = isMostRecentTurn && upNextStatusItem != null && !interruptedByThisClient;
 * Vi = Bi ? {hostId,threadId} : null; Ui = G(Qr,Vi).
 * Gi = K && !ai && !(Bi && !Ui).
 *
 * Neither original qn/Qr query engine nor an Agent transport is embedded.
 * The host must bind the two subscriptions to its own event/query source.
 */
export interface SourceTurnHistoryStatusQuery {
  hostId:string;
  threadId:string;
  entityKey:string;
}
export interface SourceTurnUpNextQuery {
  hostId:string;
  threadId:string;
}
export interface SourceTurnRuntimeStatusHost {
  subscribeHistoryStatus(query:SourceTurnHistoryStatusQuery,
    listener:(status:string|null|undefined)=>void):()=>void;
  subscribeUpNextReady(query:SourceTurnUpNextQuery,
    listener:(ready:boolean|null|undefined)=>void):()=>void;
}

export interface SourceTurnRuntimeStatusInput extends Omit<
  SourceLatestActivityRetentionInput,"isTurnInProgress"|"hasResolvedUpNextState"
> {
  hostId:string;
  threadId:string;
  historyEntityKey?:string|null;
  turnStatus:string;
}
export interface SourceTurnRuntimeStatusSnapshot {
  revision:number;
  isTurnInProgress:boolean;
  /** True if the source query supplied an explicit, non-null status. */
  historyStatusResolved:boolean;
  upNextQueryEnabled:boolean;
  upNextReady:boolean;
  latestActivityRetentionInput:SourceLatestActivityRetentionInput;
  allowLatestCompletedGroup:boolean;
  error:unknown|null;
}
export interface SourceTurnRuntimeStatusSource {
  getSnapshot():SourceTurnRuntimeStatusSnapshot;
  subscribe(listener:()=>void):()=>void;
}
export interface ConnectedSourceTurnRuntimeStatusSource extends SourceTurnRuntimeStatusSource {
  updateInput(input:SourceTurnRuntimeStatusInput):void;
  dispose():void;
}

export function sourceTurnHistoryQuery(input:SourceTurnRuntimeStatusInput):
    SourceTurnHistoryStatusQuery|null {
  return input.turnStatus==="in_progress" && input.historyEntityKey != null
    ? {hostId:input.hostId,threadId:input.threadId,entityKey:input.historyEntityKey}
    : null;
}
export function sourceTurnUpNextQuery(input:SourceTurnRuntimeStatusInput):
    SourceTurnUpNextQuery|null {
  return input.isMostRecentTurn && input.hasUpNextStatusItem && !input.interruptedByThisClient
    ? {hostId:input.hostId,threadId:input.threadId} : null;
}
function queryKey(query:SourceTurnHistoryStatusQuery|SourceTurnUpNextQuery|null):string {
  return query==null?"":JSON.stringify(Object.values(query));
}
/** Stable immutable snapshots, cancellation tokens and synchronous-subscription safety. */
export function createSourceTurnRuntimeStatusSource(
  initial:SourceTurnRuntimeStatusInput,
  host:SourceTurnRuntimeStatusHost,
):ConnectedSourceTurnRuntimeStatusSource {
  let input=initial,closed=false,generation=0,revision=0;
  let historyKey=queryKey(sourceTurnHistoryQuery(input));
  let upNextKey=queryKey(sourceTurnUpNextQuery(input));
  let historyStatus:string|null|undefined;
  let upNextReady:boolean|null|undefined;
  let error:unknown|null=null;
  const listeners=new Set<()=>void>();
  let stops:(()=>void)[]=[];

  function makeSnapshot():SourceTurnRuntimeStatusSnapshot {
    const isTurnInProgress=historyStatus==null
      ?input.turnStatus==="in_progress":historyStatus==="inProgress";
    const upNextQueryEnabled=sourceTurnUpNextQuery(input)!=null;
    const latestActivityRetentionInput:SourceLatestActivityRetentionInput={
      isTurnInProgress,
      isTerminalOrSummaryTurn:input.isTerminalOrSummaryTurn,
      ...(input.assistantItem === undefined ? {} : {assistantItem:input.assistantItem}),
      hasInlineSubagentActivity:input.hasInlineSubagentActivity,
      isMostRecentTurn:input.isMostRecentTurn,
      hasUpNextStatusItem:input.hasUpNextStatusItem,
      interruptedByThisClient:input.interruptedByThisClient,
      hasResolvedUpNextState:upNextQueryEnabled ? upNextReady===true : false,
    };
    return Object.freeze({
      revision,
      isTurnInProgress,
      historyStatusResolved:historyStatus!=null,
      upNextQueryEnabled,
      upNextReady:upNextQueryEnabled && upNextReady===true,
      latestActivityRetentionInput:Object.freeze(latestActivityRetentionInput),
      allowLatestCompletedGroup:deriveSourceLatestActivityRetention(latestActivityRetentionInput),
      error,
    });
  }
  let snapshot=makeSnapshot();
  function publish(){
    if(closed)return;
    revision++;
    snapshot=makeSnapshot();
    for(const listener of [...listeners])listener();
  }
  function detach(){
    const list=stops;
    stops=[];
    for(const stop of list.reverse()){
      try{stop();}catch{ /* preserve other host cleanup */ }
    }
  }
  function listen(unsubscribe:()=>void,token:number):void{
    if(typeof unsubscribe!=="function")
      throw new TypeError("turn runtime subscription must return a cleanup callback");
    if(closed || token!==generation){unsubscribe();return;}
    stops.push(unsubscribe);
  }
  function connect(){
    const token=generation;
    try{
      const historyQuery=sourceTurnHistoryQuery(input);
      if(historyQuery!=null){
        const stop=host.subscribeHistoryStatus(historyQuery,status=>{
          if(closed||token!==generation)return;
          if(Object.is(historyStatus,status))return;
          historyStatus=status;
          publish();
        });
        listen(stop,token);
        if(closed||token!==generation)return;
      }
      const upNextQuery=sourceTurnUpNextQuery(input);
      if(upNextQuery!=null){
        const stop=host.subscribeUpNextReady(upNextQuery,value=>{
          if(closed||token!==generation)return;
          if(Object.is(upNextReady,value))return;
          upNextReady=value;
          publish();
        });
        listen(stop,token);
      }
    }catch(e){
      if(token!==generation || closed)return;
      detach();
      error=e;
      publish();
    }
  }
  connect();
  return {
    getSnapshot:()=>snapshot,
    subscribe(listener){
      if(!closed)listeners.add(listener);
      return ()=>listeners.delete(listener);
    },
    updateInput(next){
      if(closed)return;
      const h=queryKey(sourceTurnHistoryQuery(next));
      const u=queryKey(sourceTurnUpNextQuery(next));
      if(input===next)return;
      const rebindHistory=h!==historyKey,rebindUpNext=u!==upNextKey;
      input=next;
      if(rebindHistory||rebindUpNext){
        generation++;
        detach();
        historyKey=h;
        upNextKey=u;
        if(rebindHistory)historyStatus=undefined;
        if(rebindUpNext)upNextReady=undefined;
        error=null;
        publish();
        connect();
      }else publish();
    },
    dispose(){
      if(closed)return;
      closed=true;
      generation++;
      detach();
      listeners.clear();
    },
  };
}

/**
 * Small host-side event cache to connect an independent frontend event feed
 * to qn/Qr without a private Codex database. Reuses identity-based queries,
 * replays current values and supports unsubscribe/disposal. This is an
 * integration boundary, not a simulation of an Agent backend.
 */
export interface SourceTurnRuntimeStatusStore extends SourceTurnRuntimeStatusHost {
  publishHistoryStatus(query:SourceTurnHistoryStatusQuery,status:string|null|undefined):void;
  publishUpNextReady(query:SourceTurnUpNextQuery,ready:boolean|null|undefined):void;
  /** Reset both cached channels for a host/thread without touching other conversations. */
  clearThread(hostId:string,threadId:string):void;
  dispose():void;
}
export function createSourceTurnRuntimeStatusStore():SourceTurnRuntimeStatusStore {
  type Entry<T>={query:{hostId:string;threadId:string};value:T|undefined;published:boolean;listeners:Set<(value:T|undefined)=>void>};
  const histories=new Map<string,Entry<string|null>>();
  const upNext=new Map<string,Entry<boolean|null>>();
  let closed=false;
  function subscribe<T>(map:Map<string,Entry<T>>,query:{hostId:string;threadId:string},cb:(value:T|undefined)=>void){
    if(closed)return ()=>{};
    const key=JSON.stringify(Object.values(query));
    let entry=map.get(key);
    if(entry==null){
      entry={query:{hostId:query.hostId,threadId:query.threadId},value:undefined,published:false,listeners:new Set()};
      map.set(key,entry);
    }
    entry.listeners.add(cb);
    if(entry.published)cb(entry.value);
    return ()=>entry?.listeners.delete(cb);
  }
  function put<T>(map:Map<string,Entry<T>>,query:{hostId:string;threadId:string},value:T|undefined){
    if(closed)return;
    const key=JSON.stringify(Object.values(query));
    let entry=map.get(key);
    if(entry==null){entry={query:{hostId:query.hostId,threadId:query.threadId},value:undefined,published:false,listeners:new Set()};map.set(key,entry);}
    if(entry.published&&Object.is(entry.value,value))return;
    entry.value=value;entry.published=true;
    for(const listener of [...entry.listeners])listener(value);
  }
  return {
    subscribeHistoryStatus:(q,cb)=>subscribe(histories,q,cb),
    subscribeUpNextReady:(q,cb)=>subscribe(upNext,q,cb),
    publishHistoryStatus:(q,v)=>put(histories,q,v),
    publishUpNextReady:(q,v)=>put(upNext,q,v),
    clearThread(hostId,threadId){
      if(closed)return;
      // No global clearing: other tabs/threads share this frontend host.
      for(const map of [histories,upNext]){
        for(const entry of map.values()){
          if(entry.query.hostId!==hostId||entry.query.threadId!==threadId)continue;
          if(!entry.published)continue;
          entry.published=false;entry.value=undefined;
          for(const listener of [...entry.listeners])listener(undefined);
        }
      }
    },
    dispose(){closed=true;histories.clear();upNext.clear();},
  };
}
