import * as React from "react";
import {createPortal} from "react-dom";
import {WorkspaceReadOnlyCodeMirror} from "./WorkspaceReadOnlyCodeMirror.js";
import {WorkspaceOpenFilesTree} from "./WorkspaceOpenFilesTree.js";
import {WorkspaceGrantedDirectoryTree} from "./WorkspaceGrantedDirectoryTree.js";
import {
  sourceLocalFileTabContextMenu,
  type SourceLocalFileTabContextAction,
} from "../src/conversation/SourceReviewFileTabModel.js";
import {
  sourceWorkspaceRootFromPath,
  type SourceLanguageLocation,
} from "../src/conversation/SourceLanguageNavigationModel.js";
import "./workspaceReadOnlyPreview.css";

export interface WorkspaceReadOnlyPreview{
  name:string;
  relativePath:string;
  text:string;
  line?:number;
  endLine?:number;
  /** One-based source column, as passed by original onOpenLocation. */
  column?:number;
  /** Original resetTabState clears stale editor scroll snapshots. */
  resetTabState?:boolean;
  /** Distinguishes repeated navigations to the same line from tab re-selection. */
  locationRequestId?:number;
  readOnly:true;
}
/**
 * Split only at the two original source line-range boundaries. Rendering all
 * 1 MiB text as thousands of span nodes would regress the existing virtual
 * thread and the independent code panel.
 */
