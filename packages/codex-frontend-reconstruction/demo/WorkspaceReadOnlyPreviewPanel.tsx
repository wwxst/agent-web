import * as React from "react";
import "./workspaceReadOnlyPreview.css";

export interface WorkspaceReadOnlyPreview{
  name:string;
  relativePath:string;
  text:string;
  line?:number;
  endLine?:number;
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
  preview,tabs,activeTabId,onSelectTab,onCloseTab,onClose,
}:{
  preview:WorkspaceReadOnlyPreview;
  /** Source IX opens a tab keyed by k3o, not a separate preview window.
   * Contents remain explicitly independent local read-only fallbacks. */
  tabs:readonly {id:string;path:string;content:WorkspaceReadOnlyPreview}[];
  activeTabId:string;
  onSelectTab:(id:string)=>void;
  onCloseTab:(id:string)=>void;
  onClose:()=>void;
}){
  const content=React.useRef<HTMLPreElement|null>(null);
  const highlighted=React.useRef<HTMLSpanElement|null>(null);
  const segments=React.useMemo(()=>sourceWorkspacePreviewRange(
    preview.text,preview.line,preview.endLine,
  ),[preview.text,preview.line,preview.endLine]);
  React.useEffect(()=>{
    const pre=content.current,selected=highlighted.current;
    if(pre==null)return;
    pre.scrollTop=selected==null?0:
      Math.max(0,selected.offsetTop-pre.offsetTop-54);
  },[preview,segments]);
  const rangeLabel=preview.line==null?"":
    preview.endLine!=null&&preview.endLine!==preview.line
      ?` · Lines ${preview.line}-${preview.endLine}`
      :` · Line ${preview.line}`;
  return <aside className="demo-workspace-preview" role="complementary"
    aria-label="Local file preview" data-independent-workspace-preview="">
    <div className="demo-workspace-preview__tabs" role="tablist"
      aria-label="Open local files">
      {tabs.map(tab=><div key={tab.id} className="demo-workspace-preview__tab"
        data-source-file-tab-id={tab.id}
        data-source-file-tab-active={tab.id===activeTabId?"true":"false"}>
        <button type="button" role="tab"
          aria-selected={tab.id===activeTabId}
          aria-controls="demo-workspace-preview-panel"
          title={tab.content.relativePath}
          onClick={()=>onSelectTab(tab.id)}>{tab.content.name}</button>
        <button type="button" aria-label={`Close ${tab.content.name} tab`}
          onClick={()=>onCloseTab(tab.id)}>×</button>
      </div>)}
    </div>
    <div id="demo-workspace-preview-panel" role="tabpanel"
      aria-label={preview.name} className="demo-workspace-preview__tabpanel">
    <header className="demo-workspace-preview__header">
      <span className="demo-workspace-preview__name" title={preview.relativePath}>
        {preview.name}
        <small>{preview.relativePath}</small>
      </span>
      <button type="button" onClick={onClose}
        aria-label="Close local file preview">×</button>
    </header>
    <p className="demo-workspace-preview__notice">
      Read-only local preview · Not the original Codex file manager
      {rangeLabel}
    </p>
    <pre ref={content} tabIndex={0} className="demo-workspace-preview__text"
      data-workspace-file-text="">{segments.before}
      {segments.selectedLine!=null&&segments.selected.length>0
        ?<span ref={highlighted} className="demo-workspace-preview__selection"
          data-workspace-file-selected-range="">{segments.selected}</span>:null}
      {segments.after}</pre>
    </div>
  </aside>;
}
