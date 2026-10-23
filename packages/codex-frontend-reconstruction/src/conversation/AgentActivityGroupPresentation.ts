/**
 * Source-checked, host-neutral parts of the group header pipeline:
 * inline-followup-markdown-4751fe20f26d.js: Xe (export i / hg), Ze, Q, K,
 * and je (Sg/We's completed-header part ordering).
 * sites-end-resource-fa77a923096d.js: nk, ak, sk (group state and labels).
 *
 * The real We aggregator, tool icon renderer, MCP metadata and `tO` web-search
 * formatter remain host dependencies. This module does not infer their output.
 */
export interface GroupActivityItem {
  type: string;
  completed?: boolean;
  executionStatus?: string;
  parsedCmd?: { type?: string; cmd?: string; isFinished?: boolean };
  status?: string;
  success?: boolean | null;
  plan?: readonly { status?: string }[];
  title?: string | null;
  query?: string;
  action?: string;
  [key: string]: unknown;
}

export type ActivityGroupHeaderState<T extends GroupActivityItem> =
  | { kind: "summary" }
  | { kind: "thinking" }
  | { kind: "active"; item: T };

export interface ActivityGroupStateOptions<T extends GroupActivityItem> {
  items: readonly T[];
  isLatestVisibleUnit: boolean;
  isHeaderInProgress: boolean;
  isActivitySliceClosed: boolean;
  isExploring: boolean;
}

/** Original `K`: type-dependent unfinished check (not a generic `!completed`). */
export function isUnfinishedGroupItem(item: GroupActivityItem): boolean {
  switch (item.type) {
    case "context-compaction":
    case "multi-agent-action": return item.status === "inProgress";
    case "assistant-message":
    case "dil-reasoning":
    case "reasoning":
    case "proposed-plan": return !item.completed;
    case "exec": return !item.parsedCmd?.isFinished;
    case "patch": return item.success == null;
    case "mcp-tool-call":
    case "dynamic-tool-call":
    case "web-search":
    case "userInput":
    case "permission-request":
    case "mcp-server-elicitation":
    case "user-input-response": return !item.completed;
    case "automatic-approval-review": return item.status === "inProgress";
    case "todo-list": return Array.isArray(item.plan) && item.plan.some(entry => entry.status !== "completed");
    // These are explicitly excluded by the original switch.
    case "user-message": case "external-event": case "realtime-transcript":
    case "turn-diff": case "system-error": case "stream-error":
    case "steered": case "remote-task-created": case "personality-changed":
    case "forked-from-conversation": case "model-changed": case "model-rerouted":
    case "auto-review-interruption-warning": case "strict-review-notice":
    case "automation-update": case "plan-implementation": case "worked-for":
    case "generated-image": case "worktree-init": case "subagent-activity":
    case "image-view": return false;
    default: return false;
  }
}

/** Original `Q`: in-progress test for the currently displayed group header. */
export function isActiveGroupMember(item: GroupActivityItem): boolean {
  switch (item.type) {
    case "exec": return item.executionStatus !== "interrupted" && !item.parsedCmd?.isFinished;
    case "automatic-approval-review": return item.status === "inProgress";
    case "dynamic-tool-call": case "mcp-tool-call": case "web-search": return !item.completed;
    case "patch": return item.success == null;
    default: return isUnfinishedGroupItem(item);
  }
}

/** Original `I`: the commands counted as exploration for `Ze`. */
export function isExplorationCommand(item: GroupActivityItem): boolean {
  return item.type === "exec" &&
    (item.parsedCmd?.type === "read" || item.parsedCmd?.type === "search" || item.parsedCmd?.type === "list_files");
}

/**
 * `Xe` (hg): finished groups are summaries; a live group chooses the last
 * unfinished entry, except that approvals-in-progress display Thinking.
 * During exploration, `Ze` selects the contiguous trailing exploration item,
 * including a completed fallback, before scanning generic unfinished items.
 */
export function projectActivityGroupHeader<T extends GroupActivityItem>(
  options: ActivityGroupStateOptions<T>,
): ActivityGroupHeaderState<T> {
  const { items, isLatestVisibleUnit, isHeaderInProgress, isActivitySliceClosed, isExploring } = options;
  if (!(isLatestVisibleUnit && isHeaderInProgress && !isActivitySliceClosed)) return { kind: "summary" };
  if (isExploring) {
    let trailing: T | null = null;
    for (let index = items.length - 1; index >= 0; --index) {
      const item = items[index];
      if (item == null || !isExplorationCommand(item)) {
        if (trailing != null) break;
        continue;
      }
      trailing ??= item;
      if (isActiveGroupMember(item)) return { kind: "active", item };
    }
    if (trailing != null) return { kind: "active", item: trailing };
  }
  for (let index = items.length - 1; index >= 0; --index) {
    const item = items[index];
    if (item != null && isActiveGroupMember(item)) {
      return item.type === "automatic-approval-review" ? { kind: "thinking" } : { kind: "active", item };
    }
  }
  return { kind: "thinking" };
}

export type ActivityHeaderMessage = {
  id: string;
  defaultMessage: string;
  values?: Record<string, string>;
};

export type ActivityHeaderLabel =
  | { kind: "message"; message: ActivityHeaderMessage }
  | { kind: "text"; text: string }
  | { kind: "host-required"; type: string };

/**
 * `sk` from sites-end-resource: source-confirmed text/message identifiers.
 * Full exploration label, web search action formatting, MCP and dynamic-tool
 * labels require private host renderers. No hard-coded fake translations.
 */
