import * as React from "react";

type TreeEntry={name:string;relativePath:string;kind:"directory"|"file"};
type Listing={entries:readonly TreeEntry[];truncated:boolean};
type TreeRow=TreeEntry&{depth:number;expanded?:boolean};

/** Original Un/Wn requests directory contents for its expandedPaths. This
 * fallback uses only the explicitly granted native folder and exposes no
 * host root paths or recursive crawler. */
export function WorkspaceGrantedDirectoryTree({
  visible,activeRelativePath,onOpenFile,
}:{
  visible:boolean;activeRelativePath:string;
  /** Single-click opens an XL preview; double-click opens a kept tab. */
  onOpenFile:(relativePath:string,isPreview?:boolean)=>void;
}){
  const [loaded,setLoaded]=React.useState<ReadonlyMap<string,Listing>>(new Map());
  const [pending,setPending]=React.useState<ReadonlySet<string>>(new Set());
  const [errors,setErrors]=React.useState<ReadonlySet<string>>(new Set());
  const [expanded,setExpanded]=React.useState<ReadonlySet<string>>(new Set());
  const [query,setQuery]=React.useState("");
  const [refreshKey,setRefreshKey]=React.useState(0);
  const [searchResult,setSearchResult]=React.useState<{
    files:readonly {name:string;relativePath:string}[];
    truncated:boolean;scannedDirectories:number;
  }|null>(null);
  const [searching,setSearching]=React.useState(false);
  const [searchError,setSearchError]=React.useState(false);
  const searchCallback=window.agentWebDesktopHost?.searchWorkspaceFiles;
  const searchEnabled=searchCallback!=null;
  const treeRef=React.useRef<HTMLDivElement|null>(null);
  const onOpenFileRef=React.useRef(onOpenFile);
  onOpenFileRef.current=onOpenFile;
  const pendingFileOpenRef=React.useRef<{timer:number;relativePath:string}|null>(null);
  const cancelPendingFileOpen=React.useCallback(()=>{
    const pending=pendingFileOpenRef.current;
    if(pending!=null)window.clearTimeout(pending.timer);
    pendingFileOpenRef.current=null;
  },[]);
  const schedulePreviewOpen=React.useCallback((relativePath:string)=>{
    cancelPendingFileOpen();
    const timer=window.setTimeout(()=>{
      pendingFileOpenRef.current=null;
      onOpenFileRef.current(relativePath,true);
    },250);
    pendingFileOpenRef.current={timer,relativePath};
  },[cancelPendingFileOpen]);
  const openPinnedFile=React.useCallback((relativePath:string)=>{
    cancelPendingFileOpen();
    onOpenFileRef.current(relativePath,false);
  },[cancelPendingFileOpen]);
  React.useEffect(()=>()=>cancelPendingFileOpen(),[cancelPendingFileOpen]);
  React.useEffect(()=>{cancelPendingFileOpen();},[query,cancelPendingFileOpen]);
  const lifecycle=React.useRef(0);
  const pendingRef=React.useRef(new Set<string>());
  const requestSequence=React.useRef(new Map<string,number>());
  const list=window.agentWebDesktopHost?.listWorkspaceDirectory;
  const listRef=React.useRef(list);
  listRef.current=list;
  const load=React.useCallback((relativePath:string,force=false)=>{
    const fetch=listRef.current;
    if(fetch==null||!force&&pendingRef.current.has(relativePath))return;
    const generation=lifecycle.current;
    const sequence=(requestSequence.current.get(relativePath)??0)+1;
    requestSequence.current.set(relativePath,sequence);
    pendingRef.current.add(relativePath);
    setPending(current=>new Set([...current,relativePath]));
    void fetch({relativePath}).then(result=>{
      if(lifecycle.current!==generation||
        requestSequence.current.get(relativePath)!==sequence)return;
      setLoaded(current=>new Map(current).set(relativePath,{
        entries:result.entries,truncated:result.truncated,
      }));
      setErrors(current=>{
        const next=new Set(current);next.delete(relativePath);return next;
      });
    }).catch(()=>{
      if(lifecycle.current!==generation||
        requestSequence.current.get(relativePath)!==sequence)return;
      setErrors(current=>new Set([...current,relativePath]));
    }).finally(()=>{
      if(lifecycle.current!==generation||
        requestSequence.current.get(relativePath)!==sequence)return;
      pendingRef.current.delete(relativePath);
      setPending(current=>{
        const next=new Set(current);next.delete(relativePath);return next;
      });
    });
  },[]);
  React.useEffect(()=>{
    load("");
    return ()=>{lifecycle.current++;pendingRef.current.clear();
      requestSequence.current.clear();};
  },[load]);
  const toggle=React.useCallback((path:string)=>{
    if(!expanded.has(path))load(path);
    setExpanded(current=>{
      const next=new Set(current);
      if(next.has(path))next.delete(path);
      else next.add(path);
      return next;
    });
  },[expanded,load]);
  React.useEffect(()=>{
    const search=window.agentWebDesktopHost?.searchWorkspaceFiles;
    const value=query.trim();
    if(search==null||value.length<2){
      setSearching(false);setSearchError(false);setSearchResult(null);
      return;
    }
    let current=true;
    setSearching(true);setSearchError(false);setSearchResult(null);
    const timeout=window.setTimeout(()=>{
      void search({query:value}).then(result=>{
        if(!current)return;
        setSearchResult({files:result.files,truncated:result.truncated,
          scannedDirectories:result.scannedDirectories});
      }).catch(()=>{
        if(current){setSearchError(true);setSearchResult(null);}
      }).finally(()=>{if(current)setSearching(false);});
    },180);
    return ()=>{current=false;window.clearTimeout(timeout);};
  },[query,refreshKey,searchEnabled]);
  const rows=React.useMemo(()=>{
    const term=query.trim().toLocaleLowerCase();
    const result:TreeRow[]=[];
    function children(path:string,depth:number){
      for(const child of loaded.get(path)?.entries??[]){
        // The original Un tree delegates nonempty queries to Ve. If the
        // narrow native search is unavailable, retain loaded-row filtering.
        const matched=term===""||child.relativePath.toLocaleLowerCase().includes(term);
        const foundDescendant=child.kind==="directory"&&
          term!==""&&(loaded.get(child.relativePath)?.entries.some(item=>
            item.relativePath.toLocaleLowerCase().includes(term))??false);
        if(!matched&&!foundDescendant)continue;
        const open=child.kind==="directory"&&
          (expanded.has(child.relativePath)||term!==""&&foundDescendant);
        result.push({...child,depth,expanded:open});
        if(open)children(child.relativePath,depth+1);
      }
    }
    children("",1);
    return result;
  },[loaded,expanded,query]);
  function navigate(event:React.KeyboardEvent<HTMLButtonElement>,row:TreeRow){
    if(event.key==="Enter"||event.key===" "){
      event.preventDefault();
      cancelPendingFileOpen();
      if(row.kind==="directory")toggle(row.relativePath);
      else onOpenFileRef.current(row.relativePath,true);
      return;
    }
    if(event.key==="ArrowRight"&&row.kind==="directory"&&!row.expanded){
      event.preventDefault();cancelPendingFileOpen();toggle(row.relativePath);return;
    }
    if(event.key==="ArrowLeft"&&row.kind==="directory"&&row.expanded){
      event.preventDefault();cancelPendingFileOpen();toggle(row.relativePath);return;
    }
    if(!["ArrowUp","ArrowDown","Home","End"].includes(event.key))return;
    event.preventDefault();
    const all=Array.from(treeRef.current?.querySelectorAll<HTMLButtonElement>(
      '[role="treeitem"]')??[]);
    const at=all.indexOf(event.currentTarget);
    const next=event.key==="Home"?0:event.key==="End"?all.length-1:
      event.key==="ArrowUp"?Math.max(0,at-1):Math.min(all.length-1,at+1);
    all[next]?.focus();
  }
  return <div className="demo-workspace-preview__tree"
    data-source-native-workspace-tree=""
    style={visible?undefined:{display:"none"}} aria-hidden={!visible}>
    <div className="demo-workspace-preview__tree-header">
      <span>Workspace files</span>
      <button type="button" title="Refresh granted workspace listing"
        aria-label="Refresh workspace directory"
        onClick={()=>{
          cancelPendingFileOpen();
          for(const path of ["",...expanded])load(path,true);
          setRefreshKey(value=>value+1);
        }}>↻</button>
    </div>
    <label className="demo-workspace-preview__tree-filter">
      <span className="sr-only">Filter workspace files</span>
      <input type="search" placeholder={searchEnabled?
          "Filter files…":"Filter loaded files…"}
        aria-label={searchEnabled?"Filter workspace files":
          "Filter loaded workspace files"} value={query}
        onChange={event=>setQuery(event.target.value)}
        onKeyDown={event=>{
          if(event.key==="Escape"&&query){event.preventDefault();setQuery("");}
        }}/>
    </label>
    <div ref={treeRef} role="tree" aria-label="Granted workspace directories"
      className="demo-workspace-preview__tree-items">
      {searchEnabled&&query.trim().length>=2?
        searching?<p role="status" className="demo-workspace-preview__tree-empty">
          Searching files…
        </p>:searchError?<p role="alert" className="demo-workspace-preview__tree-empty">
          Workspace search unavailable
        </p>:searchResult!=null?<>
          {searchResult.files.length===0?
            <p className="demo-workspace-preview__tree-empty">No matching files</p>:null}
          {searchResult.files.map(file=><button
            key={file.relativePath} type="button" role="treeitem"
            aria-level={1} aria-selected={file.relativePath===activeRelativePath}
            data-item-type="file" data-item-path={file.relativePath}
            title={file.relativePath}
            className="demo-workspace-preview__tree-item"
            onClick={()=>schedulePreviewOpen(file.relativePath)}
            onDoubleClick={()=>openPinnedFile(file.relativePath)}
            onKeyDown={event=>navigate(event,{
              ...file,kind:"file",depth:1,
            })}>
            <span className="demo-workspace-preview__tree-icon" aria-hidden="true">▤</span>
            <span className="demo-workspace-preview__tree-label">
              {file.relativePath}
            </span>
          </button>)}
          {searchResult.truncated?
            <p className="demo-workspace-preview__tree-empty">
              Search limited to {searchResult.scannedDirectories} folders / 100 results
            </p>:null}
        </>:null:
      rows.map(row=><button key={row.relativePath} type="button"
        role="treeitem" aria-level={row.depth}
        aria-selected={row.kind==="file"?
          row.relativePath===activeRelativePath:undefined}
        aria-expanded={row.kind==="directory"?row.expanded:undefined}
        data-item-path={row.relativePath}
        data-item-type={row.kind==="directory"?"folder":"file"}
        style={{paddingInlineStart:`${8+(row.depth-1)*14}px`}}
        className="demo-workspace-preview__tree-item"
        onClick={()=>{
          if(row.kind==="directory"){
            cancelPendingFileOpen();
            toggle(row.relativePath);
          }else schedulePreviewOpen(row.relativePath);
        }}
        onDoubleClick={()=>{
          if(row.kind==="file")openPinnedFile(row.relativePath);
        }}
        onKeyDown={event=>navigate(event,row)}>
        <span className="demo-workspace-preview__tree-icon" aria-hidden="true">
          {row.kind==="directory"?(row.expanded?"⌄":"›"):"▤"}
        </span>
        <span className="demo-workspace-preview__tree-label">{row.name}</span>
      </button>)}
      {query.trim().length<2||!searchEnabled?<>
      {pending.size>0?<p role="status"
        className="demo-workspace-preview__tree-empty">Loading directory entries…</p>:null}
      {errors.size>0?<p role="alert"
        className="demo-workspace-preview__tree-empty">
        Directory unavailable or permission revoked
      </p>:null}
      {!pending.has("")&&loaded.get("")?.entries.length===0?
        <p className="demo-workspace-preview__tree-empty">No previewable files</p>:null}
      {[...loaded.entries()].some(([,value])=>value.truncated)?
        <p className="demo-workspace-preview__tree-empty">
          Listing limited to 200 entries per folder
        </p>:null}
      </>:null}
    </div>
    <p className="demo-workspace-preview__tree-notice">
      Read-only · Chosen folder · Previewable filenames only
    </p>
  </div>;
}
