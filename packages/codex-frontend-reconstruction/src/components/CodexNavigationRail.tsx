import * as React from "react";
import type { NavigationDestination } from "../conversation/NavigationRailModel.js";
import "./codexNavigationRail.css";

export interface CodexRailDestination extends NavigationDestination {
  icon: React.ReactNode;
  /** Navigation is inert until its host supplies a real handler. */
  onSelect?: () => void;
}

export interface CodexNavigationRailProps {
  destinations: readonly CodexRailDestination[];
  header?: React.ReactNode;
  footer?: React.ReactNode;
  onMeasuredWidthChange?: (px: number) => void;
}

/**
 * Reconstructed DOM hierarchy from app-initial-5851df3f6cb1.js `dWc`:
 * nav[data-app-navigation-rail] -> header, scrolling destinations, footer.
 * The source's account/store, drag-and-drop and popover controls are host
 * dependencies, not emulated here. Icons must be provided by the host.
 */
export function CodexNavigationRail({
  destinations,
  header,
  footer,
  onMeasuredWidthChange,
}: CodexNavigationRailProps): React.ReactElement {
  const navRef = React.useRef<HTMLElement | null>(null);
  React.useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav || !onMeasuredWidthChange) return;
    const measure = () => {
      if (nav.clientWidth > 0) onMeasuredWidthChange(nav.clientWidth);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [onMeasuredWidthChange]);

  return <nav ref={navRef} className="codex-navigation-rail" data-app-navigation-rail="true" aria-label="App navigation">
    <div className="codex-navigation-rail__divider" aria-hidden="true"/>
    {header && <div className="codex-navigation-rail__header">{header}</div>}
    <div className="codex-navigation-rail__destinations" data-navigation-rail-scroll="true">
      {destinations.map((destination) => <button
        key={destination.id}
        type="button"
        className="codex-navigation-rail__destination"
        data-sidebar-destination={destination.id}
        aria-label={destination.label}
        aria-current={destination.isCurrentDestination ? "page" : undefined}
        title={destination.onSelect ? destination.label : `${destination.label}（尚未接入）`}
        onClick={destination.onSelect}
        disabled={!destination.onSelect}
      ><span aria-hidden="true">{destination.icon}</span></button>)}
    </div>
    {footer && <div className="codex-navigation-rail__footer">{footer}</div>}
  </nav>;
}
