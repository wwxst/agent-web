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
import {
  SOURCE_LANGUAGE_LOCATION_KINDS,
  sourceLanguageCapabilities,
  sourceLanguageIdForPath,
  sourceLanguageLocationIsWithinRoot,
  sourceLanguageLocations,
  sourceRelativeLanguageLocationPath,
  type SourceLanguageCapabilities,
  type SourceLanguageLocation,
  type SourceLanguageLocationKind,
  type SourceLanguagePosition,
} from "../src/conversation/SourceLanguageNavigationModel.js";

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

type SourceLanguageContextMenuState={
  left:number;top:number;position:SourceLanguagePosition;
};
type SourceLanguageLocationListState={
  kind:SourceLanguageLocationKind;left:number;top:number;loading:boolean;
  locations:SourceLanguageLocation[];visibleCount:number;
};
function sourceLanguageActionLabel(kind:SourceLanguageLocationKind):string{
  switch(kind){
    case "definition":return "Go to Definition";
    case "typeDefinition":return "Go to Type Definition";
    case "implementation":return "Go to Implementations";
    case "references":return "Go to References";
  }
}
function sourceLanguageLocationsTitle(
  kind:SourceLanguageLocationKind,count:number,
):string{
  const label=kind==="definition"?"definition":
    kind==="typeDefinition"?"type definition":
    kind==="implementation"?"implementation":"reference";
  return `${count} ${label}${count===1?"":"s"}`;
}
function sourceLanguagePositionAt(
  view:EditorView,event:MouseEvent,
):SourceLanguagePosition|null{
  const offset=view.posAtCoords({x:event.clientX,y:event.clientY});
  if(offset==null)return null;
  const line=view.state.doc.lineAt(offset);
  return {line:line.number-1,character:offset-line.from};
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
function positionReadOnlyEditor(
  view:EditorView,
  preview:WorkspaceReadOnlyPreview,
  initialScrollTop:number|undefined,
  locationRequestChanged:boolean,
):void {
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
    view.scrollDOM.scrollTop=initialScrollTop;
  }else if(preview.resetTabState){
    view.scrollDOM.scrollTop=0;
  }
}

