/**
 * Source-guided, host-neutral extraction of activity collapse logic from
 * frontend/webview/assets/sites-end-resource-fa77a923096d.js:
 *   Lk (collapse eligibility), kk (unit partition), Ak (persistent predicates),
 *   Bk (collapsed item count), Rk (composition), Hk (interactive disclosure).
 *
 * WARNING: private predicates for MCP widgets/assistant messages/dynamic calls
 * cannot be deduced from the compiled switch alone. They are required adapters.
 */

export interface AgentActivityItem {
  id?: string;
  type: string;
  completed?: boolean;
  [key: string]: unknown;
}

export type AgentActivityUnit<T extends AgentActivityItem = AgentActivityItem> =
  | { key: string; kind: "standalone"; item: T }
  | { key: string; kind: "group"; items: readonly T[] };

export interface AgentActivityPersistenceAdapters<T extends AgentActivityItem = AgentActivityItem> {
  /** Compiled Ak invokes private lg / ki / Eg predicates. No guessed result is used. */
  hasPersistentMcpToolCall?(item: T): boolean;
  hasPersistentAssistantMessage?(item: T): boolean;
  hasPersistentDynamicToolCall?(item: T): boolean;
  hasPersistentMcpWidget?(item: T): boolean;
}

export interface AgentActivityCollapseOptions<T extends AgentActivityItem = AgentActivityItem> {
  units: readonly AgentActivityUnit<T>[];
  hasFinalAssistantStarted: boolean;
  isTurnCancelled: boolean;
  allowCollapseBeforeFinal?: boolean;
  forceExpanded?: boolean;
  disableCollapse?: boolean;
  preventAutoCollapse?: boolean;
  persistedCollapsed?: boolean | null;
  hasInlineSubagentActivity?: boolean;
  hasFollowingFinalAnswer?: boolean;
  keepMcpAppEntriesPersistent?: boolean;
  renderMcpApps?: boolean;
  adapters?: AgentActivityPersistenceAdapters<T>;
}

export interface AgentActivityCollapseProjection<T extends AgentActivityItem = AgentActivityItem> {
  shouldAllowCollapse: boolean;
  isCollapsed: boolean;
  canToggle: boolean;
  /** Items before an inline leading realtime transcript, always visible. */
  preToggleUnits: AgentActivityUnit<T>[];
  /** Items that disappear inside the collapsed region. */
  collapsibleUnits: AgentActivityUnit<T>[];
  /** Items that appear inside the expanded region. */
  expandedUnits: AgentActivityUnit<T>[];
  /** Items that stay visible after the disclosure even when collapsed. */
  persistentUnits: AgentActivityUnit<T>[];
  collapsedMessageCount: number;
  workedForItem: T | null;
}

function isUnitPersistent<T extends AgentActivityItem>(
  unit: AgentActivityUnit<T>,
  index: number,
  lastAssistantIndex: number,
  opts: AgentActivityCollapseOptions<T>,
): boolean {
  // Ak only tests standalone units, never a grouped one.
  if (unit.kind !== "standalone") return false;
  const item = unit.item;
  switch (item.type) {
    case "user-input-response": return !item.completed;
    case "mcp-tool-call": return opts.adapters?.hasPersistentMcpToolCall?.(item) === true ||
      (opts.keepMcpAppEntriesPersistent === true && opts.renderMcpApps === true &&
       opts.adapters?.hasPersistentMcpWidget?.(item) === true);
    case "assistant-message": return opts.adapters?.hasPersistentAssistantMessage?.(item) === true;
    case "dynamic-tool-call": return opts.adapters?.hasPersistentDynamicToolCall?.(item) === true;
    case "user-message": return item.steeringStatus === "pending" ||
      item.deliveryStatus === "not-sent" || item.hookFeedback === true ||
      !(index < lastAssistantIndex);
    default: return false;
  }
}

/** Port of compiled Lk: disableCollapse forces expansion without changing eligibility. */
export function getAgentActivityCollapseEligibility(options: {
  hasFinalAssistantStarted: boolean;
  isTurnCancelled: boolean;
  hasRenderableAgentItems: boolean;
  allowCollapseBeforeFinal?: boolean | undefined;
  forceExpanded?: boolean | undefined;
  preventAutoCollapse?: boolean | undefined;
  persistedCollapsed?: boolean | null | undefined;
}): { shouldAllowCollapse: boolean; isCollapsed: boolean } {
  const shouldAllowCollapse = (options.allowCollapseBeforeFinal === true ||
    (options.hasFinalAssistantStarted && !options.isTurnCancelled)) && options.hasRenderableAgentItems;
  return shouldAllowCollapse
    ? { shouldAllowCollapse, isCollapsed: options.forceExpanded !== true &&
      (options.persistedCollapsed ?? (options.preventAutoCollapse !== true)) }
    : { shouldAllowCollapse: false, isCollapsed: false };
}

