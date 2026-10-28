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
  const tabs=existing<0?[...state.tabs,tab]:
    state.tabs.map(t=>t.id===tab.id?tab:t);
  // The independent native reader can finish files out of order. Preserve
  // an already selected tab when a different, older read completes later.
  return {tabs,activeTabId:activate?tab.id:state.activeTabId??tab.id};
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
