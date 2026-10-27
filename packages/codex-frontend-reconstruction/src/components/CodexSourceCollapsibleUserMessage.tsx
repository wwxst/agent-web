import * as React from "react";
import {flushSync} from "react-dom";
import {
  SOURCE_USER_MESSAGE_COLLAPSED_LINES,
  shouldCollapseSourceUserMessage,
  sourceUserMessageVisibleText,
  isSourceUserMessageFindTarget,
} from "../conversation/SourceCollapsibleUserMessageModel.js";

const FOCUSABLE =
  'a[href],area[href],button,input,select,textarea,summary,audio[controls],video[controls],iframe,[contenteditable]:not([contenteditable="false"]),[tabindex]:not([tabindex="-1"])';

/** Source _u registers a reveal callback for search matches in folded text.
 * The independent Find host dispatches this event only to the exact
 * canonical virtualized user message. */
export const SOURCE_USER_MESSAGE_FIND_REVEAL_EVENT = "codex-source-user-message-find-reveal";
export interface SourceUserMessageFindRevealDetail {
  query:string;
  sourceOffset:number;
  sourceLength:number;
}
type HiddenFocusState={inert:boolean;ariaHidden:string|null};

export interface CodexSourceCollapsibleUserMessageProps {
  text:string;
  children:(text:string)=>React.ReactNode;
  collapsedLineCount?:number;
  collapseIndicator?:"ellipsis"|"fade";
  isAeonFormatted?:boolean;
}

/** The original user-message yt -> collapsible C:
 * - 20 rendered lines by default; 512-char/line upper bound before clipping
 * - aria-expanded and Show more / Show less
 * - clipped links and controls inert/aria-hidden while collapsed
 * - beforeprint forces full text, afterprint restores previous disclosure.
 * Does not reproduce private DE text-measurement/search registration.
 */
