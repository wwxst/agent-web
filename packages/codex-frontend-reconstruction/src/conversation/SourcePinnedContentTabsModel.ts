/**
 * Source: original app-initial-5851df3f6cb1.js.
 *
 * The original pinned-content registry is deliberately separate from the
 * source tab controller:
 * - pinned-content-tabs-v1 stores a reference to the exact owner/tab identity;
 * - pinned-content-tab-presentation-v1 stores the latest live title/kind/chrome
 *   snapshot and availability;
 * - unified-sidebar-pinned-order-v1 stores the shared sidebar ordering key.
 *
 * This model preserves that distinction for the independent local workspace
 * preview. It does not claim the original cross-window contentTabs RPC or
 * durable-route preload bridge.
 */

export const SOURCE_PINNED_CONTENT_TABS_STORAGE_KEY="pinned-content-tabs-v1";
export const SOURCE_PINNED_CONTENT_TAB_PRESENTATION_STORAGE_KEY=
  "pinned-content-tab-presentation-v1";
export const SOURCE_UNIFIED_SIDEBAR_PINNED_ORDER_STORAGE_KEY=
  "unified-sidebar-pinned-order-v1";

export interface SourcePinnedContentTabRecord{
  id:string;
  accountId:string|null;
  hostId:string;
  threadId:string;
  clientThreadId:string;
  tabId:string;
  tabKind:string;
  title:string;
  routePath:string;
  routeSearch:string;
  order:number;
}
export interface SourcePinnedContentTabPresentation{
  sourceToken:string;
  title:string;
  kind:string;
  chrome:unknown|null;
  available:boolean;
}
export interface SourcePinnedContentTabsState{
  pins:readonly SourcePinnedContentTabRecord[];
  presentationById:Readonly<Record<string,SourcePinnedContentTabPresentation>>;
  /** Original unified sidebar order keys, e.g. content-tab:<pin-id>. */
  sidebarOrder:readonly string[];
}
export interface SourcePinContentTabInput{
  accountId:string|null;
  hostId:string;
  threadId:string;
  clientThreadId:string;
  tabId:string;
  tabKind:string;
  title:string;
  routePath:string;
  routeSearch:string;
  sourceToken:string;
}
export interface SourcePinContentTabResult{
  state:SourcePinnedContentTabsState;
  pin:SourcePinnedContentTabRecord;
  created:boolean;
}
export interface SourcePinnedContentTabDisplayRow{
  pin:SourcePinnedContentTabRecord;
  presentation:SourcePinnedContentTabPresentation|null;
  title:string;
  unavailable:boolean;
  isActive:boolean;
}

type UnknownRecord=Record<string,unknown>;
function isRecord(value:unknown):value is UnknownRecord{
  return value!==null&&typeof value==="object"&&!Array.isArray(value);
}
function nonEmptyString(value:unknown):value is string{
  return typeof value==="string"&&value.length>0;
}
function parseJson(value:string|null|undefined):unknown{
  if(value==null||value==="")return null;
  try{return JSON.parse(value) as unknown;}catch{return null;}
}
function parsePin(id:string,value:unknown):SourcePinnedContentTabRecord|null{
  if(!isRecord(value)||value.id!==id)return null;
  const accountId=value.accountId;
  if(accountId!==null&&typeof accountId!=="string")return null;
  if(!nonEmptyString(value.hostId)||!nonEmptyString(value.threadId)||
    !nonEmptyString(value.clientThreadId)||!nonEmptyString(value.tabId)||
    !nonEmptyString(value.tabKind)||typeof value.title!=="string"||
    typeof value.routePath!=="string"||typeof value.routeSearch!=="string"||
    typeof value.order!=="number"||!Number.isFinite(value.order)||value.order<0)
    return null;
  return {
    id,accountId,hostId:value.hostId,threadId:value.threadId,
    clientThreadId:value.clientThreadId,tabId:value.tabId,
    tabKind:value.tabKind,title:value.title,routePath:value.routePath,
    routeSearch:value.routeSearch,order:value.order,
  };
}
function parsePresentation(
  value:unknown,
):SourcePinnedContentTabPresentation|null{
  if(!isRecord(value)||!nonEmptyString(value.sourceToken)||
    typeof value.title!=="string"||!nonEmptyString(value.kind)||
    typeof value.available!=="boolean")return null;
  return {
    sourceToken:value.sourceToken,title:value.title,kind:value.kind,
    chrome:value.chrome??null,available:value.available,
  };
}
function samePresentation(
  left:SourcePinnedContentTabPresentation|undefined,
  right:SourcePinnedContentTabPresentation,
):boolean{
  return left!=null&&left.sourceToken===right.sourceToken&&
    left.title===right.title&&left.kind===right.kind&&
    left.available===right.available&&left.chrome===right.chrome;
}

