/**
 * Source: original app-initial-5851df3f6cb1.js:
 *
 * k3o(scope,path,options):
 *   const {hostId,tabId}=options, environmentId= cX(scope,path,options)
 *   return tabId ?? (hostId==null
 *     ? `file:${path??""}`
 *     : `file:${hostId}:${environmentId==null?"":environmentId+":"}${path??""}`)
 *
 * IX looks up an existing tab via tabById$ before XL(open), preserves its
 * contentInstance, and passes initialLine/initialEndLine into its tab props.
 *
 * This typed controller is used by the independent Electron read-only panel.
 * It does NOT implement the private XL panel state, persistence or editor.
 */
export interface SourceReviewFileTabKeyOptions {
  hostId?:string|null;
  environmentId?:string|null;
  tabId?:string|null;
}
export function sourceReviewFileTabId(
  path:string|null|undefined,options:SourceReviewFileTabKeyOptions={},
):string {
  if(options.tabId!=null)return options.tabId;
  const file=path??"";
  return options.hostId==null?`file:${file}`:
    `file:${options.hostId}:${options.environmentId==null?"":options.environmentId+":"}${file}`;
}

export interface SourceLocalReadOnlyFileTab<T>{
  id:string;
  path:string;
  content:T;
  /** Mirrors XL isPreview: a single-click tree open may be replaced by the
   * next preview; direct attachment opens and double-clicks are kept tabs. */
  isPreview?:boolean;
}
export interface SourceLocalReadOnlyTabState<T>{
  tabs:readonly SourceLocalReadOnlyFileTab<T>[];
  activeTabId:string|null;
}
export function sourceEmptyLocalReadOnlyTabState<T>():SourceLocalReadOnlyTabState<T>{
  return {tabs:[],activeTabId:null};
}
export function sourceOpenLocalReadOnlyFileTab<T>(
  state:SourceLocalReadOnlyTabState<T>,
  tab:SourceLocalReadOnlyFileTab<T>,
  activate=true,
):SourceLocalReadOnlyTabState<T>{
  const existing=state.tabs.findIndex(t=>t.id===tab.id);
  if(existing>=0){
    const current=state.tabs[existing]!;
    // XL keeps the established tab's preview/pinned status when a caller
    // asks to open that same tab as a preview. An explicit normal open pins it.
    const next=tab.isPreview===true
      ?{...tab,isPreview:current.isPreview===true}
      :tab;
    const tabs=state.tabs.map(t=>t.id===tab.id?next:t);
    return {tabs,activeTabId:activate?tab.id:state.activeTabId??tab.id};
  }
  const oldPreviewIndex=tab.isPreview===true
    ?state.tabs.findIndex(t=>t.isPreview===true):-1;
  const oldPreview=oldPreviewIndex<0?null:state.tabs[oldPreviewIndex]!;
  // Source XL's add path disposes the previous preview before inserting the
  // new one. Permanent tabs are never replaced by a preview open.
  const survivors=oldPreview==null?state.tabs:
    state.tabs.filter(t=>t.id!==oldPreview.id);
  const tabs=[...survivors,tab];
  let activeTabId=activate?tab.id:state.activeTabId;
  // A stale/background completion must not leave activeTabId pointing at the
  // preview that was just replaced. Keep the closest surviving tab selected.
  if(!activate&&oldPreview!=null&&activeTabId===oldPreview.id){
    activeTabId=survivors[Math.min(oldPreviewIndex,survivors.length-1)]?.id??tab.id;
  }
  return {tabs,activeTabId:activeTabId??tab.id};
}
export function sourceSelectLocalReadOnlyFileTab<T>(
  state:SourceLocalReadOnlyTabState<T>,id:string,
):SourceLocalReadOnlyTabState<T>{
  return state.activeTabId===id||!state.tabs.some(t=>t.id===id)
    ?state:{tabs:state.tabs,activeTabId:id};
}
export function sourceCloseLocalReadOnlyFileTab<T>(
  state:SourceLocalReadOnlyTabState<T>,id:string,
):SourceLocalReadOnlyTabState<T>{
  const index=state.tabs.findIndex(t=>t.id===id);
  if(index<0)return state;
  const tabs=state.tabs.filter(t=>t.id!==id);
  if(tabs.length===0)return sourceEmptyLocalReadOnlyTabState<T>();
  // The exact private XL close-focus policy is host-owned. Keep the
  // independent tab surface deterministic: next tab or previous at the end.
  const activeTabId=state.activeTabId===id
    ?tabs[Math.min(index,tabs.length-1)]?.id??null
    :state.activeTabId;
  return {tabs,activeTabId};
}

