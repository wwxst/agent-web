import * as React from "react";
import {createPortal} from "react-dom";
import {
  isSourceUserUploadedFile,
  sourceUserFileAttachmentGroups,
  sourceUserFileDisplayName,
  sourceUserFileLayout,
  sourceUserFileLineInfo,
  sourceUserFileOpenTarget,
  type SourceUserFileAttachment,
  type SourceUserWorkspaceFile,
  type SourceUserFileOpenTarget,
} from "../conversation/SourceUserFileAttachmentsModel.js";
import {
  projectSourceUserFileQeRoute,
  type SourceUserFileQeContext,
  type SourceUserFileQeHostClassifiers,
  type SourceUserFileRoute,
} from "../conversation/SourceUserFileQeRouteModel.js";
import {
  sourceWorkspaceFileContextMenuItems,
  type SourceWorkspaceFileContextMenuCapabilities,
  type SourceWorkspaceFileMenuActionId,
} from "../conversation/SourceWorkspaceFileContextMenuModel.js";
import "./sourceUserFileAttachments.css";

export interface SourceUserFileAttachmentsProps {
  attachments:readonly SourceUserFileAttachment[];
  /** Original Ba enables previews only after private host eligibility checks. */
  isUploadedFileViewerEnabled?:boolean;
  /** The imported private vc(filename) classifier is host-owned. */
  isUploadedPreviewable?:(filename:string)=>boolean;
  /** The resource kind classifier is host-owned, not inferred from a suffix. */
  isPathPreviewable?:(attachment:SourceUserWorkspaceFile)=>boolean;
  /** Original Ba provides cwd/hostId and original hn needs host classifiers. */
  fileOpenContext?:Omit<SourceUserFileQeContext,"featuredViewerEnabled">;
  fileOpenClassifiers?:SourceUserFileQeHostClassifiers;
  /** Optional host-specific capability filter, e.g. native local files only. */
  canOpenAttachment?:(attachment:SourceUserFileAttachment,target:SourceUserFileOpenTarget)=>boolean;
  /** No callback means a readonly attachment, never a fake file opener. */
  onOpen?:(attachment:SourceUserFileAttachment,target:SourceUserFileOpenTarget,
    sourceRoute:SourceUserFileRoute)=>void|Promise<void>;
  /** No context menu without authenticated host action handlers. */
  fileMenuCapabilities?:SourceWorkspaceFileContextMenuCapabilities;
  onFileMenuAction?:(attachment:SourceUserFileAttachment,
    route:SourceUserFileRoute,action:SourceWorkspaceFileMenuActionId)=>void|Promise<void>;
  openDisabledLabel?:string;
}
/**
 * Original Ba in sites-end-resource partitions user attachments into E and D:
 * E vertical featured cards, D horizontally scrollable context pills. hn/Wmd
 * determines each member's appearance. Files never open without a host action.
 */