export function getActiveActivityHeaderLabel(
  item: GroupActivityItem,
  detailLevel: "STEPS_PROSE" | "DETAILED" | string,
  formatWebSearch?: (action: string | undefined, query: string | undefined) => string,
): ActivityHeaderLabel {
  switch (item.type) {
    case "exec": {
      if (detailLevel === "STEPS_PROSE") return { kind: "message", message: {
        id: "localConversation.agentActivity.runningCommandGeneric", defaultMessage: "Running command",
      } };
      const command = item.parsedCmd?.cmd?.trim();
      if (command == null) return { kind: "host-required", type: item.type };
      return { kind: "message", message: {
        id: "localConversation.agentActivity.runningCommand", defaultMessage: "Running {command}", values: { command },
      } };
    }
    case "patch": return { kind: "message", message: {
      id: "localConversation.agentActivity.editingFiles", defaultMessage: "Editing files",
    } };
    case "web-search": {
      if (item.title != null) return { kind: "text", text: item.title };
      const displayQuery = formatWebSearch?.(item.action, item.query)?.trim();
      if (displayQuery) return { kind: "message", message: {
        id: "localConversation.agentActivity.searchingWebForQuery", defaultMessage: "Searching the web for {query}", values: { query: displayQuery },
      } };
      return { kind: "message", message: {
        id: "localConversation.agentActivity.searchingWeb", defaultMessage: "Searching the web",
      } };
    }
    // `sk` delegates MCP, dynamic and private visualizations to other bundles.
    default: return { kind: "host-required", type: item.type };
  }
}

export interface ToolActivitySummary {
  loadedToolCount: number;
  mcpToolCallCount: number;
  mcpToolCallSources: readonly { key: string; count: number }[];
  createdFileCount: number;
  editedFileCount: number;
  deletedFileCount: number;
  stoppedCreatedFileCount: number;
  exploredFileCount: number;
  searchCount: number;
  listCount: number;
  visualizationActivity: unknown | null;
  commandCount: number;
  completedVisualizationCommandCount: number;
  runningVisualizationCommandCount: number;
  completedWebSearchCommandCount: number;
  runningWebSearchCommandCount: number;
  webSearchCount: number;
}

export type CompletedGroupHeaderPart =
  | { kind: "mcp-sources"; sources: readonly { key: string; count: number }[] }
  | { kind: "loaded-tools" | "unnamed-mcp-calls" | "file-changes" | "stopped-file-creation" | "commands"; count: number }
  | { kind: "exploration" }
  | { kind: "visualization"; activity: unknown }
  | { kind: "web-search"; title?: string };

/**
 * `je`, called within `We`/`Sg`: preserve the ORIGINAL ordering and count
 * deductions. The actual input aggregation `xe`/`Le` and source ordering `Me`
 * remain host-owned, so callers must supply an actual ToolActivitySummary.
 */
export function projectCompletedGroupHeaderParts(
  activity: ToolActivitySummary,
  namedMcpSources: readonly { key: string; count: number }[],
  extraParts: readonly CompletedGroupHeaderPart[] = [],
  isSpecialSource: (key: string) => boolean = () => false,
): CompletedGroupHeaderPart[] {
  const parts: CompletedGroupHeaderPart[] = [];
  const add = (kind: Extract<CompletedGroupHeaderPart, { count: number }>["kind"], count: number) => {
    if (count > 0) parts.push({ kind, count });
  };
  if (namedMcpSources.length > 0) parts.push({ kind: "mcp-sources", sources: namedMcpSources });
  add("loaded-tools", activity.loadedToolCount);
  const namedCalls = activity.mcpToolCallSources.reduce((sum, source) => sum + source.count, 0);
  add("unnamed-mcp-calls", activity.mcpToolCallCount - namedCalls);
  add("file-changes", activity.createdFileCount + activity.editedFileCount + activity.deletedFileCount - activity.stoppedCreatedFileCount);
  add("stopped-file-creation", activity.stoppedCreatedFileCount);
  if (activity.exploredFileCount > 0 || activity.searchCount > 0 || activity.listCount > 0) parts.push({ kind: "exploration" });
  if (activity.visualizationActivity != null) parts.push({ kind: "visualization", activity: activity.visualizationActivity });
  const specialCalls = activity.mcpToolCallSources.reduce((sum, source) => sum + (isSpecialSource(source.key) ? source.count : 0), 0);
  const webCommands = activity.completedWebSearchCommandCount + activity.runningWebSearchCommandCount;
  add("commands", activity.commandCount - activity.completedVisualizationCommandCount - activity.runningVisualizationCommandCount + specialCalls - webCommands);
  if (activity.webSearchCount > 0 || webCommands > 0) parts.push({ kind: "web-search" });
  parts.push(...extraParts);
  return parts;
}

/**
 * Original `Ye`: a completed one-item group is demoted to a standalone row,
 * except a multi-change/multi-visualization patch or an unfinished item.
 * This is part of the `ek` => `nk` group/standalone split, not a style choice.
 */
export function shouldDemoteCompletedSingleGroup<T extends GroupActivityItem>(
  items: readonly T[], state: ActivityGroupHeaderState<T>,
): boolean {
  if (state.kind !== "summary" || items.length !== 1) return false;
  const item = items[0];
  if (item == null || isActiveGroupMember(item)) return false;
  if (item.type !== "patch") return true;
  if (item.changes == null || typeof item.changes !== "object" || Array.isArray(item.changes)) return false;
  return Object.keys(item.changes).length === 1 &&
    (!Array.isArray(item.visualizationActivities) || item.visualizationActivities.length === 0);
}