/** Original mqi identity: account, host, client-thread and exact tab ID. */
export function sourcePinnedContentTabId(
  accountId:string|null,hostId:string,clientThreadId:string,tabId:string,
):string{
  return JSON.stringify([accountId,hostId,clientThreadId,tabId]);
}
export function sourcePinnedContentTabOrderKey(pinId:string):string{
  return `content-tab:${pinId}`;
}
export function sourceEmptyPinnedContentTabsState():SourcePinnedContentTabsState{
  return {pins:[],presentationById:{},sidebarOrder:[]};
}

/**
 * Reads the three original storage records. Malformed individual records are
 * ignored; one corrupt pin must not hide other valid pinned tabs.
 */
export function sourceParsePinnedContentTabs(
  pinsJson:string|null|undefined,
  presentationJson:string|null|undefined,
  orderJson:string|null|undefined,
):SourcePinnedContentTabsState{
  const rawPins=parseJson(pinsJson);
  const rawPresentation=parseJson(presentationJson);
  const rawOrder=parseJson(orderJson);
  const pins:SourcePinnedContentTabRecord[]=[];
  if(isRecord(rawPins)){
    for(const [id,value] of Object.entries(rawPins)){
      const pin=parsePin(id,value);
      if(pin!=null)pins.push(pin);
    }
  }
  pins.sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id));
  const presentationById:Record<string,SourcePinnedContentTabPresentation>={};
  if(isRecord(rawPresentation)){
    for(const pin of pins){
      const presentation=parsePresentation(rawPresentation[pin.id]);
      if(presentation!=null)presentationById[pin.id]=presentation;
    }
  }
  const sidebarOrder=Array.isArray(rawOrder)
    ?rawOrder.filter((item):item is string=>nonEmptyString(item)):[];
  const seen=new Set(sidebarOrder);
  for(const pin of pins){
    const key=sourcePinnedContentTabOrderKey(pin.id);
    if(!seen.has(key)){sidebarOrder.push(key);seen.add(key);}
  }
  return {pins,presentationById,sidebarOrder};
}

export function sourceSerializePinnedContentTabs(
  state:SourcePinnedContentTabsState,
):{
  pinsJson:string;
  presentationJson:string;
  orderJson:string;
}{
  const pins:Record<string,SourcePinnedContentTabRecord>={};
  const presentation:Record<string,SourcePinnedContentTabPresentation>={};
  for(const pin of state.pins)pins[pin.id]=pin;
  for(const pin of state.pins){
    const item=state.presentationById[pin.id];
    if(item!=null)presentation[pin.id]=item;
  }
  return {
    pinsJson:JSON.stringify(pins),
    presentationJson:JSON.stringify(presentation),
    orderJson:JSON.stringify(state.sidebarOrder),
  };
}