export interface WorkspaceReadOnlyCodeMirrorProps {
  preview:WorkspaceReadOnlyPreview;
  /** Absolute path is only a lookup key; native host still checks its grant. */
  path:string;
  /** Renderer-derived display root, never treated as filesystem authority. */
  workspaceRoot:string|null;
  onOpenLocation:(location:SourceLanguageLocation)=>void;
  active?:boolean;
  initialScrollTop?:number;
  onScrollTop?:(top:number)=>void;
}
export function WorkspaceReadOnlyCodeMirror({
  preview,path,workspaceRoot,onOpenLocation,
  active=true,initialScrollTop,onScrollTop,
}:WorkspaceReadOnlyCodeMirrorProps){
  const surfaceRef=React.useRef<HTMLDivElement|null>(null);
  const container=React.useRef<HTMLDivElement|null>(null);
  const viewRef=React.useRef<EditorView|null>(null);
  const onScrollTopRef=React.useRef(onScrollTop);
  onScrollTopRef.current=onScrollTop;
  const activeRef=React.useRef(active);
  activeRef.current=active;
  const previewRef=React.useRef(preview);
  previewRef.current=preview;
  const [capabilities,setCapabilities]=React.useState<SourceLanguageCapabilities|null>(null);
  const [contextMenu,setContextMenu]=React.useState<SourceLanguageContextMenuState|null>(null);
  const [locationList,setLocationList]=React.useState<SourceLanguageLocationListState|null>(null);
  const locationRequestIdRef=React.useRef(0);
  const pathRef=React.useRef(path);
  pathRef.current=path;
  const workspaceRootRef=React.useRef(workspaceRoot);
  workspaceRootRef.current=workspaceRoot;
  const languageIdRef=React.useRef(sourceLanguageIdForPath(path));
  languageIdRef.current=sourceLanguageIdForPath(path);
  const capabilitiesRef=React.useRef(capabilities);
  capabilitiesRef.current=capabilities;
  const onOpenLocationRef=React.useRef(onOpenLocation);
  onOpenLocationRef.current=onOpenLocation;
  const pendingPositionRef=React.useRef<{
    initialScrollTop:number|undefined;locationRequestChanged:boolean;
  }|null>(null);
  const lastLocationRequestIdRef=React.useRef(preview.locationRequestId);
  const requestLocations=React.useCallback(async(
    kind:SourceLanguageLocationKind,
    position:SourceLanguagePosition,
    anchor:{left:number;top:number},
  )=>{
    const host=window.agentWebDesktopHost;
    const activePath=pathRef.current;
    const languageId=languageIdRef.current;
    const root=workspaceRootRef.current;
    if(host?.getWorkspaceLanguageLocations==null||activePath===""||
      languageId==null||root==null||
      !capabilitiesRef.current?.locationKinds.includes(kind))return;
    const requestId=++locationRequestIdRef.current;
    setContextMenu(null);
    setLocationList({kind,left:anchor.left,top:anchor.top,loading:true,
      locations:[],visibleCount:100});
    try{
      const raw=await host.getWorkspaceLanguageLocations({
        path:activePath,languageId,kind,position,
      });
      if(locationRequestIdRef.current!==requestId)return;
      // Even a buggy provider must not turn a symbol result into access to a
      // path outside the directory the user explicitly granted.
      const locations=sourceLanguageLocations(raw).filter(location=>
        sourceLanguageLocationIsWithinRoot(location.path,root));
      if(locations.length===1){
        setLocationList(null);
        onOpenLocationRef.current(locations[0]!);
      }else if(locations.length>1){
        setLocationList({kind,left:anchor.left,top:anchor.top,loading:false,
          locations,visibleCount:100});
      }else setLocationList(null);
    }catch{
      if(locationRequestIdRef.current===requestId)setLocationList(null);
    }
  },[]);
  const requestLocationsRef=React.useRef(requestLocations);
  requestLocationsRef.current=requestLocations;
  const languageId=sourceLanguageIdForPath(path);
  React.useEffect(()=>{
    const host=window.agentWebDesktopHost;
    if(!active||path===""||workspaceRoot==null||languageId==null||
      host?.getWorkspaceLanguageCapabilities==null||
      host.getWorkspaceLanguageLocations==null){
      setCapabilities(null);
      setContextMenu(null);
      setLocationList(null);
      return;
    }
    let current=true;
    setCapabilities(null);
    void host.getWorkspaceLanguageCapabilities({path,languageId}).then(value=>{
      if(current)setCapabilities(sourceLanguageCapabilities(value));
    }).catch(()=>{if(current)setCapabilities(null);});
    return ()=>{current=false;};
  },[active,path,workspaceRoot,languageId]);
  React.useEffect(()=>{
    if(active)return;
    locationRequestIdRef.current++;
    setContextMenu(null);
    setLocationList(null);
  },[active]);
  React.useEffect(()=>{
    if(contextMenu==null&&locationList==null)return;
    const onPointerDown=(event:PointerEvent)=>{
      const target=event.target;
      if(target instanceof Element&&target.closest(
        "[data-source-language-menu],[data-source-language-locations]"))return;
      locationRequestIdRef.current++;
      setContextMenu(null);
      setLocationList(null);
    };
    const onKeyDown=(event:KeyboardEvent)=>{
      if(event.key!=="Escape")return;
      event.preventDefault();
      locationRequestIdRef.current++;
      setContextMenu(null);
      setLocationList(null);
    };
    document.addEventListener("pointerdown",onPointerDown);
    document.addEventListener("keydown",onKeyDown);
    return ()=>{
      document.removeEventListener("pointerdown",onPointerDown);
      document.removeEventListener("keydown",onKeyDown);
    };
  },[contextMenu,locationList]);
  React.useLayoutEffect(()=>{
    const parent=container.current;
    if(parent==null)return;
    const selectedLines=ViewPlugin.fromClass(class{
      decorations:DecorationSet;
      line:number|undefined;
      endLine:number|undefined;
      constructor(view:EditorView){
        const current=previewRef.current;
        this.line=current.line;this.endLine=current.endLine;
        this.decorations=visibleSelectedLines(view,this.line,this.endLine);
      }
      update(update:ViewUpdate){
        const current=previewRef.current;
        if(update.viewportChanged||update.docChanged||
          this.line!==current.line||this.endLine!==current.endLine){
          this.line=current.line;this.endLine=current.endLine;
          this.decorations=visibleSelectedLines(
            update.view,this.line,this.endLine);
        }
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
        EditorView.domEventHandlers({
          mousedown:(event,view)=>{
            if(!activeRef.current||!(event.metaKey||event.ctrlKey)||event.button!==0)
              return false;
            if(!capabilitiesRef.current?.locationKinds.includes("definition"))
              return false;
            const position=sourceLanguagePositionAt(view,event);
            const bounds=surfaceRef.current?.getBoundingClientRect();
            if(position==null||bounds==null)return false;
            event.preventDefault();
            requestLocationsRef.current("definition",position,{
              left:Math.max(4,Math.min(event.clientX-bounds.left,bounds.width-240)),
              top:Math.max(4,Math.min(event.clientY-bounds.top+10,bounds.height-180)),
            });
            return true;
          },
          contextmenu:(event,view)=>{
            if(!activeRef.current)return false;
            // Ctrl/Cmd-click is a navigation gesture, not a second context menu.
            if(event.metaKey||event.ctrlKey){event.preventDefault();return true;}
            const available=capabilitiesRef.current;
            if(available==null||available.locationKinds.length===0)return false;
            const position=sourceLanguagePositionAt(view,event);
            const bounds=surfaceRef.current?.getBoundingClientRect();
            if(position==null||bounds==null)return false;
            event.preventDefault();
            locationRequestIdRef.current++;
            setLocationList(null);
            setContextMenu({
              left:Math.max(4,Math.min(event.clientX-bounds.left,bounds.width-240)),
              top:Math.max(4,Math.min(event.clientY-bounds.top,bounds.height-180)),
              position,
            });
            return true;
          },
        }),
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
      // Initial mount restores this tab's saved view; a first location open
      // without a saved snapshot reveals its line. New navigations are handled
      // separately so they never require destroying this EditorView.
      const current=previewRef.current;
      if(activeRef.current){
        positionReadOnlyEditor(view,current,initialScrollTop,false);
      }else{
        pendingPositionRef.current={initialScrollTop,locationRequestChanged:false};
      }
    });
    return ()=>{
      cancelAnimationFrame(frame);
      pendingPositionRef.current=null;
      view.scrollDOM.removeEventListener("scroll",onScroll);
      if(viewRef.current===view)viewRef.current=null;
      view.destroy();
    };
  },[preview.name,preview.text]);
  // A source onOpenLocation is a new selection/scroll request on the same tab,
  // not a reason to recreate CodeMirror's private EditorView. Keep the existing
  // view, update visible line decorations through its transaction, and defer
  // navigation when the tab is hidden.
  React.useLayoutEffect(()=>{
    const locationRequestChanged=
      lastLocationRequestIdRef.current!==preview.locationRequestId;
    lastLocationRequestIdRef.current=preview.locationRequestId;
    if(!locationRequestChanged&&!preview.resetTabState)return;
    const view=viewRef.current;
    if(view==null)return;
    const shouldReveal=locationRequestChanged||preview.resetTabState===true;
    if(activeRef.current){
      positionReadOnlyEditor(view,preview,undefined,shouldReveal);
    }else{
      pendingPositionRef.current={
        initialScrollTop:undefined,locationRequestChanged:shouldReveal,
      };
    }
  },[preview.line,preview.endLine,preview.column,preview.resetTabState,
    preview.locationRequestId]);
  // Keep this tab's EditorView mounted while another tab is active. CodeMirror
  // owns selection, scroll and viewport state; remeasure after a hidden view
  // becomes visible instead of rebuilding it from a scroll-only snapshot.
  React.useLayoutEffect(()=>{
    if(!active)return;
    const view=viewRef.current;
    if(view==null)return;
    view.requestMeasure();
    const pending=pendingPositionRef.current;
    if(pending!=null){
      pendingPositionRef.current=null;
      positionReadOnlyEditor(view,previewRef.current,
        pending.initialScrollTop,pending.locationRequestChanged);
    }
  },[active]);
  return <div ref={surfaceRef}
    hidden={!active}
    className="demo-workspace-preview__language-surface"
    data-source-language-surface="">
    <div ref={container}
      aria-hidden={!active}
      className="demo-workspace-preview__codemirror"
      data-workspace-file-text={active?"":undefined}
      data-source-workspace-codemirror={active?"read-only":undefined}
      aria-label={active?"Read-only file source":undefined}/>
    {active&&contextMenu!=null&&capabilities!=null?
      <div role="menu" aria-label="Source language navigation"
        data-source-language-menu=""
        className="demo-source-language__menu"
        style={{left:contextMenu.left,top:contextMenu.top}}
        onPointerDown={event=>event.stopPropagation()}>
        {SOURCE_LANGUAGE_LOCATION_KINDS.filter(kind=>
          capabilities.locationKinds.includes(kind)).map(kind=>
          <button key={kind} type="button" role="menuitem"
            onClick={()=>{
              const current=contextMenu;
              setContextMenu(null);
              void requestLocations(kind,current.position,{
                left:current.left,top:current.top+8,
              });
            }}>{sourceLanguageActionLabel(kind)}</button>)}
      </div>:null}
    {active&&locationList!=null?
      <div role="dialog"
        aria-label={sourceLanguageLocationsTitle(locationList.kind,locationList.locations.length)}
        data-source-language-locations=""
        className="demo-source-language__locations"
        style={{left:locationList.left,top:locationList.top}}
        onPointerDown={event=>event.stopPropagation()}>
        <header>
          <span>{locationList.loading?"Loading locations…":
            sourceLanguageLocationsTitle(locationList.kind,locationList.locations.length)}</span>
          <button type="button" aria-label="Close locations"
            onClick={()=>{
              locationRequestIdRef.current++;
              setLocationList(null);
            }}>×</button>
        </header>
        {locationList.loading?
          <p role="status">Loading locations…</p>:
          <div className="demo-source-language__location-items">
            {locationList.locations.slice(0,locationList.visibleCount).map((location,index)=>{
              const relativePath=sourceRelativeLanguageLocationPath(
                location.path,workspaceRoot??"");
              const line=location.range.start.line+1;
              const column=location.range.start.character+1;
              return <button key={`${location.path}:${line}:${column}:${index}`}
                type="button"
                aria-label={`Open ${relativePath}, line ${line}, column ${column}`}
                onClick={()=>{
                  locationRequestIdRef.current++;
                  setLocationList(null);
                  onOpenLocationRef.current(location);
                }}>
                <span>{relativePath}</span><small>{line}:{column}</small>
              </button>;
            })}
            {locationList.visibleCount<locationList.locations.length?
              <button type="button" className="demo-source-language__load-more"
                onClick={()=>setLocationList(current=>current==null?current:{
                  ...current,visibleCount:current.visibleCount+100,
                })}>Load more locations</button>:null}
          </div>}
      </div>:null}
  </div>;
}
