import * as React from "react";
import {createPortal} from "react-dom";
import {
  sourceBrowserWebsiteReply,sourceBrowserWebsiteRequestKey,sourceBrowserWebsiteSafeHref,
  type SourceBrowserWebsiteApprovalRequest,type SourceBrowserWebsiteReplyTransport,
  type SourceBrowserWebsiteScope,
} from "../conversation/SourceBrowserWebsiteApprovalModel.js";
import {nextSourceApprovalMenuIndex} from "../conversation/SourceApprovalScopeMenuKeyboardModel.js";
import {SourceApprovalCardSurface} from "./SourceApprovalCardSurface.js";
import {SourceApprovalDropdownPortal} from "./SourceApprovalDropdownPortal.js";
import "./sourceMcpApprovalRequestCard.css";
import "./sourceBrowserWebsiteApprovalCard.css";

interface Props {
  request:SourceBrowserWebsiteApprovalRequest;
  /** The trusted session host owns request validation and settlement. */
  onReply?:SourceBrowserWebsiteReplyTransport;
}

/** Original Ge/Ke/qe/Je. Reuses qbd; transport success is NOT a grant. */
export function SourceBrowserWebsiteApprovalCard({request,onReply}:Props){
  const key=sourceBrowserWebsiteRequestKey(request);
  const [phase,setPhase]=React.useState<"idle"|"submitting"|"error"|"submitted">("idle");
  const [error,setError]=React.useState<string|null>(null);
  const [menuOpen,setMenuOpen]=React.useState(false);
  const [confirmAll,setConfirmAll]=React.useState(false);
  const submitting=React.useRef(false);
  const generation=React.useRef(0);
  const triggerRef=React.useRef<HTMLButtonElement|null>(null);
  const splitRef=React.useRef<HTMLDivElement|null>(null);
  const menuRef=React.useRef<HTMLDivElement|null>(null);
  const firstItemRef=React.useRef<HTMLButtonElement|null>(null);
  const lastItemRef=React.useRef<HTMLButtonElement|null>(null);
  const confirmRef=React.useRef<HTMLButtonElement|null>(null);
  const modalCancelRef=React.useRef<HTMLButtonElement|null>(null);
  const menuId=React.useId();
  const dialogTitleId=React.useId();
  const dialogDescriptionId=React.useId();
  const focusLast=React.useRef(false);
  React.useEffect(()=>{
    generation.current++;
    submitting.current=false;
    setPhase("idle");setError(null);setMenuOpen(false);setConfirmAll(false);
    return ()=>{generation.current++;};
  },[key]);
  const disabled=request.disabled===true||onReply==null||phase==="submitting"||phase==="submitted";
  const isBrowser=request.source.kind==="browser";
  const safeHref=sourceBrowserWebsiteSafeHref(request.origin);
  const closeMenu=React.useCallback((restore=true)=>{
    setMenuOpen(false);
    if(restore)triggerRef.current?.focus();
  },[]);
  const closeOffscreen=React.useCallback(()=>setMenuOpen(false),[]);
  const focusPositioned=React.useCallback(()=>{
    (focusLast.current?lastItemRef:firstItemRef).current?.focus();
  },[]);
  React.useEffect(()=>{
    if(!menuOpen)return;
    const onOutside=(event:PointerEvent)=>{
      if(event.target instanceof Node&&!splitRef.current?.contains(event.target)
        &&!menuRef.current?.contains(event.target))setMenuOpen(false);
    };
    document.addEventListener("pointerdown",onOutside);
    return ()=>document.removeEventListener("pointerdown",onOutside);
  },[menuOpen]);
  React.useEffect(()=>{
    if(!confirmAll)return;
    const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
    modalCancelRef.current?.focus();
    const onKeyDown=(event:KeyboardEvent)=>{
      if(event.key==="Escape"){
        event.preventDefault();event.stopPropagation();setConfirmAll(false);
      }else if(event.key==="Tab"){
        const current=document.activeElement;
        if(event.shiftKey&&current===modalCancelRef.current){
          event.preventDefault();confirmRef.current?.focus();
        }else if(!event.shiftKey&&current===confirmRef.current){
          event.preventDefault();modalCancelRef.current?.focus();
        }
      }
    };
    document.addEventListener("keydown",onKeyDown,true);
    return ()=>{document.removeEventListener("keydown",onKeyDown,true);previous?.focus();};
  },[confirmAll]);
  async function respond(scope:SourceBrowserWebsiteScope){
    const reply=sourceBrowserWebsiteReply(request,scope);
    if(reply==null||onReply==null||submitting.current||phase==="submitted")return;
    submitting.current=true;
    setConfirmAll(false);setMenuOpen(false);setError(null);setPhase("submitting");
    const current=generation.current;
    try{
      await onReply(request.requestId,reply,{
        hostId:request.hostId,conversationId:request.conversationId,
      });
      if(generation.current!==current)return;
      setPhase("submitted");
    }catch(failure){
      if(generation.current!==current)return;
      submitting.current=false;
      setPhase("error");
      const unavailable=failure instanceof Error&&failure.message.includes("MCP_BACKEND_UNAVAILABLE");
      setError(unavailable
        ?"Unable to send website access response: backend unavailable. No permission was changed."
        :"Unable to send website access response. No permission was confirmed.");
    }
  }
  const openMenu=(last=false)=>{focusLast.current=last;setMenuOpen(true);};
  const menuKeyDown=(event:React.KeyboardEvent<HTMLDivElement>)=>{
    if(event.key==="Escape"){event.preventDefault();event.stopPropagation();closeMenu();return;}
    if(event.key==="Tab"){closeMenu(false);return;}
    if(event.key==="ArrowDown"||event.key==="ArrowUp"||event.key==="Home"||event.key==="End"){
      event.preventDefault();event.stopPropagation();
      const buttons=[firstItemRef.current,lastItemRef.current]
        .filter((button):button is HTMLButtonElement=>button!=null&&!button.disabled);
      const active=buttons.findIndex(button=>button===document.activeElement);
      const next=nextSourceApprovalMenuIndex(event.key,active,buttons.length);
      if(next!=null)buttons[next]?.focus();
    }
  };
  const header=<span className="codex-source-browser-website__source"
    data-source-browser-website-source={request.source.kind}>
    <span className="codex-source-browser-website__source-icon" aria-hidden="true">
      {isBrowser?"◎":"◉"}
    </span>{request.source.name}
  </span>;
  const title=<>Allow ChatGPT to access{" "}
    {safeHref?<a href={safeHref} target="_blank" rel="noopener noreferrer"
      className="codex-source-browser-website__origin">{request.origin}</a>
      :<span>{request.origin}</span>}?
  </>;
  const status=<>
    {error?<p role="alert" className="codex-source-mcp-approval__error">{error}</p>:null}
    {phase==="submitting"?<p role="status">Submitting website access response…</p>:null}
    {phase==="submitted"?<p role="status">Response sent to host; awaiting request settlement.</p>:null}
    {onReply==null?<p className="codex-source-mcp-approval__readonly">
      No website access reply transport is connected. This request is read-only.
    </p>:null}
  </>;
  const actions=<>
    {request.allowAllSites?<button type="button"
      className="codex-source-mcp-approval__action codex-source-mcp-approval__action--leading"
      disabled={disabled||confirmAll} onClick={()=>{closeMenu(false);setConfirmAll(true);}}>
      Allow for all sites
    </button>:null}
    <div className="codex-source-mcp-approval__trailing">
      <button type="button" className="codex-source-mcp-approval__action"
        disabled={disabled||confirmAll} onClick={()=>{void respond("deny");}}>Deny</button>
      <div className="codex-source-mcp-approval__split" ref={splitRef}>
        <button type="submit" disabled={disabled||confirmAll}
          className="codex-source-mcp-approval__action codex-source-mcp-approval__action--primary">
          Allow once
        </button>
        <button type="button" ref={triggerRef}
          aria-label="Approval options" aria-haspopup="menu"
          aria-controls={menuOpen?menuId:undefined} aria-expanded={menuOpen}
          className="codex-source-mcp-approval__action codex-source-mcp-approval__action--dropdown"
          disabled={disabled||confirmAll}
          onClick={()=>{if(menuOpen)closeMenu();else openMenu();}}
          onKeyDown={event=>{
            if(event.key==="ArrowDown"||event.key==="ArrowUp"){
              event.preventDefault();openMenu(event.key==="ArrowUp");
            }
          }}><span aria-hidden="true">⌄</span></button>
        {menuOpen?<SourceApprovalDropdownPortal
          triggerRef={triggerRef} menuRef={menuRef} menuId={menuId}
          onKeyDown={menuKeyDown} onAnchorUnavailable={closeOffscreen}
          onPositioned={focusPositioned}>
          <button type="button" role="menuitem" ref={firstItemRef}
            onClick={()=>{closeMenu(false);void respond("once");}}>Allow once</button>
          <button type="button" role="menuitem" ref={lastItemRef}
            onClick={()=>{closeMenu(false);void respond("site");}}>Allow for this site</button>
        </SourceApprovalDropdownPortal>:null}
      </div>
    </div>
  </>;
  return <>
    <SourceApprovalCardSurface kind="browser-website"
      requestId={key} phase={phase} headerContent={header}
      title={title} subtitle={request.reason??undefined} status={status}
      actions={actions} onSubmit={event=>{event.preventDefault();if(!confirmAll)void respond("once");}}/>
    {confirmAll&&request.allowAllSites&&typeof document!=="undefined"?createPortal(
      <div className="codex-source-browser-website__scrim"
        data-source-browser-website-risk-dialog=""
        onPointerDown={event=>{
          if(event.target===event.currentTarget)setConfirmAll(false);
        }}>
        <div role="dialog" aria-modal="true" aria-labelledby={dialogTitleId}
          aria-describedby={dialogDescriptionId}
          className="codex-source-browser-website__dialog">
          <h2 id={dialogTitleId}>
            {isBrowser
              ?"Allow ChatGPT to interact with any website without asking?"
              :"Allow ChatGPT to use "+request.source.name+" to interact with any website without asking?"}
          </h2>
          <p id={dialogDescriptionId}>
            <span aria-hidden="true">⚠</span>{" "}
            This setting has elevated risks for your data.
          </p>
          <form onSubmit={event=>{event.preventDefault();void respond("all-sites");}}
            className="codex-source-browser-website__dialog-actions">
            <button type="button" ref={modalCancelRef}
              onClick={()=>setConfirmAll(false)}>Cancel</button>
            <button type="submit" ref={confirmRef}
              disabled={disabled}>Allow any website</button>
          </form>
        </div>
      </div>,document.body):null}
  </>;
}
