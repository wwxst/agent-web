import * as React from "react";
import {
  sourceMcpApprovalParamText,
  sourceMcpApprovalParameterEntries,
  sourceMcpApprovalReply,
  projectSourceMcpToolApprovalTitle,
  SOURCE_MCP_INITIAL_PARAMETER_COUNT,
  type SourceMcpApprovalRequest,
  type SourceMcpApprovalPersistence,
  type SourceMcpApprovalDecision,
  type SourceMcpApprovalReplyTransport,
  type SourceMcpApprovalParameter,
} from "../conversation/SourceMcpApprovalRequestModel.js";
import { SourceApprovalCardSurface } from "./SourceApprovalCardSurface.js";
import { SourceApprovalDropdownPortal } from "./SourceApprovalDropdownPortal.js";
import {
  nextSourceApprovalMenuIndex,
  type SourceApprovalMenuMoveKey,
} from "../conversation/SourceApprovalScopeMenuKeyboardModel.js";
import "./sourceMcpApprovalRequestCard.css";

export interface SourceMcpApprovalRequestCardProps {
  request:SourceMcpApprovalRequest;
  /** Only the host can send MCP elicitation replies. Undefined = readonly. */
  onReply?:SourceMcpApprovalReplyTransport|undefined;
}
function Param({entry,expanded,onToggle}:{
  entry:SourceMcpApprovalParameter;
  expanded:boolean;
  onToggle:()=>void;
}){
  const content=sourceMcpApprovalParamText(entry.value);
  // Original Ibd/Mbd uses a container-query definition list with
  // a 120px label column at widths >=24rem; smaller rows stack.
  return <dl className="codex-source-mcp-approval__param" data-source-mcp-param={entry.name}>
    <div className="codex-source-mcp-approval__param-row">
      <dt className="codex-source-mcp-approval__param-name">{entry.displayName??entry.name}</dt>
      <dd className="codex-source-mcp-approval__param-value">
        <pre className={"codex-source-mcp-approval__"+content.kind}
          data-source-mcp-param-preview={expanded?"expanded":"preview"}
          data-source-mcp-param-expandable={content.expandable?"true":"false"}>{expanded?content.full:content.preview}</pre>
        {content.expandable?<button type="button" aria-expanded={expanded}
          aria-label={(expanded?"Collapse ":"Expand ")+(entry.displayName??entry.name)}
          onClick={onToggle}>{expanded?"Collapse":"Expand"}</button>:null}
      </dd>
    </div>
  </dl>;
}
/**
 * Real conversation-mounted source ye card. The private Nz design-system card,
 * Mxn transport, localization and connector icon are host responsibilities.
 * No capability/persistence is inferred from displayed request fields.
 */
