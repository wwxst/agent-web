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
/** The private opener verify-descendant must never be replaced with a guess.
 * Until host hydration is available, only children in the verified parent
 * summary may mount a nested conversation source. */
export function isSourceLocalSubagentChildVerified(
  ordered:readonly SourceLocalSubagent[],conversationId:string,
):boolean{
  return ordered.some(item=>item.conversationId===conversationId);
}
/** Source original j$ formats completed time relatively, not a date stamp.
 * The host can override this locale fallback with its own original formatter. */
export function sourceLocalSubagentRelativeTime(lastAtMs:number,nowMs=Date.now()):string{
  if(!Number.isFinite(lastAtMs)||!Number.isFinite(nowMs))return "";
  const seconds=Math.max(0,Math.floor((nowMs-lastAtMs)/1000));
  const relative=new Intl.RelativeTimeFormat("en",{numeric:"auto"});
  if(seconds<60)return relative.format(-seconds,"second");
  const minutes=Math.floor(seconds/60);
  if(minutes<60)return relative.format(-minutes,"minute");
  const hours=Math.floor(minutes/60);
  if(hours<24)return relative.format(-hours,"hour");
  return relative.format(-Math.floor(hours/24),"day");
}
export function sourceLocalSubagentLastActivityMs(item:SourceLocalSubagent):number|null{
  return item.lastAssistantMessageAtMs??item.recencyAtMs??null;
}
