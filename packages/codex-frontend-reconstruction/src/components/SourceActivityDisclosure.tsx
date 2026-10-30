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
  const bodyRef=React.useRef<HTMLDivElement|null>(null);
  const toggleRef=React.useRef<HTMLButtonElement|null>(null);
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

  React.useEffect(()=>{
    if(phase!=="closing")return;
    // The original A_ owns a Framer Motion onAnimationComplete callback.
    // This independent CSS-grid equivalent cannot assume transitionend:
    // reduced motion, virtualized layout and skipped frames can omit it.
    const node=bodyRef.current;
    const style=node==null?null:window.getComputedStyle(node);
    const duration=(style?.transitionDuration??"0s").split(",").map(v=>
      v.trim().endsWith("ms")?Number.parseFloat(v):Number.parseFloat(v)*1000);
    const delay=(style?.transitionDelay??"0s").split(",").map(v=>
      v.trim().endsWith("ms")?Number.parseFloat(v):Number.parseFloat(v)*1000);
    const expected=Math.max(0,...duration.map((d,i)=>
      Number.isFinite(d)?d+(Number.isFinite(delay[i]??0)?delay[i]??0:0):0));
    const timeout=window.setTimeout(()=>
      setPhase(current=>finishSourceDisclosurePhase(current)),
      Math.min(2200,Math.max(60,expected+80)));
    return ()=>window.clearTimeout(timeout);
  },[phase]);

  const toggle = () => {
    // The original disclosure keeps exit-motion children mounted briefly.
    // Move focus to the persistent summary before making the exiting body
    // inert, otherwise keyboard focus can remain inside a hidden tool row.
    if(visible && typeof document!=="undefined" &&
      bodyRef.current?.contains(document.activeElement)){
      toggleRef.current?.focus();
    }
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
      <button ref={toggleRef} type="button" className="codex-activity-group-row__repeated-toggle"
        data-codex-source-repeated-toggle=""
        aria-expanded={visible} aria-controls={contentId}
        disabled={!canExpand} onClick={toggle}>
        <span className="codex-activity-group-row__repeated-title">{summary}</span>
        <span className="codex-activity-group-row__repeated-chevron"
          aria-hidden="true">›</span>
      </button>
    </div>
    {mounted ? <div id={contentId} ref={bodyRef}
      className="codex-activity-group-row__repeated-motion"
      data-source-disclosure-motion=""
      aria-hidden={!open}
      inert={!open}
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
