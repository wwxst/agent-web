import * as React from "react";
import "./workspaceReadOnlyPreview.css";

export interface WorkspaceReadOnlyPreview{
  name:string;
  relativePath:string;
  text:string;
  line?:number;
  readOnly:true;
}
export function WorkspaceReadOnlyPreviewPanel({
  preview,onClose,
}:{preview:WorkspaceReadOnlyPreview;onClose:()=>void}){
  const content=React.useRef<HTMLPreElement|null>(null);
  React.useEffect(()=>{
    if(content.current==null)return;
    const requested=preview.line;
    if(requested==null)return;
    const lineCount=preview.text.split("\n").length;
    const clamped=Math.max(1,Math.min(lineCount,requested));
    // Source Qe passes line/column into its editor router; this minimal
    // independent read-only host has no editor engine or file-manager tab.
    content.current.scrollTop=(clamped-1)*18;
  },[preview]);
  return <aside className="demo-workspace-preview" role="complementary"
    aria-label="Local file preview" data-independent-workspace-preview="">
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
      {preview.line!=null?` · Line ${preview.line}`:""}
    </p>
    <pre ref={content} tabIndex={0} className="demo-workspace-preview__text"
      data-workspace-file-text="">{preview.text}</pre>
  </aside>;
}
