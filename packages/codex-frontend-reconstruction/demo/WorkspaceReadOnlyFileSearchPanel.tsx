import * as React from "react";
import {createRoot,type Root} from "react-dom/client";
import {
  SearchQuery,closeSearchPanel,findNext,findPrevious,
  getSearchQuery,search,setSearchQuery,searchKeymap,
} from "@codemirror/search";
import {
  keymap,type EditorView,type Panel,type ViewUpdate,
} from "@codemirror/view";

interface SearchPanelSnapshot{
  query:SearchQuery;
  active:number;
  matches:number;
  isCapped:boolean;
}
function searchPanelSnapshot(view:EditorView,query:SearchQuery):SearchPanelSnapshot{
  if(!query.valid)return {query,active:0,matches:0,isCapped:false};
  const selection=view.state.selection.main;
  const cursor=query.getCursor(view.state);
  let active=0,matches=0,isCapped=false;
  for(let result=cursor.next();!result.done;result=cursor.next()){
    if(matches===999){isCapped=true;break;}
    matches++;
    if(result.value.from===selection.from&&result.value.to===selection.to)
      active=matches;
  }
  if(active===0&&matches>0)active=1;
  return {query,active,matches,isCapped};
}
function nextSearchQuery(query:SearchQuery,value:string):SearchQuery{
  return new SearchQuery({
    search:value,caseSensitive:query.caseSensitive,literal:query.literal,
    regexp:query.regexp,replace:query.replace,wholeWord:query.wholeWord,
    test:query.test,
  });
}
function resultLabel(snapshot:SearchPanelSnapshot):string{
  const {query,active,matches,isCapped}=snapshot;
  if(query.search.length===0)return "";
  if(matches===0)return "0 results";
  return `${active} / ${matches}${isCapped?"+":""} results`;
}
function SearchPanelContents({view,snapshot}:{
  view:EditorView;snapshot:SearchPanelSnapshot;
}){
  const {query}=snapshot;
  return <div className="demo-workspace-preview__search-controls"
    role="group" aria-label="File search">
    <input type="text" value={query.search} placeholder="Find"
      aria-label="Find" main-field="true"
      onFocus={event=>event.currentTarget.select()}
      onChange={event=>view.dispatch({
        effects:setSearchQuery.of(nextSearchQuery(query,event.target.value)),
      })}
      onKeyDown={event=>{
        if(event.key==="Escape"){
          event.preventDefault();closeSearchPanel(view);
        }else if(event.key==="Enter"){
          event.preventDefault();
          (event.shiftKey?findPrevious:findNext)(view);
        }
      }}/>
    <button type="button" aria-label="Previous match" title="Previous match"
      disabled={!query.valid||snapshot.matches===0}
      onClick={()=>findPrevious(view)}>↑</button>
    <button type="button" aria-label="Next match" title="Next match"
      disabled={!query.valid||snapshot.matches===0}
      onClick={()=>findNext(view)}>↓</button>
    <span role="status" aria-live="polite"
      className="demo-workspace-preview__search-results">
      {resultLabel(snapshot)}
    </span>
    <button type="button" aria-label="Close search" title="Close search"
      onClick={()=>closeSearchPanel(view)}>×</button>
  </div>;
}

/** Original text-file-editor-search-panel uses a top CodeMirror Panel with a
 * React search control, match count and read-only-aware controls. This
 * independent preview restores only Find/navigation; it never adds Replace. */
class SourceReadOnlyFileSearchPanel implements Panel{
  readonly dom:HTMLDivElement;
  readonly top=true;
  private readonly root:Root;
  constructor(private readonly view:EditorView){
    this.dom=view.dom.ownerDocument.createElement("div");
    this.dom.className="cm-text-file-search-panel";
    this.root=createRoot(this.dom);
    this.draw();
  }
  update(_update:ViewUpdate):void{
    this.draw();
  }
  destroy():void{
    queueMicrotask(()=>this.root.unmount());
  }
  private draw():void{
    this.root.render(<SearchPanelContents
      view={this.view}
      snapshot={searchPanelSnapshot(this.view,getSearchQuery(this.view.state))}
    />);
  }
}

/** Source Yr/ai search-panel behavior, constrained to a read-only editor. */
export function sourceReadOnlyFileSearch(){
  return [
    search({top:true,createPanel:view=>new SourceReadOnlyFileSearchPanel(view)}),
    keymap.of(searchKeymap),
  ];
}
