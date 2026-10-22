import * as React from "react";
import {
  projectToolActivityDetail,
  type ToolItem,
  type ToolDetailContext,
  type ToolProjection,
} from "../conversation/ToolActivityDetailModel.js";

/** Source fk overrides are host-rendered; the missing xC/PT/Fh leaves are not faked. */
export interface CodexToolActivityItemProps<T extends ToolItem> {
  item:T;
  context?:ToolDetailContext;
  /** fk's override map is consulted ONLY for subagent/image entries. */
  standaloneActivityContentByItemId?: ReadonlyMap<string,React.ReactNode> | undefined;
  renderLeaf:(item:T,projection:Exclude<ToolProjection,{kind:"hidden"}>)=>React.ReactNode;
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
  const plan=projectToolActivityDetail(item,props.context);
  if(plan.kind==="hidden")return null;
  const leaf=props.renderLeaf(item,plan);
  const content=<div data-codex-tool-activity-item="" data-codex-tool-leaf={plan.kind}
     data-codex-tool-status={plan.kind==="patch"?plan.status:plan.kind==="exec"?
       plan.isInProgress?"running":"finished":undefined}
     data-codex-tool-exec-kind={plan.kind==="exec"?plan.leaf:undefined}
     style={{display:"contents"}}>{leaf}</div>;
  return <>{props.wrapSearchableContent?.(item,content)??content}</>;
}
