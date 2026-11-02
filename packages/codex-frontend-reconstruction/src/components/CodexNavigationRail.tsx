import * as React from "react";
import type { NavigationDestination } from "../conversation/NavigationRailModel.js";
import "./codexNavigationRail.css";

export interface CodexRailDestination extends NavigationDestination {
  icon: React.ReactNode;
  /** Navigation is inert until its host supplies a real handler. */
  onSelect?: () => void;
}

export interface CodexNavigationRailProps {
  home?: CodexRailDestination;
  primaryDestinations?: readonly CodexRailDestination[];
  /** Direct/pinned destinations rendered below the Explore divider. */
  destinations: readonly CodexRailDestination[];
  header?: React.ReactNode;
  /** Source dWc customize slot (Plugins in the supplied Codex caller). */
  customize?: React.ReactNode;
  /** Source TUc Explore menu action; rendered before direct destinations. */
  explore?: React.ReactNode;
  footer?: React.ReactNode;
  onMeasuredWidthChange?: (px: number) => void;
}

/**
 * Reconstructed DOM hierarchy from app-initial-5851df3f6cb1.js `dWc`:
 * nav[data-app-navigation-rail] -> divider, header, scrolling stack
 * (home, primary destinations, customize, Explore, separator, direct
 * destinations), and footer/settings.
 * The source's account/store, drag-and-drop and popover controls are host
 * dependencies, not emulated here. Icons must be provided by the host.
 */
export function CodexNavigationRail({
  home,
  primaryDestinations = [],
  destinations,
  header,
  customize,
  explore,
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

  const renderDestination = (destination: CodexRailDestination, kind: string) => <button
    key={destination.id}
    type="button"
    className="codex-navigation-rail__destination"
    data-sidebar-destination={destination.id}
    data-navigation-rail-kind={kind}
    aria-label={destination.label}
    aria-current={destination.isCurrentDestination ? "page" : undefined}
    title={destination.onSelect ? destination.label : `${destination.label}（尚未接入）`}
    onClick={destination.onSelect}
    disabled={!destination.onSelect}
  ><span aria-hidden="true">{destination.icon}</span></button>;

  return <nav ref={navRef} className="codex-navigation-rail" data-app-navigation-rail="true" aria-label="App navigation">
    <div className="codex-navigation-rail__divider" aria-hidden="true"/>
    {header && <div className="codex-navigation-rail__header">{header}</div>}
    <div className="codex-navigation-rail__destinations" data-navigation-rail-scroll="true">
      {home && renderDestination(home,"home")}
      {primaryDestinations.map(destination=>renderDestination(destination,"primary"))}
      {customize}
      {explore}
      {explore&&destinations.length>0&&<div
        className="codex-navigation-rail__section-divider"
        data-navigation-rail-section-divider="true"
        aria-hidden="true"/>}
      {destinations.map(destination=>renderDestination(destination,"direct"))}
    </div>
    {footer && <div className="codex-navigation-rail__footer">{footer}</div>}
  </nav>;
}