export function CodexSourceCollapsibleUserMessage({
  text,children,collapsedLineCount=SOURCE_USER_MESSAGE_COLLAPSED_LINES,
  collapseIndicator="ellipsis",isAeonFormatted=false,
}:CodexSourceCollapsibleUserMessageProps){
  const viewportRef=React.useRef<HTMLDivElement|null>(null);
  const rootRef=React.useRef<HTMLDivElement|null>(null);
  const previousFocusable=React.useRef(new Map<Element,HiddenFocusState>());
  const [renderedHeight,setRenderedHeight]=React.useState(0);
  const [lineHeight,setLineHeight]=React.useState(0);
  const [expanded,setExpanded]=React.useState(false);
  const [printing,setPrinting]=React.useState(false);
  // Forced prefixed render is an original explicit >20*512 branch, not a
  // guessed approximate character/word count.
  const collapsible=shouldCollapseSourceUserMessage({
    textLength:text.length,renderedContentHeightPx:renderedHeight,
    lineHeightPx:lineHeight,collapsedLines:collapsedLineCount,
  });
  const collapsed=collapsible&&!expanded&&!printing;
  const shownText=sourceUserMessageVisibleText(text,collapsed,collapsedLineCount);
  // The private _u highlighter registers {text, isTruncated, reveal}.
  // Here the same source message owns the reveal action, while the existing
  // demo Find service still owns the search index and CSS highlight.
  React.useLayoutEffect(()=>{
    const root=rootRef.current;
    if(root==null)return;
    const reveal=(event:Event)=>{
      if(!(event instanceof CustomEvent))return;
      const detail=event.detail as SourceUserMessageFindRevealDetail|null;
      if(detail==null || !isSourceUserMessageFindTarget({
        text,query:detail.query,sourceOffset:detail.sourceOffset,
        sourceLength:detail.sourceLength,
      }))return;
      if(collapsed){
        // Ensure React's real Markdown (and all focusability state) updates
        // before the host attempts to highlight the selected DOM range.
        flushSync(()=>setExpanded(true));
      }
      // Explicit acknowledgement; don't mark an unrelated message as handled.
      event.preventDefault();
    };
    root.addEventListener(SOURCE_USER_MESSAGE_FIND_REVEAL_EVENT,reveal);
    return ()=>root.removeEventListener(SOURCE_USER_MESSAGE_FIND_REVEAL_EVENT,reveal);
  },[text,collapsed]);
  const visibleLines=collapsedLineCount-
    Number(collapsed&&collapseIndicator==="ellipsis"&&collapsedLineCount>2);
  React.useLayoutEffect(()=>{
    const viewport=viewportRef.current;
    const child=viewport?.firstElementChild;
    if(!(viewport instanceof HTMLElement)||!(child instanceof HTMLElement))return;
    const measure=()=>{
      const style=getComputedStyle(viewport);
      const parsed=parseFloat(style.lineHeight);
      const lh=Number.isFinite(parsed)&&parsed>0?parsed:
        (parseFloat(style.fontSize)||13)*1.65;
      setLineHeight(old=>Math.abs(old-lh)>0.1?lh:old);
      // A clipped host viewport must not be used as the measured height.
      const next=Math.ceil(child.getBoundingClientRect().height);
      setRenderedHeight(old=>old!==next?next:old);
    };
    measure();
    const resize=typeof ResizeObserver==="undefined"?null:new ResizeObserver(measure);
    resize?.observe(child);
    const mutation=new MutationObserver(measure);
    mutation.observe(child,{childList:true,subtree:true,characterData:true});
    return ()=>{resize?.disconnect();mutation.disconnect();};
  },[shownText]);

  React.useEffect(()=>{
    const before=()=>{
      flushSync(()=>setPrinting(true));
    };
    const after=()=>flushSync(()=>setPrinting(false));
    window.addEventListener("beforeprint",before);
    window.addEventListener("afterprint",after);
    return ()=>{
      window.removeEventListener("beforeprint",before);
      window.removeEventListener("afterprint",after);
    };
  },[expanded]);

  // Source C hides interactive descendants outside the clipped viewport.
  React.useLayoutEffect(()=>{
    const viewport=viewportRef.current;
    if(viewport==null)return;
    const original=previousFocusable.current;
    const restore=(node:Element,state:HiddenFocusState)=>{
      (node as HTMLElement).inert=state.inert;
      if(state.ariaHidden==null)node.removeAttribute("aria-hidden");
      else node.setAttribute("aria-hidden",state.ariaHidden);
    };
    if(!collapsed){
      for(const [node,state] of original)restore(node,state);
      original.clear();
      return;
    }
    const update=()=>{
      const clip=viewport.getBoundingClientRect();
      const focusables=viewport.querySelectorAll<HTMLElement>(FOCUSABLE);
      const active=new Set(focusables);
      for(const [node,state] of original){
        if(!active.has(node as HTMLElement)){restore(node,state);original.delete(node);}
      }
      for(const node of focusables){
        const rect=node.getBoundingClientRect();
        const visible=rect.top>=clip.top&&rect.right<=clip.right&&
          rect.bottom<=clip.bottom&&rect.left>=clip.left;
        if(!visible){
          if(!original.has(node))original.set(node,{
            inert:node.inert,ariaHidden:node.getAttribute("aria-hidden"),
          });
          node.inert=true;
          node.setAttribute("aria-hidden","true");
        }else{
          const previous=original.get(node);
          if(previous!=null){restore(node,previous);original.delete(node);}
        }
      }
    };
    update();
    const observer=typeof IntersectionObserver==="undefined"?null:
      new IntersectionObserver(update,{root:viewport,threshold:[0,1]});
    const track=()=>{
      observer?.disconnect();
      for(const node of viewport.querySelectorAll(FOCUSABLE))observer?.observe(node);
      update();
    };
    const mutation=new MutationObserver(track);
    mutation.observe(viewport,{childList:true,subtree:true});
    const resize=typeof ResizeObserver==="undefined"?null:new ResizeObserver(update);
    resize?.observe(viewport);
    track();
    return ()=>{
      observer?.disconnect();mutation.disconnect();resize?.disconnect();
      for(const [node,state] of original)restore(node,state);
      original.clear();
    };
  },[collapsed,shownText]);

  return <div ref={rootRef} className="codex-source-user-message-content"
    data-source-user-message-collapsible={collapsible?"true":"false"}
    data-source-user-message-expanded={!collapsed?"true":"false"}>
    <div className="codex-source-user-message-content__viewport"
      ref={viewportRef}
      data-source-user-message-viewport=""
      data-source-user-message-truncated={collapsed?"true":"false"}
      style={collapsed?{maxHeight:`${visibleLines}lh`,overflow:"hidden",
        ...(collapseIndicator==="fade"?{maskImage:"linear-gradient(to bottom,black 80%,transparent)"}:{})}:undefined}>
      <div className="codex-source-user-message-content__text">
        {children(shownText)}
      </div>
    </div>
    {collapsed&&collapseIndicator==="ellipsis"&&collapsedLineCount>2?
      <span className="codex-source-user-message-content__ellipsis"
        aria-hidden="true">…</span>:null}
    {!printing&&collapsible?<button type="button"
      className="codex-source-user-message-content__toggle"
      aria-expanded={!collapsed}
      data-thread-find-skip="true"
      data-markdown-copy="exclude"
      onClick={()=>setExpanded(value=>!value)}>
      {collapsed?"Show more":"Show less"}
      <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"
        className={!collapsed?"codex-source-user-message-content__up":undefined}>
        <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>:null}
  </div>;
}
