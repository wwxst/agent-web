import * as React from "react";
import {
  projectAgentActivityCollapse,
  type AgentActivityItem,
  type AgentActivityUnit,
  type AgentActivityCollapseOptions,
} from "../conversation/AgentActivityProjection.js";
import "./codexAgentActivity.css";

export interface CodexAgentActivityProps<T extends AgentActivityItem> extends
  Omit<AgentActivityCollapseOptions<T>, "persistedCollapsed"> {
  /** Controlled state from the real conversation host; undefined uses local state. */
  persistedCollapsed?: boolean | null;
  onSetCollapsed?: (next: boolean) => void;
  renderUnit(unit: AgentActivityUnit<T>): React.ReactNode;
  renderWorkedFor?(item: T): React.ReactNode;
  /** Private summary labels/icons remain host-supplied, not fabricated translations. */
  renderSummary?(messageCount: number, workedFor: T | null): React.ReactNode;
}

/**
 * Source-backed Rk/Hk composition without private animation/render engines.
 * Collapsed content is not mounted; persistent rows remain mounted. There is no
 * fake approval, file mutation, IPC, or automatic expansion side effect.
 */
export function CodexAgentActivity<T extends AgentActivityItem>(props: CodexAgentActivityProps<T>) {
  const [localCollapsed, setLocalCollapsed] = React.useState<boolean | null>(null);
  const { units, renderUnit, renderWorkedFor, renderSummary, onSetCollapsed } = props;
  const result = projectAgentActivityCollapse({
    units,
    hasFinalAssistantStarted: props.hasFinalAssistantStarted,
    isTurnCancelled: props.isTurnCancelled,
    allowCollapseBeforeFinal: props.allowCollapseBeforeFinal,
    forceExpanded: props.forceExpanded,
    disableCollapse: props.disableCollapse,
    preventAutoCollapse: props.preventAutoCollapse,
    persistedCollapsed: props.persistedCollapsed ?? localCollapsed,
    hasInlineSubagentActivity: props.hasInlineSubagentActivity,
    hasFollowingFinalAnswer: props.hasFollowingFinalAnswer,
    keepMcpAppEntriesPersistent: props.keepMcpAppEntriesPersistent,
    renderMcpApps: props.renderMcpApps,
    adapters: props.adapters,
  });
  const detailsId = React.useId();
  const renderUnits = (rows: readonly AgentActivityUnit<T>[], group: string) => rows.map(unit =>
    <React.Fragment key={unit.key}><div data-agent-activity-unit={unit.key} data-agent-activity-section={group}>
      {renderUnit(unit)}
    </div></React.Fragment>);
  const toggle = () => {
    const next = !result.isCollapsed;
    if (props.persistedCollapsed == null) setLocalCollapsed(next);
    onSetCollapsed?.(next);
  };
  return <section className="codex-agent-activity" data-recovered-agent-activity="" data-agent-activity-collapsed={result.isCollapsed}>
    {renderUnits(result.preToggleUnits, "before-toggle")}
    {result.canToggle ? <button type="button" className="codex-agent-activity__toggle"
      aria-expanded={!result.isCollapsed} aria-controls={detailsId} onClick={toggle}>
      <span className="codex-agent-activity__toggle-icon" aria-hidden="true">{result.isCollapsed ? "›" : "⌄"}</span>
      <span>{renderSummary?.(result.collapsedMessageCount, result.workedForItem) ??
        `${result.collapsedMessageCount} activities`}</span>
    </button> : null}
    {result.isCollapsed && result.persistentUnits.length > 0
      ? <div className="codex-agent-activity__persistent" data-agent-activity-persistent="">
          {renderUnits(result.persistentUnits, "persistent")}
        </div> : null}
    <div id={detailsId} className="codex-agent-activity__details" hidden={result.isCollapsed}
      data-agent-activity-content="">
      {!result.isCollapsed && renderUnits(result.expandedUnits, "expanded")}
      {!result.isCollapsed && result.workedForItem != null && renderWorkedFor?.(result.workedForItem)}
    </div>
  </section>;
}
