import * as React from "react";
import {
  projectActivityGroupHeader,
  getActiveActivityHeaderLabel,
  type GroupActivityItem,
  type ActivityHeaderMessage,
  type ActivityGroupHeaderState,
  type ActivityGroupStateOptions,
} from "../conversation/AgentActivityGroupPresentation.js";
import type { SourceRepeatedActivityRow } from "../conversation/SourceRepeatedActivityGroups.js";
import { SourceActivityDisclosure } from "./SourceActivityDisclosure.js";
import "./codexActivityGroupRow.css";

export interface CodexActivityGroupRowProps<T extends GroupActivityItem>
  extends Omit<ActivityGroupStateOptions<T>, "items"> {
  items: readonly T[];
  /** Original nk uses mk-filtered H for the child list, while the header sees all items. */
  detailItems?: readonly T[];
  /** Original Je/bg subgroup partition, driven only by verified host fields. */
  getRepeatedRows?: (items: readonly T[]) => readonly SourceRepeatedActivityRow<T>[];
  renderRepeatedSummary?: (group: SourceRepeatedActivityRow<T>) => React.ReactNode;
  /** Original XO passes mv icon; V_ passes bv icon, resolved by the host. */
  renderRepeatedIcon?: (group: SourceRepeatedActivityRow<T>) => React.ReactNode;
  /** Host owns real source We/Sg completed aggregate, localization and icon metadata. */
  renderCompletedSummary(items: readonly T[]): React.ReactNode;
  renderRow(item: T, index: number): React.ReactNode;
  translateMessage(message: ActivityHeaderMessage): React.ReactNode;
  renderHostActiveLabel?(item: T): React.ReactNode;
  renderIcon?(state: ActivityGroupHeaderState<T>): React.ReactNode;
  formatWebSearch?: (action: string | undefined, query: string | undefined) => string;
  conversationDetailLevel?: "STEPS_PROSE" | "DETAILED" | string;
  /** Private mk/rk canExpand; caller must decide (not guessed here). */
  canExpand: boolean;
  /** Source A_ defaults to collapsed; explicit host control for exceptional states. */
  defaultExpanded?: boolean;
  onExpand?: () => void;
}

/**
 * Source-aligned `nk`/`ak` group header wired to original Xe/Ze/Q and sk text
 * selection, with A_'s collapsed-by-default item disclosure. This does not
 * reimplement the original motion runtime or private We aggregation.
 */
export function CodexActivityGroupRow<T extends GroupActivityItem>(props: CodexActivityGroupRowProps<T>) {
  const [expanded, setExpanded] = React.useState(props.defaultExpanded ?? false);
  const contentId = React.useId();
  const state = projectActivityGroupHeader(props);
  const visibleRows = props.detailItems ?? props.items;
  const subgroups = props.getRepeatedRows?.(visibleRows) ??
    visibleRows.map((item,index) => ({key:"single:"+index,kind:"single" as const,items:[item]}));
  let heading: React.ReactNode;
  if (state.kind === "summary") {
    heading = props.renderCompletedSummary(props.items);
  } else if (state.kind === "thinking") {
    heading = props.translateMessage({ id: "thinkingShimmer.default", defaultMessage: "Thinking" });
  } else {
    const active = getActiveActivityHeaderLabel(state.item, props.conversationDetailLevel ?? "STEPS_PROSE", props.formatWebSearch);
    heading = active.kind === "message" ? props.translateMessage(active.message)
      : active.kind === "text" ? active.text : props.renderHostActiveLabel?.(state.item)
        ?? props.translateMessage({ id: "thinkingShimmer.default", defaultMessage: "Thinking" });
  }
  const onToggle = () => {
    if (!props.canExpand) return;
    if (!expanded) props.onExpand?.();
    setExpanded(value => !value);
  };
  return <section className="codex-activity-group-row" data-codex-activity-group=""
    data-codex-group-state={state.kind} data-codex-group-expanded={props.canExpand && expanded}>
    <div className="codex-activity-group-row__header">
      {props.renderIcon != null ? <span className="codex-activity-group-row__icon" aria-hidden="true">{props.renderIcon(state)}</span> : null}
      {props.canExpand ? <button type="button" className="codex-activity-group-row__toggle"
        aria-expanded={expanded} aria-controls={contentId} onClick={onToggle}>
        <span className="codex-activity-group-row__heading">{heading}</span>
        <span aria-hidden="true" className="codex-activity-group-row__chevron">{expanded ? "⌄" : "›"}</span>
      </button> : <span className="codex-activity-group-row__heading">{heading}</span>}
    </div>
    <div id={contentId} className="codex-activity-group-row__details vertical-scroll-fade-mask" data-codex-group-details=""
      data-source-group-scroll=""
      hidden={!props.canExpand || !expanded}>
      {props.canExpand && expanded ? subgroups.map(group => {
        const first=group.items[0];
        if (first == null) return null;
        const renderChild=(item:T) => <div className="codex-activity-group-row__subrow"
          key={typeof item.id === "string" ? item.id : String(visibleRows.indexOf(item))}>
          {props.renderRow(item,visibleRows.indexOf(item))}
        </div>;
        if (group.kind === "single") return <React.Fragment key={group.key}>
          {group.items.map(renderChild)}
        </React.Fragment>;
        return <SourceActivityDisclosure key={group.key}
          kind={group.kind}
          summary={props.renderRepeatedSummary?.(group)}
          icon={props.renderRepeatedIcon?.(group)}>
          {() => group.items.map(renderChild)}
        </SourceActivityDisclosure>;
      }) : null}
    </div>
  </section>;
}
