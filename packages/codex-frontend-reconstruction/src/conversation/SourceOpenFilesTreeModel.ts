/**
 * Based on original review-file-tree-side-pane-6403b8872f72.js:
 *   Vn deduplicates path entries; Un/Wn hold expandedPaths/selectedPath,
 *   tree display paths, query and onSelectFile. Base-file-tree exports
 *   selectedPath, onClick/onSelectionChange and flattenEmptyDirectories.
 *
 * The independent Electron host supplies only already-opened files after an
 * explicit native workspace grant. This model must not invent directory
 * contents or grant new read authority.
 */
export interface SourceOpenFileTreeEntry {
  id:string;
  relativePath:string;
}
export interface SourceOpenFileTreeRow {
  id:string;
  kind:"folder"|"file";
  label:string;
  path:string;
  depth:number;
  tabId?:string;
  expanded?:boolean;
  selected?:boolean;
}

function normalizedLocalPath(path:string):string|null {
  // The read-only native host supplies an already canonical root-relative
  // path. Reject traversal, absolute paths and control bytes defensively.
  if(!path||path.startsWith("/")||path.startsWith("\\")||
     /^[a-z]:[\\/]/i.test(path)||/[\u0000-\u001f\u007f]/.test(path))return null;
  const parts=path.replace(/\\/g,"/").split("/");
  if(parts.some(part=>part===""||part==="."||part===".."))return null;
  return parts.join("/");
}
interface SourceTreeNode {
  path:string;
  name:string;
  children:Map<string,SourceTreeNode>;
  tabId?:string;
}
function sortNodes(nodes:Iterable<SourceTreeNode>):SourceTreeNode[] {
  return [...nodes].sort((a,b)=>
    (a.tabId==null?0:1)-(b.tabId==null?0:1)||
    a.name.localeCompare(b.name,undefined,{numeric:true,sensitivity:"base"}));
}
export function sourceOpenFileTreePaths(
  entries:readonly SourceOpenFileTreeEntry[],
):readonly {id:string;path:string}[] {
  const seen=new Set<string>();
  const result:{id:string;path:string}[]=[];
  for(const entry of entries){
    const path=normalizedLocalPath(entry.relativePath);
    if(path==null||seen.has(path))continue;
    seen.add(path);
    result.push({id:entry.id,path});
  }
  return result;
}
export function sourceOpenFileTreeRows(
  entries:readonly SourceOpenFileTreeEntry[],
  expandedPaths:ReadonlySet<string>,
  activeTabId:string|null,
  query="",
):readonly SourceOpenFileTreeRow[] {
  const root:SourceTreeNode={path:"",name:"",children:new Map()};
  for(const {id,path} of sourceOpenFileTreePaths(entries)){
    let cursor=root;
    for(const part of path.split("/")){
      const full=cursor.path?cursor.path+"/"+part:part;
      let child=cursor.children.get(part);
      if(child==null){
        child={path:full,name:part,children:new Map()};
        cursor.children.set(part,child);
      }
      cursor=child;
    }
    cursor.tabId=id;
  }
  const term=query.trim().toLocaleLowerCase();
  function matches(node:SourceTreeNode):boolean {
    return node.tabId!=null&&
      (term===""||node.path.toLocaleLowerCase().includes(term))||
      [...node.children.values()].some(matches);
  }
  const rows:SourceOpenFileTreeRow[]=[];
  function collect(node:SourceTreeNode,depth:number){
    if(!matches(node))return;
    if(node.tabId!=null){
      rows.push({id:"file:"+node.tabId,kind:"file",label:node.name,
        path:node.path,depth,tabId:node.tabId,
        selected:node.tabId===activeTabId});
      return;
    }
    // Source base-file-tree uses flattenEmptyDirectories=true. Fold a chain
    // of singleton folders but keep their canonical last path for expansion.
    let tail=node;
    let label=node.name;
    while(tail.children.size===1){
      const only=tail.children.values().next().value as SourceTreeNode|undefined;
      if(only==null||only.tabId!=null)break;
      label+="/"+only.name;
      tail=only;
    }
    const open=term!==""||expandedPaths.has(tail.path);
    rows.push({id:"folder:"+tail.path,kind:"folder",label,
      path:tail.path,depth,expanded:open});
    if(open)for(const child of sortNodes(tail.children.values()))
      collect(child,depth+1);
  }
  for(const node of sortNodes(root.children.values()))collect(node,1);
  return rows;
}
/** Initial view starts with ancestors of the selected file expanded, like
 * original Un / mt activeFilePath initialization. A later user collapse is
 * not undone merely because a file remains selected. */
export function sourceInitialOpenFileTreeExpansion(
  entries:readonly SourceOpenFileTreeEntry[],
  activeTabId:string|null,
):ReadonlySet<string> {
  const path=sourceOpenFileTreePaths(entries).find(item=>item.id===activeTabId)?.path;
  const result=new Set<string>();
  if(path==null)return result;
  const parts=path.split("/");
  for(let n=1;n<parts.length;n++)result.add(parts.slice(0,n).join("/"));
  return result;
}
