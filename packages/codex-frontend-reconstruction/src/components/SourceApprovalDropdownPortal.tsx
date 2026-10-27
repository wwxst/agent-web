import * as React from "react";
import {createPortal} from "react-dom";

export interface SourceApprovalDropdownPortalProps {
  triggerRef:React.RefObject<HTMLButtonElement|null>;
  menuRef:React.RefObject<HTMLDivElement|null>;
  menuId:string;
  onKeyDown:React.KeyboardEventHandler<HTMLDivElement>;
  onAnchorUnavailable:()=>void;
  children:React.ReactNode;
}

interface MenuPosition {
  top:number;
  left:number;
  maxHeight:number;
  placement:"top"|"bottom";
}
const VIEWPORT_MARGIN=8;
const TRIGGER_GAP=6;

/**
 * Independent equivalent of qbd/Mae's out-of-card dropdown layer.
 * Original KZu clips its own children; this menu lives outside it.
 * No generic Electron IPC, host approval callback or permission state here.
 */
export function SourceApprovalDropdownPortal({
  triggerRef,menuRef,menuId,onKeyDown,onAnchorUnavailable,children,
}:SourceApprovalDropdownPortalProps){
  const [position,setPosition]=React.useState<MenuPosition|null>(null);
  React.useLayoutEffect(()=>{
    const update=()=>{
      const trigger=triggerRef.current,menu=menuRef.current;
      if(trigger==null||menu==null||!trigger.isConnected)return;
      const rect=trigger.getBoundingClientRect();
      const viewportWidth=window.innerWidth,viewportHeight=window.innerHeight;
      // A virtualized/offscreen approval row should never leave a floating
      // authorization menu detached from its visible request.
      if(rect.bottom<=0||rect.top>=viewportHeight||rect.right<=0||
        rect.left>=viewportWidth){
        onAnchorUnavailable();
        return;
      }
      const width=menu.offsetWidth||204;
      const height=menu.scrollHeight||menu.offsetHeight||80;
      const below=Math.max(0,viewportHeight-rect.bottom-TRIGGER_GAP-VIEWPORT_MARGIN);
      const above=Math.max(0,rect.top-TRIGGER_GAP-VIEWPORT_MARGIN);
      const placement:MenuPosition["placement"]=
        below>=height||below>=above?"bottom":"top";
      const available=placement==="bottom"?below:above;
      const maxHeight=Math.max(0,available);
      const visibleHeight=Math.min(height,maxHeight);
      const left=Math.min(Math.max(VIEWPORT_MARGIN,rect.right-width),
        Math.max(VIEWPORT_MARGIN,viewportWidth-VIEWPORT_MARGIN-width));
      const top=placement==="top"
        ?Math.max(VIEWPORT_MARGIN,rect.top-TRIGGER_GAP-visibleHeight)
        :Math.min(viewportHeight-VIEWPORT_MARGIN,rect.bottom+TRIGGER_GAP);
      setPosition(previous=>previous?.top===top&&previous?.left===left&&
        previous.maxHeight===maxHeight&&previous.placement===placement
        ?previous:{top,left,maxHeight,placement});
    };
    update();
    // Capture nested transcript scroll as well as document scrolling.
    window.addEventListener("resize",update);
    document.addEventListener("scroll",update,true);
    return ()=>{
      window.removeEventListener("resize",update);
      document.removeEventListener("scroll",update,true);
    };
  },[triggerRef,menuRef,onAnchorUnavailable]);

  if(typeof document==="undefined")return null;
  return createPortal(<div
    ref={menuRef} id={menuId} role="menu" aria-label="Approval options"
    className="codex-source-mcp-approval__scope-menu"
    data-source-approval-menu-portal=""
    data-source-approval-menu-placement={position?.placement??"unmeasured"}
    onKeyDown={onKeyDown}
    style={position==null
      ?{visibility:"hidden",top:-10000,left:-10000}
      :{top:position.top,left:position.left,maxHeight:position.maxHeight}}
  >{children}</div>,document.body);
}