/** Original app-initial Eqi emits these three actions in tab-strip placement.
 * This local preview has no private pinned/home tab registry; all its tabs
 * are user-closeable. The source guards the other two actions by the number
 * of available closeable neighbors. */
export type SourceLocalFileTabContextAction =
  |"keep-tab"|"close-tab"|"close-other-tabs"|"close-tabs-to-the-right";
export interface SourceLocalFileTabContextMenuItem {
  id:SourceLocalFileTabContextAction;
  message:"Keep tab"|"Close"|"Close other tabs"|"Close tabs to the right";
  enabled:boolean;
}
export function sourceLocalFileTabContextMenu<T>(
  state:SourceLocalReadOnlyTabState<T>,id:string,
):readonly SourceLocalFileTabContextMenuItem[] {
  const index=state.tabs.findIndex(tab=>tab.id===id);
  if(index===-1)return [];
  const tab=state.tabs[index]!;
  return [
    ...(tab.isPreview===true
      ?[{id:"keep-tab" as const,message:"Keep tab" as const,enabled:true}]
      :[]),
    {id:"close-tab",message:"Close",enabled:true},
    {id:"close-other-tabs",message:"Close other tabs",
      enabled:state.tabs.length>1},
    {id:"close-tabs-to-the-right",message:"Close tabs to the right",
      enabled:index<state.tabs.length-1},
  ];
}
/** Convert a disposable preview to a permanent local tab, matching
 * the state change made by XL.pinTab after a double-click. This does not
 * claim to create Codex's separate "Pin to sidebar" reference. */
export function sourceKeepLocalReadOnlyFileTab<T>(
  state:SourceLocalReadOnlyTabState<T>,id:string,
):SourceLocalReadOnlyTabState<T>{
  const tab=state.tabs.find(item=>item.id===id);
  if(tab==null||tab.isPreview!==true)return state;
  return {tabs:state.tabs.map(item=>
    item.id===id?{...item,isPreview:false}:item),
    activeTabId:state.activeTabId??id};
}
/** Source tab controller fe closes other closeable tabs and activates the
 * retained target. The independent native preview has no pinned tabs. */
export function sourceCloseOtherLocalReadOnlyFileTabs<T>(
  state:SourceLocalReadOnlyTabState<T>,id:string,
):SourceLocalReadOnlyTabState<T> {
  const retained=state.tabs.find(tab=>tab.id===id);
  if(retained==null)return state;
  if(state.tabs.length===1&&state.activeTabId===id)return state;
  return {tabs:[retained],activeTabId:id};
}
/** Source pe closes closeable tabs to the right in current strip order.
 * Independent fallback activates target when the active tab was removed. */
export function sourceCloseLocalReadOnlyTabsToRight<T>(
  state:SourceLocalReadOnlyTabState<T>,id:string,
):SourceLocalReadOnlyTabState<T> {
  const index=state.tabs.findIndex(tab=>tab.id===id);
  if(index===-1||index===state.tabs.length-1)return state;
  const tabs=state.tabs.slice(0,index+1);
  return {tabs,activeTabId:tabs.some(tab=>tab.id===state.activeTabId)
    ?state.activeTabId:id};
}
