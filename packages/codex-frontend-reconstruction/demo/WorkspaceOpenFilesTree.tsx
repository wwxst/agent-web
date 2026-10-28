import * as React from "react";
import {
  sourceInitialOpenFileTreeExpansion,sourceOpenFileTreeRows,
  type SourceOpenFileTreeEntry,
} from "../src/conversation/SourceOpenFilesTreeModel.js";

export function WorkspaceOpenFilesTree({
  files,activeTabId,onSelectTab,visible=true,
}:{
  files:readonly SourceOpenFileTreeEntry[];
  activeTabId:string;
  onSelectTab:(id:string)=>void;
  visible?:boolean;
}){
  const [query,setQuery]=React.useState("");
  const [expanded,setExpanded]=React.useState<ReadonlySet<string>>(()=>
    sourceInitialOpenFileTreeExpansion(files,activeTabId));
  const treeRef=React.useRef<HTMLDivElement|null>(null);
  const rows=React.useMemo(()=>
    sourceOpenFileTreeRows(files,expanded,activeTabId,query),
    [files,expanded,activeTabId,query]);
  const toggle=React.useCallback((path:string)=>{
    setExpanded(current=>{
      const next=new Set(current);
      if(next.has(path))next.delete(path);
      else next.add(path);
      return next;
    });
  },[]);
  function onTreeKey(event:React.KeyboardEvent<HTMLButtonElement>,
    item:typeof rows[number]){
    if(["Enter"," "].includes(event.key)){
      event.preventDefault();
      if(item.kind==="folder")toggle(item.path);
      else if(item.tabId!=null)onSelectTab(item.tabId);
      return;
    }
    if(event.key==="ArrowRight"&&item.kind==="folder"){
      event.preventDefault();
      if(!item.expanded)toggle(item.path);
      return;
    }
    if(event.key==="ArrowLeft"&&item.kind==="folder"){
      event.preventDefault();
      if(item.expanded)toggle(item.path);
      return;
    }
    if(!["ArrowDown","ArrowUp","Home","End"].includes(event.key))return;
    event.preventDefault();
    const buttons=Array.from(treeRef.current?.
      querySelectorAll<HTMLButtonElement>('[role="treeitem"]')??[]);
    const index=buttons.indexOf(event.currentTarget);
    const next=event.key==="Home"?0:event.key==="End"?buttons.length-1:
      event.key==="ArrowUp"?Math.max(0,index-1):
        Math.min(buttons.length-1,index+1);
    buttons[next]?.focus({preventScroll:false});
  }
  return <div className="demo-workspace-preview__tree"
    style={visible?undefined:{display:"none"}}
    aria-hidden={!visible}
    data-source-open-file-tree="">
    <div className="demo-workspace-preview__tree-header">
      <span>Open files</span>
      <small>{files.length}</small>
    </div>
    <label className="demo-workspace-preview__tree-filter">
      <span className="sr-only">Filter open files</span>
      <input value={query} aria-label="Filter open files"
        placeholder="Filter files…"
        onChange={event=>setQuery(event.target.value)}
        onKeyDown={event=>{
          if(event.key==="Escape"&&query){
            event.preventDefault();
            setQuery("");
          }
        }}/>
    </label>
    <div ref={treeRef} className="demo-workspace-preview__tree-items"
      role="tree" aria-label="Opened local file paths">
      {rows.length===0?<p className="demo-workspace-preview__tree-empty">
        No matching files
      </p>:rows.map(item=><button type="button" key={item.id}
        role="treeitem" aria-level={item.depth}
        aria-selected={item.kind==="file"?item.selected:undefined}
        aria-expanded={item.kind==="folder"?item.expanded:undefined}
        data-item-type={item.kind==="folder"?"folder":"file"}
        data-item-path={item.path}
        title={item.path}
        style={{paddingInlineStart:`${8+(item.depth-1)*14}px`}}
        className="demo-workspace-preview__tree-item"
        onClick={()=>item.kind==="folder"?toggle(item.path):
          item.tabId!=null&&onSelectTab(item.tabId)}
        onKeyDown={event=>onTreeKey(event,item)}>
        <span className="demo-workspace-preview__tree-icon" aria-hidden="true">
          {item.kind==="folder"?(item.expanded?"⌄":"›"):"▤"}
        </span>
        <span className="demo-workspace-preview__tree-label">
          {item.label}
        </span>
      </button>)}
    </div>
    <p className="demo-workspace-preview__tree-notice">
      Opened files only · No directory access
    </p>
  </div>;
}
