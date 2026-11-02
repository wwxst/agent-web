import * as React from "react";
import type { NavigationDestination } from "../conversation/NavigationRailModel.js";
import "./codexNavigationRail.css";

export interface CodexRailDestination extends NavigationDestination {
  icon: React.ReactNode;
  /** Source dWc keeps pinned destinations after the Explore separator. */
  group?: "primary" | "pinned";
  /** Navigation is inert until its host supplies a real handler. */
  onSelect?: () => void;
}

export interface CodexNavigationRailProps {
  destinations: readonly CodexRailDestination[];
  header?: React.ReactNode;
  /** Source TUc Explore action, kept separate from pinned destinations. */
  moreAction?: React.ReactNode;
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
  moreAction,
  footer,
  onMeasuredWidthChange,
}: CodexNavigationRailProps): React.ReactElement {
  const primaryDestinations=destinations.filter(item=>item.group!=="pinned");
  const pinnedDestinations=destinations.filter(item=>item.group==="pinned");
  const renderDestination=(destination:CodexRailDestination)=><button
    key={destination.id}
    type="button"
    className="codex-navigation-rail__destination"
    data-sidebar-destination={destination.id}
    aria-label={destination.label}
    aria-current={destination.isCurrentDestination?"page":undefined}
    title={destination.onSelect?destination.label:`${destination.label}（尚未接入）`}
    onClick={destination.onSelect}
    disabled={!destination.onSelect}
  ><span aria-hidden="true">{destination.icon}</span></button>;
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
      {primaryDestinations.map(renderDestination)}
      {moreAction!=null&&<div className="codex-navigation-rail__more">{moreAction}</div>}
      {pinnedDestinations.length>0&&<div
        className="codex-navigation-rail__section-divider" aria-hidden="true"/>}
      {pinnedDestinations.map(renderDestination)}
    </div>
    {footer && <div className="codex-navigation-rail__footer">{footer}</div>}
  </nav>;
}
