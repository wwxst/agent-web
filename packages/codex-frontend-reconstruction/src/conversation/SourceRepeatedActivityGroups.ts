import { isSourceMcpResultUngroupable } from "./SourceMcpResultGroupingGuard.js";

/**
 * Je from inline-followup-markdown-4751fe20f26d.js (2026-10-21 bundle).
 * Repeated MCP calls and external events are grouped only when consecutive
 * and when their original eligibility and identity conditions agree.
 * The source $_/ie result guard is recovered; bm tool display identity is host-owned.
 */
export interface SourceRepeatedItem {
  type: string;
  completed?: boolean;
  grouping?: string;
  subscriptionEnded?: boolean;
  sourceKey?: string;
  sourceLabel?: string;
  source?: unknown;
  invocation?: {server?: string; tool?: string};
  functionName?: string;
  pluginId?: string;
  appContext?: {connectorId?: string; linkId?: string};
  invocationResourceUri?: string;
  result?: {type?: string; structuredContent?: unknown};
  automaticApprovalReviews?: readonly unknown[] | null;
  [key: string]: unknown;
}

export interface SourceRepeatedActivityHost<T extends SourceRepeatedItem> {
  /** Host _e grouping normalization; Je is never run on unknown raw groupings. */
  getGrouping(item:T): "groupable" | "standalone";
  /** Additional host result policy: true only when it is safe to show as a repeated call. */
  canGroupMcpResult(item:T): boolean;
  /** Original bm(toolDisplay + invocation + app context) signature. */
  getToolDisplaySignature(item:T): unknown;
}

export interface SourceRepeatedActivityRow<T extends SourceRepeatedItem> {
  key: string;
  kind: "single" | "mcp-tool-call" | "external-event";
  items: readonly T[];
}

const asJson = (value: unknown) => value === undefined ? null : value;
function groupingKey<T extends SourceRepeatedItem>(
  item:T, host:SourceRepeatedActivityHost<T>,
): string | null {
  if (host.getGrouping(item) !== "groupable") return null;
  if (item.type === "external-event") {
    return item.subscriptionEnded === true ? null :
      JSON.stringify(["external-event", asJson(item.sourceKey), asJson(item.sourceLabel)]);
  }
  if (item.type !== "mcp-tool-call" || item.completed !== true ||
      item.source != null || item.invocation?.server === "computer-use" ||
      item.result?.type !== "success" ||
      (item.automaticApprovalReviews?.length ?? 0) > 0 ||
      isSourceMcpResultUngroupable(item.invocation?.server, item.result) ||
      !host.canGroupMcpResult(item)) return null;
  return JSON.stringify([
    asJson(item.invocation?.server), asJson(item.invocation?.tool),
    asJson(item.functionName), asJson(item.pluginId),
    asJson(item.appContext?.connectorId), asJson(item.appContext?.linkId),
    asJson(item.invocationResourceUri), asJson(host.getToolDisplaySignature(item)),
  ]);
}

/** Je resets after every ineligible item, regardless of apparent tool name. */
export function projectSourceRepeatedActivityRows<T extends SourceRepeatedItem>(
  items: readonly T[], host: SourceRepeatedActivityHost<T>,
): SourceRepeatedActivityRow<T>[] {
  const groups: Array<{identity:string|null; firstIndex:number; items:T[]}> = [];
  let previousKey: string|null = null;
  for (const [index, item] of items.entries()) {
    const key=groupingKey(item,host);
    const last=groups[groups.length - 1];
    if (key != null && last != null && key === previousKey) last.items.push(item);
    else groups.push({identity:key,firstIndex:index,items:[item]});
    previousKey=key;
  }
  return groups.map(group=>({
    key: (group.identity == null ? "single:" : "repeated:") + group.firstIndex,
    kind:group.identity == null || group.items.length===1 ? "single"
      :group.items[0]?.type==="external-event" ? "external-event" : "mcp-tool-call",
    items:group.items,
  }));
}
