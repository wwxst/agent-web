import * as React from "react";
import {EditorState} from "@codemirror/state";
import {
  Decoration,EditorView,lineNumbers,ViewPlugin,
  type DecorationSet,type ViewUpdate,
} from "@codemirror/view";
import {javascript} from "@codemirror/lang-javascript";
import {python} from "@codemirror/lang-python";
import {css} from "@codemirror/lang-css";
import {html} from "@codemirror/lang-html";
import type {WorkspaceReadOnlyPreview} from "./WorkspaceReadOnlyPreviewPanel.js";

/**
 * Original text-file-editor-tab-content.electron-e71f710dc03c.js (Kr)
 * instantiates a CodeMirror EditorView with a readOnly compartment;
 * text-file-editor-extensions-d7a11bb2b948.js contributes lineWrapping.
 * This is an independent, strictly read-only adapter to the already
 * user-consented native workspace reader. No onChange or write IPC exists.
 */
function sourceLocalPreviewLanguage(name:string){
  const extension=name.split(".").pop()?.toLowerCase();
  if(extension==="tsx"||extension==="ts")
    return javascript({typescript:true,jsx:extension==="tsx"});
  if(extension==="jsx"||extension==="js"||extension==="mjs"||extension==="cjs")
    return javascript({jsx:extension==="jsx"});
  if(extension==="py")return python();
  if(extension==="css"||extension==="scss")return css();
  if(extension==="html"||extension==="xml")return html();
  return [];
}

/**
 * CodeMirror virtualizes off-screen lines. Build highlighted source line
 * decorations only for visible ranges, never one DOM node per selected line
 * for a 1 MiB text file whose requested endLine can be very large.
 */