export function sourceWorkspacePreviewRange(
  text:string,line?:number,endLine?:number,
):{before:string;selected:string;after:string;selectedLine:number|null}{
  if(line==null||!Number.isSafeInteger(line)||line<1)
    return {before:"",selected:"",after:text,selectedLine:null};
  let start=0,current=1;
  while(current<line&&start<text.length){
    const end=text.indexOf("\n",start);
    if(end===-1){start=text.length;break;}
    start=end+1;current++;
  }
  if(current<line)return {before:text,selected:"",after:"",selectedLine:null};
  const stop=Math.max(line,endLine??line);
  let end=start,selectedLine=line;
  while(selectedLine<=stop&&end<text.length){
    const next=text.indexOf("\n",end);
    end=next===-1?text.length:next+1;
    selectedLine++;
  }
  return {before:text.slice(0,start),selected:text.slice(start,end),
    after:text.slice(end),selectedLine:line};
}
export function WorkspaceReadOnlyPreviewPanel({
  preview,tabs,activeTabId,onSelectTab,onKeepTab,onCloseTab,onCloseOthers,
  onCloseToRight,onClose,onOpenTreeFile,onOpenLocation,
}:{
  preview:WorkspaceReadOnlyPreview;
  /** Source IX opens a tab keyed by k3o, not a separate preview window.
   * Contents remain explicitly independent local read-only fallbacks. */
  tabs:readonly {
    id:string;path:string;content:WorkspaceReadOnlyPreview;isPreview?:boolean;
  }[];
  activeTabId:string;
  onSelectTab:(id:string)=>void;
  /** Keeps an XL-style preview in the strip after double-click or menu use. */
  onKeepTab:(id:string)=>void;
  onCloseTab:(id:string)=>void;
  onCloseOthers:(id:string)=>void;
  onCloseToRight:(id:string)=>void;
  onClose:()=>void;
  onOpenTreeFile:(relativePath:string,isPreview?:boolean)=>void;
  onOpenLocation:(location:SourceLanguageLocation)=>void;
}){
  // IX preserves a tab contentInstance in the original private XL host.
  // Keep one independent CodeMirror EditorView mounted per stable tab ID:
  // hiding a tab preserves its selection, viewport and scroll without a
  // synthetic restore transaction when the user selects it again.
  const scrollByTab=React.useRef(new Map<string,number>());
  const asideRef=React.useRef<HTMLElement|null>(null);
  const menuRef=React.useRef<HTMLDivElement|null>(null);
  const menuId=React.useId();
  const [showOpenFileTree,setShowOpenFileTree]=React.useState(false);
  const [tabMenu,setTabMenu]=React.useState<{
    tabId:string;trigger:HTMLButtonElement;left:number;top:number;
  }|null>(null);
  const focusAfterClose=React.useRef<HTMLButtonElement|null>(null);
  const menuItems=tabMenu==null?[]:
    sourceLocalFileTabContextMenu({tabs,activeTabId},tabMenu.tabId);
  // Original Eqi guards its actions by the tab's live identity; this
  // fallback avoids presenting a menu for a tab already closed elsewhere.
  React.useEffect(()=>{
    if(tabMenu!=null&&!tabs.some(tab=>tab.id===tabMenu.tabId))setTabMenu(null);
  },[tabs,tabMenu]);
  React.useLayoutEffect(()=>{
    if(tabMenu!=null&&menuItems.length>0)
      menuRef.current?.querySelector<HTMLButtonElement>(
        '[role="menuitem"]:not(:disabled)')?.focus({preventScroll:true});
  },[tabMenu,menuItems.length]);
  React.useLayoutEffect(()=>{
    const trigger=focusAfterClose.current;
    if(trigger==null)return;
    focusAfterClose.current=null;
    if(trigger.isConnected){
      trigger.focus({preventScroll:true});
      return;
    }
    // The native XL focus manager is private. For a closed tab, fall back
    // to the local preview's still-selected accessible tab.
    const selected=asideRef.current?.querySelector<HTMLButtonElement>(
      '[role="tab"][aria-selected="true"]');
    selected?.focus({preventScroll:true});
  },[tabs,activeTabId]);
  React.useEffect(()=>{
    if(tabMenu==null)return;
    const dismiss=()=>setTabMenu(null);
    const onKey=(event:KeyboardEvent)=>{
      if(event.key==="Escape"){
        event.preventDefault();
        if(tabMenu.trigger.isConnected)tabMenu.trigger.focus({preventScroll:true});
        dismiss();
      }else if(event.key==="Tab")dismiss();
    };
    document.addEventListener("pointerdown",dismiss);
    document.addEventListener("wheel",dismiss,{capture:true,passive:true});
    document.addEventListener("touchmove",dismiss,{capture:true,passive:true});
    document.addEventListener("keydown",onKey);
    window.addEventListener("blur",dismiss);
    return ()=>{
      document.removeEventListener("pointerdown",dismiss);
      document.removeEventListener("wheel",dismiss,true);
      document.removeEventListener("touchmove",dismiss,true);
      document.removeEventListener("keydown",onKey);
      window.removeEventListener("blur",dismiss);
    };
  },[tabMenu]);
  function openTabMenu(
    trigger:HTMLButtonElement,tabId:string,left:number,top:number,
  ){
    if(sourceLocalFileTabContextMenu({tabs,activeTabId},tabId).length===0)return;
    setTabMenu({tabId,trigger,
      left:Math.max(4,Math.min(left,window.innerWidth-230)),
      top:Math.max(4,Math.min(top,window.innerHeight-150))});
  }
  function handleMenuKeys(event:React.KeyboardEvent<HTMLDivElement>){
    if(!["ArrowDown","ArrowUp","Home","End"].includes(event.key))return;
    const buttons=Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>(
      '[role="menuitem"]:not(:disabled)')??[]);
    if(buttons.length===0)return;
    event.preventDefault();
    const current=buttons.indexOf(document.activeElement as HTMLButtonElement);
    const last=buttons.length-1;
    const next=event.key==="Home"?0:event.key==="End"?last:
      event.key==="ArrowDown"?(current+1)%buttons.length:
      current<0?last:(current+last)%buttons.length;
    buttons[next]?.focus({preventScroll:true});
  }
  function runTabAction(action:SourceLocalFileTabContextAction){
    const current=tabMenu;
    if(current==null||!sourceLocalFileTabContextMenu(
      {tabs,activeTabId},current.tabId).some(item=>
        item.id===action&&item.enabled))return;
    focusAfterClose.current=current.trigger;
    setTabMenu(null);
    if(action==="keep-tab")onKeepTab(current.tabId);
    else if(action==="close-tab")onCloseTab(current.tabId);
    else if(action==="close-other-tabs")onCloseOthers(current.tabId);
    else onCloseToRight(current.tabId);
  }
  React.useEffect(()=>{
    const current=new Set(tabs.map(tab=>tab.id));
    for(const id of scrollByTab.current.keys())
      if(!current.has(id))scrollByTab.current.delete(id);
  },[tabs]);
  const rangeLabel=preview.line==null?"":
    preview.endLine!=null&&preview.endLine!==preview.line
      ?` · Lines ${preview.line}-${preview.endLine}`
      :` · Line ${preview.line}`;
  return <aside ref={asideRef} className="demo-workspace-preview" role="complementary"
    aria-label="Local file preview" data-independent-workspace-preview="">
    <div className="demo-workspace-preview__tabs" role="tablist"
      aria-label="Open local files">
      {tabs.map(tab=><div key={tab.id} className="demo-workspace-preview__tab"
        data-source-file-tab-id={tab.id}
        data-source-file-tab-preview={tab.isPreview===true?"true":"false"}
        data-source-file-tab-active={tab.id===activeTabId?"true":"false"}>
        <button type="button" role="tab"
          data-source-file-tab-preview={tab.isPreview===true?"true":"false"}
          aria-selected={tab.id===activeTabId}
          aria-haspopup="menu"
          aria-expanded={tabMenu?.tabId===tab.id}
          aria-controls="demo-workspace-preview-panel"
          title={tab.content.relativePath}
          onClick={()=>onSelectTab(tab.id)}
          onDoubleClick={()=>{
            if(tab.isPreview===true)onKeepTab(tab.id);
          }}
          onKeyDown={event=>{
            if(event.target!==event.currentTarget||
              event.altKey||event.ctrlKey||event.metaKey||
              event.key!=="ContextMenu"&&!(event.shiftKey&&event.key==="F10"))
              return;
            event.preventDefault();
            event.stopPropagation();
            const rect=event.currentTarget.getBoundingClientRect();
            openTabMenu(event.currentTarget,tab.id,rect.left,rect.bottom);
          }}
          onContextMenu={event=>{
            event.preventDefault();
            event.stopPropagation();
            openTabMenu(event.currentTarget,tab.id,event.clientX,event.clientY);
          }}>{tab.content.name}</button>
        <button type="button" aria-label={`Close ${tab.content.name} tab`}
          onClick={()=>{scrollByTab.current.delete(tab.id);onCloseTab(tab.id);}}>×</button>
      </div>)}
    </div>
    <div id="demo-workspace-preview-panel" role="tabpanel"
      aria-label={preview.name} className="demo-workspace-preview__tabpanel">
    <header className="demo-workspace-preview__header">
      <span className="demo-workspace-preview__name" title={preview.relativePath}>
        {preview.name}
        <small>{preview.relativePath}</small>
      </span>
      <button type="button"
        aria-label="Toggle open files tree"
        aria-pressed={showOpenFileTree}
        onClick={()=>setShowOpenFileTree(current=>!current)}
        title="Show paths of already opened local files">☷</button>
      <button type="button" onClick={onClose}
        aria-label="Close local file preview">×</button>
    </header>
    <p className="demo-workspace-preview__notice">
      Read-only local preview · Not the original Codex file manager
      {rangeLabel}
    </p>
    <div className="demo-workspace-preview__editor-layout">
      {window.agentWebDesktopHost?.listWorkspaceDirectory!=null&&
        window.agentWebDesktopHost?.readWorkspaceTreeTextFile!=null
        ?<WorkspaceGrantedDirectoryTree
          visible={showOpenFileTree}
          activeRelativePath={preview.relativePath.replace(/\\/g,"/")}
          onOpenFile={onOpenTreeFile}/>
        :<WorkspaceOpenFilesTree
          visible={showOpenFileTree}
          files={tabs.map(tab=>({
            id:tab.id,relativePath:tab.content.relativePath,
          }))}
          activeTabId={activeTabId}
          onSelectTab={onSelectTab}/>}
      {tabs.map(tab=><WorkspaceReadOnlyCodeMirror key={tab.id}
        preview={tab.content}
        path={tab.path}
        workspaceRoot={sourceWorkspaceRootFromPath(tab.path,tab.content.relativePath)}
        onOpenLocation={onOpenLocation}
        active={tab.id===activeTabId}
        initialScrollTop={scrollByTab.current.get(tab.id)}
        onScrollTop={top=>scrollByTab.current.set(tab.id,top)}/>)}
    </div>
    </div>
    {tabMenu!=null&&menuItems.length>0?createPortal(
      <div ref={menuRef} id={menuId}
        className="demo-workspace-preview__menu" role="menu"
        aria-label="Local file tab actions"
        data-source-file-tab-context-menu=""
        style={{left:tabMenu.left,top:tabMenu.top}}
        onKeyDown={handleMenuKeys}
        onPointerDown={event=>event.stopPropagation()}>
        {menuItems.map(item=><button key={item.id} type="button"
          role="menuitem" disabled={!item.enabled}
          aria-disabled={!item.enabled}
          data-source-file-tab-menu-action={item.id}
          onClick={()=>runTabAction(item.id)}>{item.message}</button>)}
      </div>,document.body):null}
  </aside>;
}
