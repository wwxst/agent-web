/**
 * Typed semantic reconstruction of the pure layout helpers exported by
 * `thread-virtualizer-e1964ca5c039.js`.
 *
 * The compiled source uses distance-from-bottom coordinates. The layout arrays
 * therefore contain descending bottom offsets even though entries are stored
 * in normal top-to-bottom order.
 */

export const DEFAULT_ESTIMATED_ROW_HEIGHT_PX = 280;
export const DEFAULT_VIRTUALIZER_OVERSCAN_COUNT = 2;
export const DEFAULT_TURN_SCROLL_MARGIN_PX = 10;

export interface ThreadVirtualizerEntry {
  turnKey: string;
  type?: string | undefined;
  minHeightPx?: number | null | undefined;
  estimatedHeightPx?: number | null | undefined;
  gapBeforePx?: number | null | undefined;
}

export interface ThreadVirtualizerLayout {
  bottomOffsetsPx: number[];
  collapseEmptyRows: boolean;
  gapKeys: Set<string>;
  gapsBeforePx: number[];
  heightsPx: number[];
  topOffsetsPx: number[];
  totalHeightPx: number;
  turnIndexByKey: Map<string, number>;
  turnKeys: string[];
}

export interface ThreadVirtualizerRange {
  startIndex: number;
  endIndex: number;
}

export interface BuildThreadVirtualizerLayoutOptions {
  collapseEmptyRows?: boolean | undefined;
  entries: ThreadVirtualizerEntry[];
  gapPx: number;
  measuredHeightsByKey?: Readonly<Record<string, number | null | undefined>> | undefined;
  pixelScale?: number | null | undefined;
}

function scalePixel(value: number, pixelScale: number | null | undefined): number {
  return pixelScale == null ? value : Math.round(value * pixelScale) / pixelScale;
}

/** Mirrors the compiled layout builder, including its 280px fallback estimate. */
export function buildThreadVirtualizerLayout(
  options: BuildThreadVirtualizerLayoutOptions,
): ThreadVirtualizerLayout {
  const collapseEmptyRows = options.collapseEmptyRows ?? false;
  const measured = options.measuredHeightsByKey ?? {};
  const pixelScale = options.pixelScale;
  const gapKeys = new Set<string>();
  const gapsBeforePx: number[] = [];
  const heightsPx: number[] = [];
  const topOffsetsPx: number[] = [];
  const turnIndexByKey = new Map<string, number>();
  const turnKeys: string[] = [];
  let totalHeightPx = 0;

  for (const [index, entry] of options.entries.entries()) {
    const key = entry.turnKey;
    let height = Math.max(
      entry.minHeightPx ?? 0,
      measured[key] ?? entry.estimatedHeightPx ?? DEFAULT_ESTIMATED_ROW_HEIGHT_PX,
    );
    height = scalePixel(height, pixelScale);

    let gap = (
      collapseEmptyRows
        ? totalHeightPx > 0 && height > 0
        : index > 0
    )
      ? entry.gapBeforePx ?? options.gapPx
      : 0;
    gap = scalePixel(gap, pixelScale);

    totalHeightPx += gap;
    gapsBeforePx.push(gap);
    if (entry.type === "gap") gapKeys.add(key);
    turnIndexByKey.set(key, index);
    turnKeys.push(key);
    topOffsetsPx.push(totalHeightPx);
    heightsPx.push(height);
    totalHeightPx += height;
  }

  const bottomOffsetsPx = topOffsetsPx.map(
    (top, index) => totalHeightPx - top - (heightsPx[index] ?? 0),
  );

  return {
    bottomOffsetsPx,
    collapseEmptyRows,
    gapKeys,
    gapsBeforePx,
    heightsPx,
    topOffsetsPx,
    totalHeightPx,
    turnIndexByKey,
    turnKeys,
  };
}

/** Binary search used by the compiled virtualizer for bottom-distance coordinates. */
function firstBottomOffsetBelow(offsets: number[], distance: number): number {
  let low = 0;
  let high = offsets.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if ((offsets[middle] ?? 0) < distance) high = middle;
    else low = middle + 1;
  }
  return low;
}

