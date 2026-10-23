import {
 classifySourceVisualizationCommand,
 isSourceVisualizationExecutionStatus,
 isSourceVisualizationSkillRead,
} from "./SourceVisualizationActivityPredicates.js";
/**
 * Source Ke's pre-classification `fr(item,next)` from
 * agent-activity-item-1be092f0c744.js.
 * Source calls Jt + Kt to identify an eligible visualization command that is
 * already represented by the adjacent patch. It also calls qt/Zt for visualize-skill
 * tool reads. Both are now restored from the original skill labels source.
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
  isSuccessfulExecution?: (item:T)=>boolean | undefined;
  /** Original `Kt(parsedCmd.cmd)`, returns a visualization kind or null. */
  classifyVisualizationCommand?: (item:T)=>unknown|null|undefined;
  /** Original `qt(Zt({summary:parsedCmd,cwd}))`. */
  isVisualizationSkillRead?: (item:T)=>boolean | undefined;
  /** Legacy override; use isVisualizationSkillRead for new hosts. */
  isLoadedToolRead?: (item:T)=>boolean | undefined;
}
export function isSourcePreGroupExecSuppressed<T extends SourceExecFilterItem>(
  item:T,next:T|undefined,host:SourceExecFilterHost<T>={},
):boolean {
  if(item.type!=="exec")return false;
  const cmd=item.parsedCmd;
  if(cmd==null)return false;
  const statusAllowed=host.isSuccessfulExecution?.(item) ??
    isSourceVisualizationExecutionStatus(item.executionStatus);
  const hostVisualizationKind=host.classifyVisualizationCommand?.(item);
  const visualizationKind=hostVisualizationKind===undefined
    ?classifySourceVisualizationCommand(cmd.cmd):hostVisualizationKind;
  if(statusAllowed && visualizationKind != null &&
     next?.type==="patch" &&
     Array.isArray(next.visualizationActivities) &&
     next.visualizationActivities.length>0) return true;
  return cmd.type==="read" && (host.isVisualizationSkillRead?.(item) ??
    host.isLoadedToolRead?.(item) ?? isSourceVisualizationSkillRead(item));
}
