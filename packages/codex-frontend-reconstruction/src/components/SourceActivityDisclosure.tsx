import * as React from "react";
import {
  frameSourceDisclosurePhase,
  finishSourceDisclosurePhase,
  initialSourceDisclosurePhase,
  isSourceDisclosureMounted,
  isSourceDisclosureOpen,
  toggleSourceDisclosurePhase,
  type SourceActivityDisclosurePhase,
} from "../conversation/SourceActivityDisclosureModel.js";

/**
 * A_ semantic disclosure for source XO / V_ subgroup rows.
 * The original renders a motion div with height/opacity transitions and
 * lazy function children; CSS grid supplies a host-independent visual
 * transition until the private motion runtime can be reconstructed.
 */
export interface SourceActivityDisclosureProps {
  kind: "mcp-tool-call" | "external-event";
  headerVariant?: "mcp-tool" | "codex-action" | "external-event";
  summary: React.ReactNode;
  icon?: React.ReactNode;
  children: () => React.ReactNode;
  onExpand?: () => void;
  canExpand?: boolean;
  defaultExpanded?: boolean;
}

export function SourceActivityDisclosure({
  kind, headerVariant, summary, icon, children, onExpand,
  canExpand = true, defaultExpanded = false,
}: SourceActivityDisclosureProps) {
  const [phase, setPhase] = React.useState<SourceActivityDisclosurePhase>(
    () => initialSourceDisclosurePhase({canExpand,defaultExpanded,hasLazyChildren:true}),
  );
  const contentId = React.useId();
  const effectivePhase = canExpand ? phase : "collapsed";
  const visible = isSourceDisclosureOpen(effectivePhase);
  const mounted = canExpand && isSourceDisclosureMounted(effectivePhase);
  const open = effectivePhase === "expanded";

  React.useEffect(() => {
    if (phase !== "opening") return;
    const frame = requestAnimationFrame(() =>
      setPhase(current => frameSourceDisclosurePhase(current)));
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  const toggle = () => {
    const next = toggleSourceDisclosurePhase(effectivePhase,canExpand);
    if (next.invokeOnExpand) onExpand?.();
    setPhase(next.phase);
  };

  const endTransition: React.TransitionEventHandler<HTMLDivElement> = event => {
    if (event.target !== event.currentTarget ||
        event.propertyName !== "grid-template-rows") return;
    setPhase(current => finishSourceDisclosurePhase(current));
  };

  return <div className="codex-activity-group-row__repeated"
    data-codex-source-repeated-group={kind}
    data-codex-source-repeated-header-variant={headerVariant}
    data-source-disclosure-phase={effectivePhase}>
    <div className="codex-activity-group-row__repeated-header">
      {icon != null ? <span className="codex-activity-group-row__repeated-icon"
        aria-hidden="true">{icon}</span> : null}
      <button type="button" className="codex-activity-group-row__repeated-toggle"
        data-codex-source-repeated-toggle=""
        aria-expanded={visible} aria-controls={contentId}
        disabled={!canExpand} onClick={toggle}>
        <span className="codex-activity-group-row__repeated-title">{summary}</span>
        <span className="codex-activity-group-row__repeated-chevron"
          aria-hidden="true">›</span>
      </button>
    </div>
    {mounted ? <div id={contentId}
      className="codex-activity-group-row__repeated-motion"
      data-source-disclosure-motion=""
      aria-hidden={!open}
      onTransitionEnd={endTransition}>
      <div className="codex-activity-group-row__repeated-motion-inner">
        <div className="codex-activity-group-row__repeated-body"
          data-codex-source-repeated-body="">
          {children()}
        </div>
      </div>
    </div> : null}
  </div>;
}