/** Source uqi: pinTab keeps the source tab permanent, then records its identity. */
export function sourcePinContentTab(
  state:SourcePinnedContentTabsState,
  input:SourcePinContentTabInput,
):SourcePinContentTabResult{
  const id=sourcePinnedContentTabId(
    input.accountId,input.hostId,input.clientThreadId,input.tabId,
  );
  const existing=state.pins.find(pin=>pin.id===id);
  if(existing!=null)return {state,pin:existing,created:false};
  const pin:SourcePinnedContentTabRecord={
    id,accountId:input.accountId,hostId:input.hostId,
    threadId:input.threadId,clientThreadId:input.clientThreadId,
    tabId:input.tabId,tabKind:input.tabKind,title:input.title,
    routePath:input.routePath,routeSearch:input.routeSearch,
    order:Math.max(0,...state.pins.map(item=>item.order))+1,
  };
  const presentation:SourcePinnedContentTabPresentation={
    sourceToken:input.sourceToken,title:input.title,kind:input.tabKind,
    chrome:null,available:true,
  };
  const key=sourcePinnedContentTabOrderKey(id);
  return {
    state:{
      pins:[...state.pins,pin],
      presentationById:{...state.presentationById,[id]:presentation},
      sidebarOrder:state.sidebarOrder.includes(key)
        ?state.sidebarOrder:[...state.sidebarOrder,key],
    },
    pin,created:true,
  };
}

/** Source f7n: remove the sidebar reference and presentation, never the tab. */
export function sourceUnpinContentTab(
  state:SourcePinnedContentTabsState,pinId:string,
):SourcePinnedContentTabsState{
  if(!state.pins.some(pin=>pin.id===pinId))return state;
  const presentationById={...state.presentationById};
  delete presentationById[pinId];
  const key=sourcePinnedContentTabOrderKey(pinId);
  return {
    pins:state.pins.filter(pin=>pin.id!==pinId),
    presentationById,
    sidebarOrder:state.sidebarOrder.filter(item=>item!==key),
  };
}
export function sourceSetPinnedContentTabPresentation(
  state:SourcePinnedContentTabsState,
  pinId:string,
  presentation:SourcePinnedContentTabPresentation,
):SourcePinnedContentTabsState{
  if(!state.pins.some(pin=>pin.id===pinId)||
    samePresentation(state.presentationById[pinId],presentation))return state;
  return {
    ...state,
    presentationById:{
      ...state.presentationById,[pinId]:presentation,
    },
  };
}
export function sourceMarkPinnedContentTabUnavailable(
  state:SourcePinnedContentTabsState,pinId:string,
):SourcePinnedContentTabsState{
  const current=state.presentationById[pinId];
  if(current==null||!current.available)return state;
  return sourceSetPinnedContentTabPresentation(state,pinId,{
    ...current,available:false,
  });
}

/** Preserve the original record order, using unified order as the tie-breaker. */
export function sourcePinnedContentTabsInDisplayOrder(
  state:SourcePinnedContentTabsState,
):readonly SourcePinnedContentTabRecord[]{
  const order=new Map<string,number>(
    state.sidebarOrder.map((key,index)=>[key,index] as const),
  );
  return [...state.pins].sort((a,b)=>{
    const aOrder=order.get(sourcePinnedContentTabOrderKey(a.id));
    const bOrder=order.get(sourcePinnedContentTabOrderKey(b.id));
    return (aOrder??Number.MAX_SAFE_INTEGER)-
      (bOrder??Number.MAX_SAFE_INTEGER)||a.order-b.order||
      a.id.localeCompare(b.id);
  });
}

/**
 * A persisted presentation is only a snapshot. A pin is live only while the
 * exact source tab owner is mounted in the matching client-thread context.
 */
export function sourcePinnedContentTabDisplayRow(
  state:SourcePinnedContentTabsState,
  pinId:string,
  liveOwner:{tabId:string;clientThreadId:string;title:string}|null,
  activeTabId:string|null,
):SourcePinnedContentTabDisplayRow|null{
  const pin=state.pins.find(item=>item.id===pinId);
  if(pin==null)return null;
  const exactOwner=liveOwner!=null&&liveOwner.tabId===pin.tabId&&
    liveOwner.clientThreadId===pin.clientThreadId;
  const presentation=state.presentationById[pinId]??null;
  return {
    pin,presentation,
    title:exactOwner?liveOwner.title:presentation?.title??pin.title,
    unavailable:!exactOwner||presentation?.available===false,
    isActive:exactOwner&&activeTabId===pin.tabId,
  };
}
