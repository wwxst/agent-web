import * as React from "react";
import {
  SOURCE_SUBAGENTS_ACTIVE_VISIBLE_LIMIT,
  SOURCE_SUBAGENTS_DONE_VISIBLE_LIMIT,
  sourceLocalSubagentLastActivityMs,
  sourceLocalSubagentPreview,
  sourceLocalSubagentSections,
  type SourceLocalSubagent,
} from "../conversation/SourceLocalSubagentsPanelModel.js";
import "./sourceLocalSubagentsPanel.css";

export interface SourceLocalSubagentsPanelProps {
  hostId:string;
  parentConversationId:string;
  /** Caller passes its verified, already ordered background-agent projection. */
  subagents:readonly SourceLocalSubagent[];
  selectedConversationId:string|null;
  requestedDisplayName?:string|null;
  isLoading?:boolean;
  onSelect:(conversationId:string|null,displayName:string|null)=>void;
  onClose:()=>void;
  /** Source k: real nested local-conversation-thread owned by host. */
  renderTranscript?:(args:{
    hostId:string;conversationId:string;canInteract:boolean;
    onOpenBackgroundAgent:(id:string,displayName:string|null)=>void;
  })=>React.ReactNode;
  renderAvatar?:(conversationId:string)=>React.ReactNode;
  formatRelativeTime?:(milliseconds:number)=>React.ReactNode;
  formatModel?:(model:string,reasoningEffort?:string|null)=>React.ReactNode;
}
function SourceSubagentElapsed({startedAtMs}:{startedAtMs:number}){
  const [now,setNow]=React.useState(()=>Date.now());
  React.useEffect(()=>{
    const handle=setInterval(()=>setNow(Date.now()),1000);
    return ()=>clearInterval(handle);
  },[]);
  const seconds=Math.max(0,Math.floor((now-startedAtMs)/1000));
  const label=seconds<60?`${seconds}s`:
    seconds<3600?`${Math.floor(seconds/60)}m ${seconds%60}s`:
    `${Math.floor(seconds/3600)}h ${Math.floor(seconds%3600/60)}m`;
  return <span data-source-subagent-elapsed="" className="codex-subagents__trailing">
    {label}
  </span>;
}
function SourceSubagentSection({
  id,title,items,limit,emptyState,waitingCount,onSelect,renderAvatar,formatRelativeTime,
}:{
  id:"active"|"done";title:string;items:readonly SourceLocalSubagent[];
  limit:number;emptyState?:string;waitingCount?:number;
  onSelect:(id:string,name:string)=>void;
  renderAvatar?:(id:string)=>React.ReactNode;
  formatRelativeTime?:(ms:number)=>React.ReactNode;
}){
  const [expanded,setExpanded]=React.useState(false);
  const shown=expanded?items:items.slice(0,limit);
  if(items.length===0&&emptyState==null)return null;
  return <section className="codex-subagents__section"
    data-source-subagents-section={id}>
    <h2 className="codex-subagents__section-title">
      <span>{title} · {items.length}</span>
      {waitingCount!=null&&waitingCount>0
        ?<span className="codex-subagents__waiting-count">
          {waitingCount} waiting
        </span>:null}
    </h2>
    {items.length===0
      ?<div className="codex-subagents__empty">{emptyState}</div>
      :<div className="codex-subagents__rows">
        {shown.map(item=>{
          const preview=sourceLocalSubagentPreview(item);
          const doneAt=sourceLocalSubagentLastActivityMs(item);
          return <button type="button" className="codex-subagents__row"
            key={item.conversationId}
            data-source-subagent-id={item.conversationId}
            onClick={()=>onSelect(item.conversationId,item.displayName)}>
            {renderAvatar!=null
              ?<span className="codex-subagents__avatar" aria-hidden="true">
                {renderAvatar(item.conversationId)}
              </span>:null}
            <span className="codex-subagents__row-copy">
              <span className="codex-subagents__row-main">
                <span className="codex-subagents__name">{item.displayName}</span>
                {item.status==="waiting"
                  ?<span className="codex-subagents__trailing">Waiting</span>:null}
                {item.status!=="done"&&item.startedAtMs!=null
                  ?<SourceSubagentElapsed startedAtMs={item.startedAtMs}/>:null}
                {item.status==="done"&&doneAt!=null
                  ?<time className="codex-subagents__trailing"
                    dateTime={new Date(doneAt).toISOString()}>
                    {formatRelativeTime?.(doneAt)??new Date(doneAt).toLocaleDateString()}
                  </time>:null}
              </span>
              {preview!=null
                ?<span className="codex-subagents__preview">{preview}</span>:null}
            </span>
          </button>;
        })}
      </div>}
    {!expanded&&items.length>limit
      ?<button type="button" className="codex-subagents__more"
        aria-label={`Show all ${id} subagents`}
        onClick={()=>setExpanded(true)}>Show more ({items.length-limit})</button>:null}
  </section>;
}
/**
 * Original F switches in one right-side tab between I list and B+local thread.
 * This component has no independent data store or fake detail transcript.
 */
