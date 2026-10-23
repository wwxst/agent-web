/**
 * Source-evidenced navigation projection (not the original account/store).
 * Evidence: app-initial-5851df3f6cb1.js: dWc, GZc, QZc.
 * dWc renders the direct destinations in a separate navigation rail;
 * GZc/QZc omit those navigation entries from the secondary panel when
 * navigationRailEnabled is true. The conversation/project sections of the
 * secondary panel are unrelated and intentionally preserved.
 *
 * The original reorder/account/peek state is NOT reconstructed here. Callers
 * must supply the resolved direct/more IDs and action permissions explicitly.
 */
export interface NavigationDestination {
  id: string;
  label: string;
  isCurrentDestination?: boolean;
  visibleByDefault?: boolean;
  canReorder?: boolean;
}

export interface NavigationProjectionOptions {
  navigationRailEnabled: boolean;
  directDestinationIds: readonly string[];
  moreDestinationIds?: readonly string[];
}

export interface NavigationProjection {
  /** Direct destinations owned by the independently rendered rail. */
  railDestinations: NavigationDestination[];
  /** Destinations in the *navigation section* of the content sidebar. */
  sidebarDestinations: NavigationDestination[];
  /** Secondary navigation overflow is hidden when the rail owns navigation. */
  sidebarMoreDestinations: NavigationDestination[];
}

/** Resolves identity and order; rejects duplicates instead of inventing items. */
export function projectNavigationDestinations(
  available: readonly NavigationDestination[],
  options: NavigationProjectionOptions,
): NavigationProjection {
  const byId = new Map(available.map((item) => [item.id, item]));
  const resolve = (ids: readonly string[], used: Set<string>): NavigationDestination[] => {
    const entries: NavigationDestination[] = [];
    for (const id of ids) {
      const destination = byId.get(id);
      if (!destination || used.has(id)) continue;
      used.add(id);
      entries.push(destination);
    }
    return entries;
  };
  const seen = new Set<string>();
  const direct = resolve(options.directDestinationIds, seen);
  const more = resolve(options.moreDestinationIds ?? [], seen);
  return {
    railDestinations: options.navigationRailEnabled ? direct : [],
    sidebarDestinations: options.navigationRailEnabled ? [] : direct,
    sidebarMoreDestinations: options.navigationRailEnabled ? [] : more,
  };
}
