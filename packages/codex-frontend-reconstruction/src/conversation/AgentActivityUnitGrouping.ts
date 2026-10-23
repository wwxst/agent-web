/**
 * Source-backed grouping pass corresponding to N/P in
 * inline-followup-markdown-4751fe20f26d.js.
 *
 * The private _e classifier decides whether an activity is groupable. It is
 * deliberately supplied by the host; never infer it from a mock-only label.
 */
import type { AgentActivityItem, AgentActivityUnit } from "./AgentActivityProjection.js";

export interface SourceActivityGroupingHost<T extends AgentActivityItem> {
  getGrouping(item: T, index: number): "groupable" | "standalone";
  startsGroup?(item: T, index: number): boolean;
  /** Ke invokes fr(item,next) before _e, without changing source indices. */
  shouldSkipBeforeGrouping?(item: T, next: T | undefined, index: number): boolean;
  groupAcrossSubagentActivity?: boolean;
}

function sourceActivityIdentity(item: AgentActivityItem, index: number): string {
  if (item.type === "assistant-message" && typeof item.searchItemId === "string")
    return item.searchItemId;
  for (const field of ["id", "callId", "requestId", "handoffId"] as const) {
    const value = item[field];
    if (typeof value === "string") return value;
  }
  return item.type + ":" + index;
}

/** Preserves source order, explicit split points and N's group continuation. */
export function groupSourceAgentActivityUnits<T extends AgentActivityItem>(
  items: readonly T[],
  host: SourceActivityGroupingHost<T>,
): AgentActivityUnit<T>[] {
  const result: AgentActivityUnit<T>[] = [];
  let buffered: T[] = [];
  let bufferStart = 0;
  let activeGroup: {key:string;kind:"group";items:T[]} | null = null;
  const flush = () => {
    if (buffered.length === 0) return;
    if (activeGroup == null) {
      const first = buffered[0]!;
      activeGroup = {kind:"group",key:"agent-activity-group:" + sourceActivityIdentity(first,bufferStart),items:[...buffered]};
      result.push(activeGroup);
    } else activeGroup.items.push(...buffered);
    buffered = [];
  };
  for (let index=0; index<items.length; index++) {
    const item=items[index]!;
    if (host.shouldSkipBeforeGrouping?.(item,items[index+1],index) === true) continue;
    if (host.startsGroup?.(item,index) === true) {flush();activeGroup=null;}
    if (host.getGrouping(item,index) === "groupable") {
      if (buffered.length === 0) bufferStart=index;
      buffered.push(item);
      continue;
    }
    flush();
    if (!host.groupAcrossSubagentActivity || item.type !== "subagent-activity")
      activeGroup=null;
    const previous=result[result.length-1];
    if (!(item.type === "strict-review-notice" &&
          previous?.kind === "standalone" && previous.item.type === "strict-review-notice")) {
      result.push({kind:"standalone",key:"agent-activity-standalone:"+sourceActivityIdentity(item,index),item});
    }
  }
  flush();
  return result;
}
