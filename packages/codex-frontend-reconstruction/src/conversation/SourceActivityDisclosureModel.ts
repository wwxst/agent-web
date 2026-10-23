/**
 * Source A_ four-phase disclosure state from the original
 * sites-end-resource-fa77a923096d.js.
 *
 * This is the state/visibility contract only: Codex's private motion
 * component, icon assets and text-transition scheduler are not embedded.
 */
export type SourceActivityDisclosurePhase = "collapsed" | "opening" | "expanded" | "closing";

export interface SourceDisclosureInitialOptions {
  canExpand?: boolean;
  defaultExpanded?: boolean;
  shouldAnimateInitialCollapse?: boolean;
  /** A_ does not animate initial collapse for lazy function children. */
  hasLazyChildren?: boolean;
}

export function initialSourceDisclosurePhase(options: SourceDisclosureInitialOptions): SourceActivityDisclosurePhase {
  if (options.canExpand === false) return "collapsed";
  if (options.defaultExpanded === true) return "expanded";
  return options.shouldAnimateInitialCollapse === true && options.hasLazyChildren !== true
    ? "closing" : "collapsed";
}

export interface SourceDisclosureToggle {
  phase: SourceActivityDisclosurePhase;
  /** A_ calls onExpand only when opening from a completely collapsed state. */
  invokeOnExpand: boolean;
}

export function toggleSourceDisclosurePhase(
  phase: SourceActivityDisclosurePhase, canExpand = true,
): SourceDisclosureToggle {
  if (!canExpand) return {phase: "collapsed", invokeOnExpand: false};
  if (phase === "opening" || phase === "expanded")
    return {phase: "closing", invokeOnExpand: false};
  if (phase === "closing")
    return {phase: "expanded", invokeOnExpand: false};
  return {phase: "opening", invokeOnExpand: true};
}

/** requestAnimationFrame in original A_: opening -> expanded. */
export function frameSourceDisclosurePhase(phase: SourceActivityDisclosurePhase): SourceActivityDisclosurePhase {
  return phase === "opening" ? "expanded" : phase;
}

/** Framer Motion onAnimationComplete in original A_: closing -> collapsed. */
export function finishSourceDisclosurePhase(phase: SourceActivityDisclosurePhase): SourceActivityDisclosurePhase {
  return phase === "closing" ? "collapsed" : phase;
}

/** A_ disclosure arrow considers opening to be expanded, before body accepts input. */
export const isSourceDisclosureOpen = (phase: SourceActivityDisclosurePhase): boolean =>
  phase === "opening" || phase === "expanded";

/** Body is retained through the closing animation, unmounted when collapsed. */
export const isSourceDisclosureMounted = (phase: SourceActivityDisclosurePhase): boolean =>
  phase !== "collapsed";
