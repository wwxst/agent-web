import * as React from "react";
import {
  projectToolActivityDetail,
  type ToolItem,
  type ToolDetailContext,
  type ToolProjection,
} from "../conversation/ToolActivityDetailModel.js";
import {
  hydrateToolActivityItemFromHistory,
  type ToolActivityHistoryHydrationInput,
} from "../conversation/ToolActivityHistoryHydrationModel.js";

/** Source fk overrides are host-rendered; the missing xC/PT/Fh leaves are not faked. */
export interface CodexToolActivityItemProps<T extends ToolItem> {
  item:T;
  context?:ToolDetailContext;
  /** Host supplies resolved history query results; this component performs no I/O. */
  historyHydration?: ToolActivityHistoryHydrationInput | null;
  assistantCopyText?: string | null | undefined;
  /** fk's override map is consulted ONLY for subagent/image entries. */
  standaloneActivityContentByItemId?: ReadonlyMap<string,React.ReactNode> | undefined;
  renderLeaf:(item:ToolItem,projection:Exclude<ToolProjection,{kind:"hidden"}>,
    assistantCopyText?:string|null|undefined)=>React.ReactNode;
  /** Source fk wraps ordinary leaves in a searchable surface; overrides bypass it. */
  wrapSearchableContent?:(item:T,content:React.ReactNode)=>React.ReactNode;
}
export function CodexToolActivityItem<T extends ToolItem>(props:CodexToolActivityItemProps<T>) {
  const {item}=props;
  if((item.type==="subagent-activity"||item.type==="generated-image")&&
     typeof item.id==="string") {
    const override=props.standaloneActivityContentByItemId?.get(item.id);
    if(override!=null)return <>{override}</>;
  }
  const hydration = props.historyHydration == null ? null :
    hydrateToolActivityItemFromHistory(item, props.historyHydration.historyEntity,
      props.historyHydration.assistantMessagePresence, props.historyHydration.context,
      props.historyHydration.dependencies);
  if(hydration?.item===null)return null;
  const activeItem:ToolItem=hydration?.item??item;
  const plan=projectToolActivityDetail(activeItem,props.context);
  if(plan.kind==="hidden")return null;
  const copyText=hydration==null?props.assistantCopyText:hydration.assistantCopyText;
  const leaf=props.renderLeaf(activeItem,plan,copyText);
  const content=<div data-codex-tool-activity-item="" data-codex-tool-leaf={plan.kind}
     data-codex-tool-status={plan.kind==="patch"?plan.status:plan.kind==="exec"?
       plan.isInProgress?"running":"finished":undefined}
     data-codex-tool-exec-kind={plan.kind==="exec"?plan.leaf:undefined}
     data-codex-tool-exec-summary-kind={plan.kind==="exec"&&typeof plan.summary.type==="string"?plan.summary.type:undefined}
     style={{display:"contents"}}>{leaf}</div>;
  return <>{props.wrapSearchableContent?.(item,content)??content}</>;
}
