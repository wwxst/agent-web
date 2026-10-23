/**
 * Source Ke's pre-classification `fr(item,next)` from
 * agent-activity-item-1be092f0c744.js.
 * Source calls Jt + Kt to identify a finished visualization command that is
 * already represented by the adjacent patch. It also calls qt/Zt for loaded
 * tool reads. Those private predicates must come from the real host.
 */
export interface SourceExecFilterItem {
  type:string;
  executionStatus?:string;
  parsedCmd?:{type?:string;cmd?:string;isFinished?:boolean};
  cwd?:string;
  visualizationActivities?:readonly unknown[]|null;
}
export interface SourceExecFilterHost<T extends SourceExecFilterItem> {
  /** Original `Jt(executionStatus)`. */
  isSuccessfulExecution?: (item:T)=>boolean;
  /** Original `Kt(parsedCmd.cmd)`, returns a visualization kind or null. */
  classifyVisualizationCommand?: (item:T)=>unknown|null;
  /** Original `qt(Zt({summary:parsedCmd,cwd}))`. */
  isLoadedToolRead?: (item:T)=>boolean;
}
export function isSourcePreGroupExecSuppressed<T extends SourceExecFilterItem>(
  item:T,next:T|undefined,host:SourceExecFilterHost<T>={},
):boolean {
  if(item.type!=="exec")return false;
  const cmd=item.parsedCmd;
  if(cmd==null)return false;
  if(host.isSuccessfulExecution?.(item)===true &&
     host.classifyVisualizationCommand?.(item)!=null &&
     next?.type==="patch" &&
     Array.isArray(next.visualizationActivities) &&
     next.visualizationActivities.length>0) return true;
  return cmd.type==="read" && host.isLoadedToolRead?.(item)===true;
}
