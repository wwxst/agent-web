/**
 * LocalConversationSubagentsPanelTab F/I/V/L/R/H/W from original compiled
 * local-conversation-subagents-panel-tab-f7116bdb2e6f.js.
 *
 * Data are supplied by the real thread host. This model neither infers
 * subagents from assistant prose nor manufactures a background Agent task.
 */
export interface SourceLocalSubagent {
  conversationId:string;
  displayName:string;
  /** Original I groups exactly status === "done" separately. */
  status:string;
  objective?:string|null;
  statusSummary?:string|null;
  startedAtMs?:number|null;
  lastAssistantMessageAtMs?:number|null;
  recencyAtMs?:number|null;
  model?:string|null;
  reasoningEffort?:string|null;
  canInteract?:boolean;
}
export const SOURCE_SUBAGENTS_ACTIVE_VISIBLE_LIMIT=4;
export const SOURCE_SUBAGENTS_DONE_VISIBLE_LIMIT=10;
export interface SourceLocalSubagentSections {
  active:readonly SourceLocalSubagent[];
  done:readonly SourceLocalSubagent[];
  waitingCount:number;
}
/** Original I's upstream Vl sorter is private: the caller owns source order. */
export function sourceLocalSubagentSections(
  ordered:readonly SourceLocalSubagent[],
):SourceLocalSubagentSections{
  const active=ordered.filter(item=>item.status!=="done");
  return {active,done:ordered.filter(item=>item.status==="done"),
    waitingCount:active.filter(item=>item.status==="waiting").length};
}
/** Original V: objective preview wins; then status summary; then Working. */
export function sourceLocalSubagentPreview(item:SourceLocalSubagent):string|null{
  if(item.objective!=null&&item.objective.length>0){
    const normalized=item.objective.trim().replace(/\s+/g," ");
    return normalized.length>60?normalized.slice(0,59)+"…":normalized;
  }
  return item.statusSummary??(item.status==="done"?null:"Working");
}
export function sourceLocalSubagentLastActivityMs(item:SourceLocalSubagent):number|null{
  return item.lastAssistantMessageAtMs??item.recencyAtMs??null;
}