function visibleSelectedLines(
  view:EditorView,line?:number,endLine?:number,
):DecorationSet {
  if(line==null||!Number.isSafeInteger(line)||line<1||
    line>view.state.doc.lines)return Decoration.none;
  const last=Math.min(
    view.state.doc.lines,Math.max(line,endLine??line));
  const ranges:{from:number;value:ReturnType<typeof Decoration.line>}[]=[];
  const decoration=Decoration.line({
    class:"demo-workspace-preview__selection",
    attributes:{"data-workspace-file-selected-range":"true"},
  });
  for(const span of view.visibleRanges){
    const from=view.state.doc.lineAt(span.from).number;
    const to=view.state.doc.lineAt(span.to).number;
    for(let n=Math.max(line,from);n<=Math.min(last,to);n++){
      ranges.push({from:view.state.doc.line(n).from,value:decoration});
    }
  }
  return ranges.length===0?Decoration.none:
    Decoration.set(ranges.map(entry=>entry.value.range(entry.from)),true);
}
export interface WorkspaceReadOnlyCodeMirrorProps {
  preview:WorkspaceReadOnlyPreview;
  active?:boolean;
  initialScrollTop?:number;
  onScrollTop?:(top:number)=>void;
}
export function WorkspaceReadOnlyCodeMirror({
  preview,active=true,initialScrollTop,onScrollTop,
}:WorkspaceReadOnlyCodeMirrorProps){
  const container=React.useRef<HTMLDivElement|null>(null);
  const viewRef=React.useRef<EditorView|null>(null);
  const onScrollTopRef=React.useRef(onScrollTop);
  onScrollTopRef.current=onScrollTop;
  const lastLocationRequestIdRef=React.useRef(preview.locationRequestId);
  React.useLayoutEffect(()=>{
    const locationRequestChanged=
      lastLocationRequestIdRef.current!==preview.locationRequestId;
    lastLocationRequestIdRef.current=preview.locationRequestId;
    const parent=container.current;
    if(parent==null)return;
    const selectedLines=ViewPlugin.fromClass(class{
      decorations:DecorationSet;
      constructor(view:EditorView){
        this.decorations=visibleSelectedLines(view,preview.line,preview.endLine);
      }
      update(update:ViewUpdate){
        if(update.viewportChanged||update.docChanged)
          this.decorations=visibleSelectedLines(
            update.view,preview.line,preview.endLine);
      }
    },{decorations:plugin=>plugin.decorations});
    const view=new EditorView({
      parent,doc:preview.text,
      extensions:[
        EditorState.readOnly.of(true),
        EditorView.editable.of(false),
        EditorView.lineWrapping,
        lineNumbers(),
        sourceLocalPreviewLanguage(preview.name),
        selectedLines,
        EditorView.theme({
          "&":{height:"100%",fontSize:"12px",
            color:"var(--demo-text, #242424)"},
          ".cm-scroller":{overflow:"auto",fontFamily:
            "ui-monospace, SFMono-Regular, Consolas, monospace",
            lineHeight:"18px"},
          ".cm-content":{minWidth:"0",padding:"12px 8px",caretColor:"transparent"},
          ".cm-gutters":{backgroundColor:"var(--demo-panel, #fff)",
            borderRight:"1px solid var(--demo-border, #e7e7e7)",
            color:"var(--demo-muted, #888)",paddingLeft:"5px"},
          ".cm-lineNumbers .cm-gutterElement":{padding:"0 8px 0 4px"},
          ".cm-activeLine":{backgroundColor:"transparent"},
          ".cm-focused":{outline:"none"},
        }),
      ],
    });
    viewRef.current=view;
    view.contentDOM.setAttribute("aria-label",preview.name+" read-only source");
    view.contentDOM.setAttribute("tabindex","0");
    const onScroll=()=>onScrollTopRef.current?.(view.scrollDOM.scrollTop);
    view.scrollDOM.addEventListener("scroll",onScroll,{passive:true});
    const frame=requestAnimationFrame(()=>{
      // Original onOpenLocation passes one-based line/column and sets
      // resetTabState=true. That navigation must win over a stale saved
      // scroll offset; ordinary tab switches still restore their own offset.
      const hasLocation=preview.line!=null&&
        Number.isSafeInteger(preview.line)&&preview.line>=1;
      if(hasLocation&&
        (locationRequestChanged||preview.resetTabState||initialScrollTop==null)){
        const lineNumber=Math.min(preview.line!,view.state.doc.lines);
        const target=view.state.doc.line(lineNumber);
        const column=preview.column!=null&&Number.isSafeInteger(preview.column)&&
          preview.column>=1?Math.min(preview.column-1,target.length):0;
        const position=target.from+column;
        view.dispatch({
          selection:{anchor:position},
          effects:EditorView.scrollIntoView(position,{y:"center"}),
        });
      }else if(initialScrollTop!=null&&!preview.resetTabState){
        // A tab switch is not a new location request: restore that tab's
        // scroll snapshot instead of repeatedly jumping to its initial line.
        view.scrollDOM.scrollTop=initialScrollTop;
      }else if(preview.resetTabState){
        view.scrollDOM.scrollTop=0;
      }
    });
    return ()=>{
      cancelAnimationFrame(frame);
      view.scrollDOM.removeEventListener("scroll",onScroll);
      if(viewRef.current===view)viewRef.current=null;
      view.destroy();
    };
  },[preview.name,preview.text,preview.line,preview.endLine,preview.column,
    preview.resetTabState,preview.locationRequestId]);
  // Keep this tab's EditorView mounted while another tab is active. CodeMirror
  // owns selection, scroll and viewport state; remeasure after a hidden view
  // becomes visible instead of rebuilding it from a scroll-only snapshot.
  React.useLayoutEffect(()=>{
    if(!active)return;
    viewRef.current?.requestMeasure();
  },[active]);
  return <div ref={container}
    hidden={!active}
    aria-hidden={!active}
    className="demo-workspace-preview__codemirror"
    data-workspace-file-text={active?"":undefined}
    data-source-workspace-codemirror={active?"read-only":undefined}
    aria-label={active?"Read-only file source":undefined}/>;
}