export function SourceMcpApprovalRequestCard({
  request,onReply,
}:SourceMcpApprovalRequestCardProps){
  const [phase,setPhase]=React.useState<"idle"|"submitting"|"error"|"submitted">("idle");
  const [error,setError]=React.useState<string|null>(null);
  const [expanded,setExpanded]=React.useState(false);
  const [showAll,setShowAll]=React.useState(false);
  const [scopeMenuOpen,setScopeMenuOpen]=React.useState(false);
  const scopeMenuRef=React.useRef<HTMLDivElement|null>(null);
  const portaledMenuRef=React.useRef<HTMLDivElement|null>(null);
  const scopeTriggerRef=React.useRef<HTMLButtonElement|null>(null);
  const scopeMenuId=React.useId();
  const closeOffscreenMenu=React.useCallback(()=>setScopeMenuOpen(false),[]);
  const firstMenuItemRef=React.useRef<HTMLButtonElement|null>(null);
  const lastMenuItemRef=React.useRef<HTMLButtonElement|null>(null);
  const focusPositionedMenu=React.useCallback(()=>{
    (pendingMenuFocusRef.current===1?lastMenuItemRef:firstMenuItemRef).current?.focus();
  },[]);
  const pendingMenuFocusRef=React.useRef<0|1>(0);
  // Original we keeps "name:index" expansion state above lazy/paged rows.
  const [expandedParams,setExpandedParams]=React.useState<Record<string,boolean>>({});
  const submitting=React.useRef(false);
  const generation=React.useRef(0);
  React.useEffect(()=>{
    generation.current++;
    submitting.current=false;
    setPhase("idle");
    setError(null);
    setExpanded(false);
    setShowAll(false);
    setExpandedParams({});
    setScopeMenuOpen(false);
    pendingMenuFocusRef.current=0;
    return ()=>{generation.current++;};
  },[request.requestId]);
  const entries=sourceMcpApprovalParameterEntries(request.toolParams,request.toolParamsDisplay);
  const parsedTitle=projectSourceMcpToolApprovalTitle(request.title,request.connectorName);
  const highRisk=request.riskLevel==="high";
  const visible=showAll?entries:entries.slice(0,SOURCE_MCP_INITIAL_PARAMETER_COUNT);
  const remaining=entries.length-visible.length;
  const disabled=request.disabled===true||onReply==null||phase==="submitting"||phase==="submitted";
  const canApprove=!disabled&&request.approveDisabled!==true;
  async function respond(decision:SourceMcpApprovalDecision,persist?:SourceMcpApprovalPersistence){
    const reply=sourceMcpApprovalReply(request,decision,persist);
    if(reply==null||onReply==null||submitting.current||phase==="submitted")return;
    submitting.current=true;
    // Once a response is dispatched, no menu items may remain navigable.
    setScopeMenuOpen(false);
    setPhase("submitting");setError(null);
    const current=generation.current;
    try{
      await onReply(request.requestId,reply,{
        hostId:request.hostId,conversationId:request.conversationId,
      });
      if(generation.current!==current)return;
      // Transport delivery is NOT permission approval. Wait for the host
      // to settle/remove this request via authoritative conversation state.
      setPhase("submitted");
    }catch(failure){
      if(generation.current!==current)return;
      submitting.current=false;
      setPhase("error");
      const backendUnavailable=failure instanceof Error&&
        failure.message.includes("MCP_BACKEND_UNAVAILABLE");
      setError(backendUnavailable
        ?"Unable to send response: MCP backend unavailable. No permission was changed."
        :"Unable to send response. Retry or contact the host.");
    }
  }
  React.useEffect(()=>{
    if(!scopeMenuOpen)return;
    const closeOutside=(event:PointerEvent)=>{
      if(event.target instanceof Node&&
        !scopeMenuRef.current?.contains(event.target)&&
        !portaledMenuRef.current?.contains(event.target))
        setScopeMenuOpen(false);
    };
    document.addEventListener("pointerdown",closeOutside);
    return ()=>document.removeEventListener("pointerdown",closeOutside);
  },[scopeMenuOpen]);
  const hasSessionScope=request.persist?.includes("session")===true&&
    request.approveDisabled!==true;
  const hasAlwaysScope=request.persist?.includes("always")===true&&
    request.approveDisabled!==true;
  const headerContent=<div className="codex-source-mcp-approval__header-inner"
    data-source-mcp-header-variant={highRisk?"elevated-risk":"connector"}>
    {highRisk
      ?<span className="codex-source-mcp-approval__risk">
        <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16"
          fill="none" stroke="currentColor" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.3 3.5a2 2 0 0 1 3.4 0l8 14A2 2 0 0 1 20 20.5H4a2 2 0 0 1-1.7-3z"/>
          <path d="M12 9v4.2M12 16.6h.01"/>
        </svg>
        Elevated Risk
      </span>
      :<span className="codex-source-mcp-approval__connector">{request.connectorName}</span>}
  </div>;
  const title=parsedTitle
    ?<>{parsedTitle.prefix}<span className="codex-source-mcp-approval__tool-name">
      {parsedTitle.toolName}</span>{parsedTitle.suffix}</>
    :request.title;
  const details=entries.length>0?<div className="codex-source-mcp-approval__params"
    data-source-mcp-parameter-count={entries.length}>
    {request.collapseToolParams?<button type="button" aria-expanded={expanded}
      onClick={()=>setExpanded(value=>!value)}>{expanded?"Hide details":"Show details"}</button>:null}
    {(!request.collapseToolParams||expanded)?<>
      {visible.map((entry,index)=>
        <Param key={entry.name+":"+index} entry={entry}
          expanded={expandedParams[entry.name+":"+index]===true}
          onToggle={()=>setExpandedParams(current=>({
            ...current,[entry.name+":"+index]:current[entry.name+":"+index]!==true,
          }))}/>)}
      {remaining>0?<button type="button" onClick={()=>setShowAll(true)}>
        Show {remaining} more items
      </button>:null}
      {showAll&&entries.length>SOURCE_MCP_INITIAL_PARAMETER_COUNT
        ?<button type="button" onClick={()=>setShowAll(false)}>Show fewer items</button>:null}
    </>:null}
  </div>:null;
  const status=<>
    {error?<p role="alert" className="codex-source-mcp-approval__error">{error}</p>:null}
    {phase==="submitting"?<p role="status">Submitting response to host…</p>:null}
    {phase==="submitted"?<p role="status">Response sent to host; awaiting request settlement.</p>:null}
    {onReply==null?<p className="codex-source-mcp-approval__readonly">
      No approval transport is connected. This request is read-only.
    </p>:null}
  </>;
  const closeMenu=(restoreFocus=true)=>{
    setScopeMenuOpen(false);
    if(restoreFocus)scopeTriggerRef.current?.focus();
  };
  const openMenu=(last=false)=>{
    pendingMenuFocusRef.current=last?1:0;
    setScopeMenuOpen(true);
  };
  const menuKeyDown=(event:React.KeyboardEvent<HTMLDivElement>)=>{
    if(event.key==="Escape"){
      event.preventDefault();event.stopPropagation();
      closeMenu();
      return;
    }
    if(event.key==="Tab"){
      // Do not trap keyboard users inside approval options. Let browser
      // tab order advance naturally, and dismiss the transient popover.
      closeMenu(false);
      return;
    }
    if(event.key==="ArrowDown"||event.key==="ArrowUp"||
      event.key==="Home"||event.key==="End"){
      event.preventDefault();event.stopPropagation();
      const buttons=[firstMenuItemRef.current,lastMenuItemRef.current]
        .filter((element):element is HTMLButtonElement=>element!=null&&!element.disabled);
      const active=buttons.findIndex(button=>button===document.activeElement);
      const next=nextSourceApprovalMenuIndex(
        event.key as SourceApprovalMenuMoveKey,active,buttons.length);
      if(next!=null)buttons[next]?.focus();
    }
  };
  const actions=<>
    {hasAlwaysScope?<button type="button"
      className="codex-source-mcp-approval__action codex-source-mcp-approval__action--leading"
      disabled={!canApprove} onClick={()=>{void respond("accept","always");}}>
      Always allow
    </button>:null}
    <div className="codex-source-mcp-approval__trailing">
      <button type="button" className="codex-source-mcp-approval__action"
        disabled={disabled} onClick={()=>{void respond("decline");}}>Deny</button>
      <div className="codex-source-mcp-approval__split" ref={scopeMenuRef}>
        <button type="submit"
          className="codex-source-mcp-approval__action codex-source-mcp-approval__action--primary"
          disabled={!canApprove}>Allow once</button>
        {hasSessionScope?<button type="button"
          ref={scopeTriggerRef}
          className="codex-source-mcp-approval__action codex-source-mcp-approval__action--dropdown"
          aria-label="Approval options" aria-haspopup="menu"
          aria-controls={scopeMenuOpen?scopeMenuId:undefined}
          aria-expanded={scopeMenuOpen} disabled={!canApprove}
          onClick={()=>{if(scopeMenuOpen)closeMenu();else openMenu();}}
          onKeyDown={event=>{
            if(event.key==="ArrowDown"||event.key==="ArrowUp"){
              event.preventDefault();
              openMenu(event.key==="ArrowUp");
            }
          }}>
          <span aria-hidden="true">⌄</span>
        </button>:null}
        {hasSessionScope&&scopeMenuOpen?<SourceApprovalDropdownPortal
          triggerRef={scopeTriggerRef}
          menuRef={portaledMenuRef}
          menuId={scopeMenuId}
          onKeyDown={menuKeyDown}
          onAnchorUnavailable={closeOffscreenMenu}
          onPositioned={focusPositionedMenu}>
          <button type="button" role="menuitem" ref={firstMenuItemRef}
            onClick={()=>{closeMenu(false);void respond("accept");}}>Allow once</button>
          <button type="button" role="menuitem" ref={lastMenuItemRef}
            onClick={()=>{closeMenu(false);void respond("accept","session");}}>
            Allow this conversation
          </button>
        </SourceApprovalDropdownPortal>:null}
      </div>
    </div>
  </>;
  return <SourceApprovalCardSurface
    requestId={request.requestId} phase={phase}
    headerContent={headerContent} title={title}
    subtitle={request.subtitle} reason={request.reason}
    details={details} status={status} actions={actions}
    onSubmit={event=>{
      event.preventDefault();
      void respond("accept");
    }}
  />;
}
