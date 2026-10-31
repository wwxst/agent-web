import * as React from "react";
import type { NavigationDestination } from "../conversation/NavigationRailModel.js";
import "./codexNavigationRail.css";

export interface CodexRailDestination extends NavigationDestination {
  icon: React.ReactNode;
  /** Navigation is inert until its host supplies a real handler. */
  onSelect?: () => void;
  /** A source-positioned icon whose original account route is not connected. */
  visualReferenceOnly?: boolean;
}

export interface CodexNavigationRailProps {
  /** Fixed/home and primary destinations, in source order. */
  destinations: readonly CodexRailDestination[];
  /** The source Explore/More popover trigger, rendered after primary items. */
  moreAction?: React.ReactNode;
  /** Account-pinned destinations rendered after the More divider. */
  secondaryDestinations?: readonly CodexRailDestination[];
  header?: React.ReactNode;
  footer?: React.ReactNode;
  onMeasuredWidthChange?: (px: number) => void;
}

/**
 * Reconstructed DOM hierarchy from app-initial-5851df3f6cb1.js `dWc`:
 * nav[data-app-navigation-rail] -> header, scrollable fixed/primary items,
 * Explore trigger + divider, account-pinned destinations, and footer.
 *
 * Account/store, drag-and-drop, route and popover behavior remain host
 * dependencies. Missing routes are rendered as visibly inert reference items,
 * never as working navigation.
 */
export function CodexNavigationRail({
  destinations,
  moreAction,
  secondaryDestinations = [],
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

  const renderDestination = (destination: CodexRailDestination) => <button
    key={destination.id}
    type="button"
    className="codex-navigation-rail__destination"
    data-sidebar-destination={destination.id}
    data-visual-reference-only={destination.visualReferenceOnly ? "true" : undefined}
    aria-label={destination.label}
    aria-current={destination.isCurrentDestination ? "page" : undefined}
    title={destination.onSelect
      ? destination.label
      : `${destination.label}（尚未接入）`}
    onClick={destination.onSelect}
    disabled={!destination.onSelect}
  ><span aria-hidden="true">{destination.icon}</span></button>;

  return <nav ref={navRef} className="codex-navigation-rail"
    data-app-navigation-rail="true" aria-label="应用导航">
    <div className="codex-navigation-rail__divider" aria-hidden="true"/>
    {header && <div className="codex-navigation-rail__header">{header}</div>}
    <div className="codex-navigation-rail__destinations" data-navigation-rail-scroll="true">
      {destinations.map(renderDestination)}
      {moreAction && <div className="codex-navigation-rail__more">{moreAction}</div>}
      {secondaryDestinations.length > 0 && <>
        <div className="codex-navigation-rail__section-divider"
          data-navigation-rail-separator="true" aria-hidden="true"/>
        {secondaryDestinations.map(renderDestination)}
      </>}
    </div>
    {footer && <div className="codex-navigation-rail__footer">{footer}</div>}
  </nav>;
}