/** Finds the first row whose top edge is strictly above the supplied bottom distance. */
function firstRowTopAtOrBelowDistance(
  bottomOffsets: number[],
  heights: number[],
  distance: number,
): number {
  let low = 0;
  let high = bottomOffsets.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if ((bottomOffsets[middle] ?? 0) + (heights[middle] ?? 0) <= distance) {
      high = middle;
    } else {
      low = middle + 1;
    }
  }
  return low;
}

/** Returns the row window intersecting the viewport plus overscan rows. */
export function getVisibleThreadRange(options: {
  distanceFromBottomPx: number;
  layout: ThreadVirtualizerLayout;
  overscanCount: number;
  viewportHeightPx: number;
}): ThreadVirtualizerRange {
  const { layout } = options;
  if (layout.turnKeys.length === 0) return { startIndex: 0, endIndex: 0 };

  const distance = Math.min(
    Math.max(0, options.distanceFromBottomPx),
    layout.totalHeightPx,
  );
  const viewportHeight = Math.max(0, options.viewportHeightPx);
  const viewportEndDistance = Math.min(distance + viewportHeight, layout.totalHeightPx);

  const firstCandidate = layout.collapseEmptyRows && viewportEndDistance === layout.totalHeightPx
    ? 0
    : firstBottomOffsetBelow(layout.bottomOffsetsPx, viewportEndDistance);

  const lastCandidate = layout.collapseEmptyRows && distance === 0
    ? layout.turnKeys.length
    : firstRowTopAtOrBelowDistance(layout.bottomOffsetsPx, layout.heightsPx, distance);

  const overscan = Math.max(0, options.overscanCount);
  return {
    startIndex: Math.max(0, firstCandidate - overscan),
    endIndex: Math.min(
      layout.turnKeys.length,
      Math.max(lastCandidate, firstCandidate + 1) + overscan,
    ),
  };
}

/** Reanchors a rendered window to a key while retaining its previous row count. */
export function reanchorThreadRange(options: {
  anchorKey: string;
  layout: ThreadVirtualizerLayout;
  previousRange: ThreadVirtualizerRange;
}): ThreadVirtualizerRange | null {
  const index = options.layout.turnIndexByKey.get(options.anchorKey);
  if (index == null) return null;
  return {
    startIndex: index,
    endIndex: Math.min(
      options.layout.turnKeys.length,
      index + options.previousRange.endIndex - options.previousRange.startIndex,
    ),
  };
}

/** Keeps the same row's top edge at the same viewport position after layout changes. */
export function adjustDistanceFromBottomForLayoutChange(options: {
  anchorKey: string;
  distanceFromBottomPx: number;
  nextLayout: ThreadVirtualizerLayout;
  previousLayout: ThreadVirtualizerLayout;
}): number | null {
  const previousIndex = options.previousLayout.turnIndexByKey.get(options.anchorKey);
  const nextIndex = options.nextLayout.turnIndexByKey.get(options.anchorKey);
  if (previousIndex == null || nextIndex == null) return null;

  const previousTopDistance =
    (options.previousLayout.bottomOffsetsPx[previousIndex] ?? 0) +
    (options.previousLayout.heightsPx[previousIndex] ?? 0);
  const nextTopDistance =
    (options.nextLayout.bottomOffsetsPx[nextIndex] ?? 0) +
    (options.nextLayout.heightsPx[nextIndex] ?? 0);

  return Math.max(
    0,
    options.distanceFromBottomPx + nextTopDistance - previousTopDistance,
  );
}

/** Computes the distance-from-bottom needed to center a turn in the viewport. */
export function getDistanceToCenterTurn(options: {
  layout: ThreadVirtualizerLayout;
  turnKey: string;
  viewportHeightPx: number;
}): number | null {
  const index = options.layout.turnIndexByKey.get(options.turnKey);
  if (index == null) return null;
  return Math.max(
    0,
    (options.layout.bottomOffsetsPx[index] ?? 0) -
      options.viewportHeightPx / 2 +
      (options.layout.heightsPx[index] ?? 0) / 2,
  );
}