export function SourceLocalSubagentsPanel({
  hostId,parentConversationId,subagents,selectedConversationId,
  requestedDisplayName,isLoading=false,onSelect,onClose,
  renderTranscript,renderAvatar,formatRelativeTime,formatModel,
}:SourceLocalSubagentsPanelProps){
  const sections=sourceLocalSubagentSections(subagents);
  const selected=selectedConversationId==null?null:
    subagents.find(entry=>entry.conversationId===selectedConversationId)??null;
  const back=React.useCallback(()=>onSelect(null,null),[onSelect]);
  return <aside className="codex-subagents"
    role="complementary" aria-label="Subagents"
    data-source-local-subagents-panel={parentConversationId}
    data-source-subagents-host-id={hostId}>
    <div className="codex-subagents__tab-title">
      <strong>Subagents</strong>
      <button type="button" onClick={onClose} aria-label="Close Subagents">×</button>
    </div>
    {selectedConversationId!=null
      ?<>
        <div className="codex-subagents__detail-header" data-source-subagent-detail="">
          <button type="button" aria-label="Back to subagents"
            className="codex-subagents__back" onClick={back}>‹</button>
          {renderAvatar!=null
            ?<span className="codex-subagents__avatar" aria-hidden="true">
              {renderAvatar(selectedConversationId)}
            </span>:null}
          <span className="codex-subagents__detail-name">
            {selected?.displayName??requestedDisplayName??""}
          </span>
          {selected?.model!=null
            ?<span className="codex-subagents__detail-model">
              {formatModel?.(selected.model,selected.reasoningEffort) ??
                [selected.model,selected.reasoningEffort].filter(Boolean).join(" · ")}
            </span>:null}
        </div>
        <div className="codex-subagents__detail-content">
          {isLoading?<div role="status">Loading subagent transcript…</div>:
            renderTranscript!=null
            ?renderTranscript({hostId,conversationId:selectedConversationId,
              canInteract:selected?.canInteract===true,
              onOpenBackgroundAgent:(id,name)=>onSelect(id,name)})
            :<div role="status" data-source-subagent-transcript-unavailable="">
              Subagent transcript unavailable: host has not provided a conversation source.
            </div>}
        </div>
      </>
      :<div className="codex-subagents__overview" data-source-subagents-overview="">
        <div className="codex-subagents__overview-inner">
          <SourceSubagentSection id="active" title="Active"
            items={sections.active} limit={SOURCE_SUBAGENTS_ACTIVE_VISIBLE_LIMIT}
            emptyState="No active subagents" waitingCount={sections.waitingCount}
            onSelect={onSelect} renderAvatar={renderAvatar}
            formatRelativeTime={formatRelativeTime}/>
          <SourceSubagentSection id="done" title="Done"
            items={sections.done} limit={SOURCE_SUBAGENTS_DONE_VISIBLE_LIMIT}
            onSelect={onSelect} renderAvatar={renderAvatar}
            formatRelativeTime={formatRelativeTime}/>
        </div>
      </div>}
  </aside>;
}