export function SourceUserFileAttachments({
  attachments,isUploadedFileViewerEnabled=false,isUploadedPreviewable,isPathPreviewable,
  canOpenAttachment,fileOpenContext,fileOpenClassifiers,onOpen,
  fileMenuCapabilities,onFileMenuAction,
  openDisabledLabel="File opening unavailable",
}:SourceUserFileAttachmentsProps){
  const [fileMenu,setFileMenu]=React.useState<{
    left:number;top:number;
    attachment:SourceUserFileAttachment;
    route:SourceUserFileRoute;
    trigger:HTMLButtonElement;
    triggerKey:string;
  }|null>(null);
  const menuRef=React.useRef<HTMLDivElement|null>(null);
  const menuId=React.useId();
  const menuItems=fileMenu==null||onFileMenuAction==null?[]:
    sourceWorkspaceFileContextMenuItems(fileMenu.route,fileMenuCapabilities);
  // Source app-shared Hxn/xO supports ContextMenu and Shift+F10 on the
  // trigger, auto-focuses its menu and restores trigger focus on close.
  // This independent host uses the browser dropdown branch, not Codex's
  // private electronBridge.showContextMenu native-menu protocol.
  React.useLayoutEffect(()=>{
    if(fileMenu!=null&&menuItems.length>0)
      menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus({preventScroll:true});
  },[fileMenu,menuItems.length]);
  React.useEffect(()=>{
    if(fileMenu==null)return;
    const dismiss=()=>setFileMenu(null);
    const onKey=(event:KeyboardEvent)=>{
      if(event.key==="Escape"){
        event.preventDefault();
        fileMenu.trigger.isConnected&&fileMenu.trigger.focus({preventScroll:true});
        dismiss();
      }else if(event.key==="Tab")dismiss();
    };
    document.addEventListener("pointerdown",dismiss);
    // Virtualized thread positioning and menu-item focus can generate
    // delayed programmatic scroll events immediately after right-click.
    // Dismiss on actual wheel/touch scrolling, not those synthetic moves.
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
  },[fileMenu]);
  function openFileMenu(
    trigger:HTMLButtonElement,attachment:SourceUserFileAttachment,
    route:SourceUserFileRoute,left:number,top:number,triggerKey:string,
  ):boolean{
    if(onFileMenuAction==null||
      sourceWorkspaceFileContextMenuItems(route,fileMenuCapabilities).length===0)
      return false;
    setFileMenu({
      attachment,route,trigger,triggerKey,
      left:Math.max(4,Math.min(left,window.innerWidth-210)),
      top:Math.max(4,Math.min(top,window.innerHeight-124)),
    });
    return true;
  }
  function handleMenuKeys(event:React.KeyboardEvent<HTMLDivElement>){
    if(!["ArrowDown","ArrowUp","Home","End"].includes(event.key))return;
    const buttons=Array.from(menuRef.current?.
      querySelectorAll<HTMLButtonElement>('[role="menuitem"]')??[]);
    if(buttons.length===0)return;
    event.preventDefault();
    const active=buttons.indexOf(document.activeElement as HTMLButtonElement);
    const last=buttons.length-1;
    const next=event.key==="Home"?0:event.key==="End"?last:
      event.key==="ArrowDown"?(active+1)%buttons.length:
      (active<0?last:(active+last)%buttons.length);
    buttons[next]?.focus({preventScroll:true});
  }
  if(attachments.length===0)return null;
  const groups=sourceUserFileAttachmentGroups(
    attachments,isUploadedFileViewerEnabled,isUploadedPreviewable,isPathPreviewable);

  function renderAttachment(attachment:SourceUserFileAttachment,index:number,featured:boolean){
    const uploaded=isSourceUserUploadedFile(attachment);
    const name=sourceUserFileDisplayName(attachment);
    const target=sourceUserFileOpenTarget(attachment);
    const sourceRoute=projectSourceUserFileQeRoute(attachment,{
      ...fileOpenContext,featuredViewerEnabled:featured,
    },fileOpenClassifiers);
    const line=uploaded?null:sourceUserFileLineInfo(attachment);
    // Original hn -> Wmd uses pasted text string, never a thumbnail.
    const pastedTextPreview=uploaded&&attachment.preview!=null;
    const layout=sourceUserFileLayout(attachment,featured,featured&&!uploaded);
    const canOpen=onOpen!=null&&target.kind!=="none"&&
      (canOpenAttachment?.(attachment,target)??true);
    const canShowMenu=onFileMenuAction!=null&&
      sourceWorkspaceFileContextMenuItems(sourceRoute,fileMenuCapabilities).length>0;
    const triggerKey=`${featured?"featured":"context"}-${index}`;
    return <div key={index} className="codex-user-file-attachments__item"
      data-source-user-attachment-kind={uploaded?"upload":target.kind}
      data-source-user-attachment-layout={layout}>
      <button type="button" className="codex-user-file-attachments__pill"
        data-composer-attachment-pill={true}
        disabled={!canOpen}
        title={!canOpen?openDisabledLabel:name}
        aria-label={line!=null?`${name}, lines ${line}`:name}
        aria-haspopup={canShowMenu?"menu":undefined}
        aria-expanded={canShowMenu?fileMenu?.triggerKey===triggerKey:undefined}
        aria-controls={canShowMenu&&fileMenu!=null?menuId:undefined}
        data-source-attachment-index={triggerKey}
        onClick={()=>{if(canOpen)void onOpen?.(attachment,target,sourceRoute);}}
        onKeyDown={event=>{
          // Source Hxn ignores modified key chords and child-origin events.
          if(!canShowMenu||event.target!==event.currentTarget||
            event.altKey||event.ctrlKey||event.metaKey||
            event.key!=="ContextMenu"&&!(event.shiftKey&&event.key==="F10"))
            return;
          event.preventDefault();
          event.stopPropagation();
          const rect=event.currentTarget.getBoundingClientRect();
          openFileMenu(event.currentTarget,attachment,sourceRoute,rect.left,rect.bottom,triggerKey);
        }}
        onContextMenu={event=>{
          if(!canShowMenu)return;
          event.preventDefault();
          event.stopPropagation();
          openFileMenu(event.currentTarget,attachment,sourceRoute,
            event.clientX,event.clientY,triggerKey);
        }}>
        <span className="codex-user-file-attachments__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h4"/>
          </svg>
        </span>
        <span className="codex-user-file-attachments__label">
          <span className="codex-user-file-attachments__name"
            data-source-pasted-text-preview={pastedTextPreview?"true":undefined}>
            {name}
          </span>
          {pastedTextPreview
            ?<span className="codex-user-file-attachments__subtitle">Pasted text</span>:null}
          {line!=null?<span className="codex-user-file-attachments__line"
            data-source-user-attachment-lines={line}>{line}</span>:null}
        </span>
      </button>
    </div>;
  }

  return <div className="codex-user-file-attachments"
    data-source-user-file-attachments="">
    {groups.featured.length>0
      ?<div className="codex-user-file-attachments__featured"
        data-source-user-featured-attachments="">
        {groups.featured.map((attachment,index)=>renderAttachment(attachment,index,true))}
      </div>:null}
    {groups.context.length>0
      ?<div className="codex-user-file-attachments__context"
        data-source-user-context-attachments="">
        <div className="codex-user-file-attachments__context-inner">
          {groups.context.map((attachment,index)=>renderAttachment(attachment,index,false))}
        </div>
      </div>:null}
    {fileMenu!=null&&menuItems.length>0?createPortal(
      <div ref={menuRef} id={menuId}
        className="codex-user-file-attachments__menu"
        role="menu" aria-label="Workspace file actions"
        data-source-workspace-file-context-menu=""
        style={{left:fileMenu.left,top:fileMenu.top}}
        onKeyDown={handleMenuKeys}
        onPointerDown={event=>event.stopPropagation()}>
        {menuItems.map(item=><button key={item.id} type="button"
          role="menuitem" data-source-workspace-file-menu-action={item.id}
          onClick={()=>{
            const current=fileMenu;
            setFileMenu(null);
            if(current.trigger.isConnected)current.trigger.focus({preventScroll:true});
            void onFileMenuAction?.(current.attachment,current.route,item.id);
          }}>{item.message}</button>)}
      </div>,document.body):null}
  </div>;
}