/**
 * Mirrors the compiled non-center turn navigation target. The reference uses
 * a 10px margin to keep the row away from the viewport edge.
 */
export function getDistanceToTurn(options: {
  align: "center" | "top" | "bottom" | string;
  layout: ThreadVirtualizerLayout;
  turnKey: string;
  viewportHeightPx: number;
  scrollMarginPx?: number | undefined;
}): number | null {
  if (options.align === "center") {
    return getDistanceToCenterTurn(options);
  }
  const index = options.layout.turnIndexByKey.get(options.turnKey);
  if (index == null) return null;
  return Math.max(
    0,
    (options.layout.bottomOffsetsPx[index] ?? 0) +
      (options.layout.heightsPx[index] ?? 0) -
      options.viewportHeightPx +
      (options.scrollMarginPx ?? DEFAULT_TURN_SCROLL_MARGIN_PX),
  );
}

/**
 * Selects a measured, visible row to anchor while the layout changes. This
 * follows the compiled selector's rules for gap rows and collapsed zero-height
 * rows. `preferLatestVisibleRow` selects the last qualifying row in the scan.
 */
export function findVisibleMeasuredAnchor(options: {
  distanceFromBottomPx: number;
  layout: ThreadVirtualizerLayout;
  measuredHeightsByKey: Readonly<Record<string, number | null | undefined>>;
  nextLayout: ThreadVirtualizerLayout;
  preferLatestVisibleRow: boolean;
  viewportHeightPx: number;
}): string | null {
  const effectiveViewportHeight = Math.max(
    0,
    options.viewportHeightPx + Math.min(0, options.distanceFromBottomPx),
  );
  const range = getVisibleThreadRange({
    distanceFromBottomPx: options.distanceFromBottomPx,
    layout: options.layout,
    overscanCount: 0,
    viewportHeightPx: effectiveViewportHeight,
  });
  let anchor: string | null = null;

  for (let index = range.startIndex; index < range.endIndex; index += 1) {
    const key = options.layout.turnKeys[index];
    if (key == null) continue;
    const height = options.layout.heightsPx[index] ?? 0;
    const bottom = options.layout.bottomOffsetsPx[index] ?? 0;
    const intersectsViewport =
      bottom < options.distanceFromBottomPx + options.viewportHeightPx &&
      bottom + height > options.distanceFromBottomPx;
    const eligible =
      !options.layout.gapKeys.has(key) &&
      (!options.layout.collapseEmptyRows || height > 0) &&
      options.measuredHeightsByKey[key] != null &&
      options.nextLayout.turnIndexByKey.has(key) &&
      intersectsViewport;

    if (!eligible) continue;
    if (options.preferLatestVisibleRow) {
      anchor = key;
    } else {
      anchor ??= key;
      if (bottom + height <= options.distanceFromBottomPx + options.viewportHeightPx) {
        return key;
      }
    }
  }

  return anchor;
}

/** Captures measured heights plus an anchor/count descriptor for restoring a rendered window. */
export function captureRenderedWindow(options: {
  measuredHeightsByKey: Readonly<Record<string, number | null | undefined>>;
  range: ThreadVirtualizerRange;
  turnKeys: string[];
}): {
  renderedWindow: { anchorKey: string; count: number };
  turnHeightsByKey: Record<string, number>;
} | null {
  const turnHeightsByKey: Record<string, number> = {};
  for (const key of options.turnKeys) {
    const height = options.measuredHeightsByKey[key];
    if (height != null) turnHeightsByKey[key] = height;
  }
  const anchorKey = options.turnKeys[options.range.startIndex];
  if (Object.keys(turnHeightsByKey).length === 0 || anchorKey == null) return null;
  return {
    renderedWindow: {
      anchorKey,
      count: options.range.endIndex - options.range.startIndex,
    },
    turnHeightsByKey,
  };
}

/** Checks whether the current rendered range already covers the requested range. */
export function isThreadRangeContained(
  current: ThreadVirtualizerRange,
  requested: ThreadVirtualizerRange,
): boolean {
  return current.startIndex <= requested.startIndex &&
    current.endIndex >= requested.endIndex;
}