/** Recovered partition contract of kk; terminal display predicates remain injected. */
export function projectAgentActivityCollapse<T extends AgentActivityItem>(
  options: AgentActivityCollapseOptions<T>,
): AgentActivityCollapseProjection<T> {
  const units = options.units;
  const eligible = getAgentActivityCollapseEligibility({
    hasFinalAssistantStarted: options.hasFinalAssistantStarted,
    isTurnCancelled: options.isTurnCancelled,
    hasRenderableAgentItems: units.length > 0 || options.hasInlineSubagentActivity === true,
    allowCollapseBeforeFinal: options.allowCollapseBeforeFinal,
    forceExpanded: options.forceExpanded === true || options.disableCollapse === true,
    preventAutoCollapse: options.preventAutoCollapse,
    persistedCollapsed: options.persistedCollapsed,
  });
  const collapsibleUnits: AgentActivityUnit<T>[] = [];
  const expandedUnits: AgentActivityUnit<T>[] = [];
  const persistentUnits: AgentActivityUnit<T>[] = [];
  const preToggleUnits: AgentActivityUnit<T>[] = [];
  let workedForItem: T | null = null;

  // Compiled Rk only invokes kk while eligible and not force-expanded.
  const shouldPartition = eligible.shouldAllowCollapse && options.forceExpanded !== true && options.disableCollapse !== true;
  if (shouldPartition) {
    let lastAssistantIndex = options.hasFollowingFinalAnswer === true ? units.length : -1;
    if (lastAssistantIndex === -1) for (let i = units.length - 1; i >= 0; i--) {
      const unit = units[i];
      if (unit?.kind === "standalone" && unit.item.type === "assistant-message" &&
        options.adapters?.hasPersistentAssistantMessage?.(unit.item) === true) {
        lastAssistantIndex = i; break;
      }
    }
    for (const [index, unit] of units.entries()) {
      if (unit.kind === "standalone" && unit.item.type === "worked-for") {
        workedForItem = unit.item;
        continue;
      }
      if (unit.kind === "standalone" && unit.item.type === "realtime-transcript") {
        if (expandedUnits.length === 0) preToggleUnits.push(unit);
        else { expandedUnits.push(unit); persistentUnits.push(unit); }
        continue;
      }
      expandedUnits.push(unit);
      (isUnitPersistent(unit, index, lastAssistantIndex, options)
        ? persistentUnits : collapsibleUnits).push(unit);
    }
  } else {
    expandedUnits.push(...units);
    collapsibleUnits.push(...units);
  }
  // Rk disables the visible toggle for empty content and sole context-compaction.
  const count = collapsibleUnits.reduce((n, unit) => n + (unit.kind === "group" ? unit.items.length : 1), 0)
    + (options.hasInlineSubagentActivity === true ? 1 : 0);
  const soleCompaction = collapsibleUnits.length === 1 && !options.hasInlineSubagentActivity &&
    collapsibleUnits[0]?.kind === "standalone" && collapsibleUnits[0].item.type === "context-compaction";
  const canToggle = options.disableCollapse !== true && eligible.shouldAllowCollapse &&
    count > 0 && !soleCompaction;
  // Hk receives an empty toggleProps for non-toggleable content and leaves it expanded.
  const isCollapsed = canToggle && eligible.isCollapsed;
  // Rk's `!re && B.length === 0 && H.length === 0 && W.length === 0`
  // fallback renders the original units (not an empty worked-for-only row).
  if (!canToggle && expandedUnits.length === 0 && persistentUnits.length === 0 && preToggleUnits.length === 0) {
    expandedUnits.push(...units);
    workedForItem = null;
  }
  return {
    shouldAllowCollapse: eligible.shouldAllowCollapse,
    isCollapsed,
    canToggle,
    preToggleUnits,
    collapsibleUnits,
    expandedUnits,
    persistentUnits,
    collapsedMessageCount: count,
    workedForItem,
  };
}
