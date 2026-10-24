import * as React from "react";
import {
  clampSourceSidebarWidth,sourceSidebarMaxWidth,sourceSidebarWidthFromKey,
  SOURCE_SIDEBAR_DEFAULT_WIDTH,SOURCE_SIDEBAR_MIN_WIDTH,
} from "../conversation/SourceSidebarResizeModel.js";
import "./codexSourceSidebarResizeHandle.css";

export interface CodexSourceSidebarResizeHandleProps {
  width:number;
  availableWidth:number;
  onWidthChange:(nextWidth:number)=>void;
}
/**
 * Original sbi/cbi/lbi front-end resizer subset. No private store persistence
 * or native window API. Source sbi listens for active pointer movement on window.
 */
export function CodexSourceSidebarResizeHandle({
  width,availableWidth,onWidthChange,
}:CodexSourceSidebarResizeHandleProps):React.ReactElement {
  const drag=React.useRef<{pointerId:number;startX:number;startWidth:number}|null>(null);
  const handleRef=React.useRef<HTMLDivElement|null>(null);
  const [resizing,setResizing]=React.useState(false);
  const maximum=sourceSidebarMaxWidth(availableWidth);
  const change=React.useCallback((value:number)=>
    onWidthChange(clampSourceSidebarWidth(value,availableWidth)),[onWidthChange,availableWidth]);
  const finish=React.useCallback((pointerId:number)=>{
    if(drag.current?.pointerId!==pointerId)return;
    drag.current=null;
    setResizing(false);
    const node=handleRef.current;
    if(node?.hasPointerCapture?.(pointerId))node.releasePointerCapture(pointerId);
  },[]);
  React.useEffect(()=>{
    if(!resizing)return;
    const move=(event:PointerEvent)=>{
      const state=drag.current;
      if(state?.pointerId!==event.pointerId)return;
      event.preventDefault();
      change(state.startWidth+event.clientX-state.startX);
    };
    const end=(event:PointerEvent)=>finish(event.pointerId);
    window.addEventListener("pointermove",move);
    window.addEventListener("pointerup",end);
    window.addEventListener("pointercancel",end);
    return ()=>{
      window.removeEventListener("pointermove",move);
      window.removeEventListener("pointerup",end);
      window.removeEventListener("pointercancel",end);
    };
  },[resizing,change,finish]);
  return <div className="codex-source-sidebar-resizer"
    data-source-sidebar-resizer="" data-resizing={resizing}>
    <div className="codex-source-sidebar-resizer__handle"
      ref={handleRef} role="separator" aria-orientation="vertical" aria-label="调整会话侧边栏宽度"
      aria-valuemin={SOURCE_SIDEBAR_MIN_WIDTH} aria-valuemax={maximum}
      aria-valuenow={clampSourceSidebarWidth(width,availableWidth)}
      tabIndex={0}
      onPointerDown={event=>{
        if(event.button!==0)return;
        event.preventDefault();
        drag.current={pointerId:event.pointerId,startX:event.clientX,startWidth:width};
        setResizing(true);
        // The original sbi tracks pointer movement at window level.
        // Capturing a zero-width boundary child can deliver an immediate
        // pointercancel when a browser relayouts that hit target on mouse-down.
        // Keep the hit region stable and rely on the global listeners.
      }}
      onPointerUp={event=>finish(event.pointerId)}
      onPointerCancel={event=>finish(event.pointerId)}
      onKeyDown={event=>{
        const next=sourceSidebarWidthFromKey(width,event.key,availableWidth);
        if(next===null)return;
        event.preventDefault();
        event.stopPropagation();
        change(next);
      }}
      onDoubleClick={event=>{
        event.preventDefault();
        change(SOURCE_SIDEBAR_DEFAULT_WIDTH);
      }}
    />
  </div>;
}
