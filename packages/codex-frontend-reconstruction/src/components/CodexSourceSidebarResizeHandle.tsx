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
 * or native window API. OnPointer* uses React pointer capture on one handle.
 */
export function CodexSourceSidebarResizeHandle({
  width,availableWidth,onWidthChange,
}:CodexSourceSidebarResizeHandleProps):React.ReactElement {
  const drag=React.useRef<{pointerId:number;startX:number;startWidth:number}|null>(null);
  const [resizing,setResizing]=React.useState(false);
  const maximum=sourceSidebarMaxWidth(availableWidth);
  const change=React.useCallback((value:number)=>
    onWidthChange(clampSourceSidebarWidth(value,availableWidth)),[onWidthChange,availableWidth]);
  const finish=React.useCallback((node:HTMLDivElement,pointerId:number)=>{
    if(drag.current?.pointerId!==pointerId)return;
    drag.current=null;
    setResizing(false);
    if(node.hasPointerCapture?.(pointerId))node.releasePointerCapture(pointerId);
  },[]);
  return <div className="codex-source-sidebar-resizer"
    data-source-sidebar-resizer="" data-resizing={resizing}>
    <div className="codex-source-sidebar-resizer__handle"
      role="separator" aria-orientation="vertical" aria-label="调整会话侧边栏宽度"
      aria-valuemin={SOURCE_SIDEBAR_MIN_WIDTH} aria-valuemax={maximum}
      aria-valuenow={clampSourceSidebarWidth(width,availableWidth)}
      tabIndex={0}
      onPointerDown={event=>{
        if(event.button!==0||drag.current)return;
        event.preventDefault();
        drag.current={pointerId:event.pointerId,startX:event.clientX,startWidth:width};
        event.currentTarget.setPointerCapture(event.pointerId);
        setResizing(true);
      }}
      onPointerMove={event=>{
        const state=drag.current;
        if(state?.pointerId!==event.pointerId)return;
        change(state.startWidth+event.clientX-state.startX);
      }}
      onPointerUp={event=>finish(event.currentTarget,event.pointerId)}
      onPointerCancel={event=>finish(event.currentTarget,event.pointerId)}
      onLostPointerCapture={event=>{
        if(drag.current?.pointerId===event.pointerId){drag.current=null;setResizing(false);}
      }}
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
