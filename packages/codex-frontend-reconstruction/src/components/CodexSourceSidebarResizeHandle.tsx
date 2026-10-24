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
  const drag=React.useRef<{kind:"mouse"|"pointer";pointerId?:number;startX:number;startWidth:number}|null>(null);
  const handleRef=React.useRef<HTMLDivElement|null>(null);
  const [resizing,setResizing]=React.useState(false);
  const maximum=sourceSidebarMaxWidth(availableWidth);
  const change=React.useCallback((value:number)=>
    onWidthChange(clampSourceSidebarWidth(value,availableWidth)),[onWidthChange,availableWidth]);
  const finish=React.useCallback((kind:"mouse"|"pointer",pointerId?:number)=>{
    const state=drag.current;
    if(state==null||state.kind!==kind ||
      (kind==="pointer"&&state.pointerId!==pointerId))return;
    drag.current=null;
    setResizing(false);
  },[]);
  React.useEffect(()=>{
    if(!resizing)return;
    const pointerMove=(event:PointerEvent)=>{
      const state=drag.current;
      if(state?.kind!=="pointer"||state.pointerId!==event.pointerId)return;
      event.preventDefault();
      change(state.startWidth+event.clientX-state.startX);
    };
    const pointerEnd=(event:PointerEvent)=>finish("pointer",event.pointerId);
    const mouseMove=(event:MouseEvent)=>{
      const state=drag.current;
      if(state?.kind!=="mouse")return;
      event.preventDefault();
      change(state.startWidth+event.clientX-state.startX);
    };
    const mouseEnd=()=>finish("mouse");
    window.addEventListener("pointermove",pointerMove);
    window.addEventListener("pointerup",pointerEnd);
    window.addEventListener("pointercancel",pointerEnd);
    window.addEventListener("mousemove",mouseMove);
    window.addEventListener("mouseup",mouseEnd);
    return ()=>{
      window.removeEventListener("pointermove",pointerMove);
      window.removeEventListener("pointerup",pointerEnd);
      window.removeEventListener("pointercancel",pointerEnd);
      window.removeEventListener("mousemove",mouseMove);
      window.removeEventListener("mouseup",mouseEnd);
    };
  },[resizing,change,finish]);
  return <div className="codex-source-sidebar-resizer"
    data-source-sidebar-resizer="" data-resizing={resizing}>
    <div className="codex-source-sidebar-resizer__handle"
      ref={handleRef} role="separator" aria-orientation="vertical" aria-label="调整会话侧边栏宽度"
      aria-valuemin={SOURCE_SIDEBAR_MIN_WIDTH} aria-valuemax={maximum}
      aria-valuenow={clampSourceSidebarWidth(width,availableWidth)}
      tabIndex={0}
      onMouseDown={event=>{
        if(event.button!==0)return;
        event.preventDefault();
        drag.current={kind:"mouse",startX:event.clientX,startWidth:width};
        setResizing(true);
      }}
      onMouseUp={()=>finish("mouse")}
      onPointerDown={event=>{
        if(event.pointerType==="mouse"||event.button!==0)return;
        event.preventDefault();
        drag.current={kind:"pointer",pointerId:event.pointerId,
          startX:event.clientX,startWidth:width};
        setResizing(true);
      }}
      onPointerUp={event=>finish("pointer",event.pointerId)}
      onPointerCancel={event=>finish("pointer",event.pointerId)}
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
