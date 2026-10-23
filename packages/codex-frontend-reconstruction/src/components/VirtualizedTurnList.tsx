import * as React from "react";
import {
  DEFAULT_TURN_SCROLL_MARGIN_PX,
  DEFAULT_VIRTUALIZER_OVERSCAN_COUNT,
  adjustDistanceFromBottomForLayoutChange,
  buildThreadVirtualizerLayout,
  findVisibleMeasuredAnchor,
  getDistanceToTurn,
  getVisibleThreadRange,
  type ThreadVirtualizerEntry,
  type ThreadVirtualizerLayout,
  type ThreadVirtualizerRange,
} from "../conversation/ThreadVirtualizerModel.js";

export interface VirtualizedTurnScrollController {
  getScrollElement(): HTMLElement | null;
  getLastScrollDistanceFromBottomPx(): number;
  subscribeScroll(listener: (distanceFromBottomPx: number) => void): () => void;
  scrollToDistanceFromBottomPx(
    distanceFromBottomPx: number,
    behavior?: ScrollBehavior,
    source?: "user" | "programmatic",
  ): void;
  compensateScrollToDistanceFromBottomPx?(distanceFromBottomPx: number): void;
}

export interface VirtualizedTurnRowProps<Entry extends ThreadVirtualizerEntry> {
  entry: Entry;
  latestTurnFooter?: React.ReactNode | undefined;
  latestTurnFollowContentRef?: React.Ref<HTMLDivElement> | undefined;
}

export interface VirtualizedTurnListApi {
  getEntryGeometry(turnKey: string): { startPx: number; endPx: number } | null;
  scrollToKey(
    turnKey: string,
    getTargetElement?: ((turnElement: HTMLElement) => HTMLElement | null) | undefined,
    options?: {
      align?: "center" | "top" | "bottom" | undefined;
      signal?: AbortSignal | undefined;
    } | undefined,
  ): Promise<void>;
}

export interface VirtualizedTurnListProps<Entry extends ThreadVirtualizerEntry> {
  entries: Entry[];
  RowComponent: React.ComponentType<VirtualizedTurnRowProps<Entry>>;
  scrollController: VirtualizedTurnScrollController;
  gapPx: number;
  collapseEmptyRows?: boolean | undefined;
  className?: string | undefined;
  overscanCount?: number | undefined;
  pixelScale?: number | undefined;
  windowZoom?: number | undefined;
  retainedTurnKeys?: readonly string[] | undefined;
  latestTurnFooter?: React.ReactNode | undefined;
  latestTurnFooterKey?: string | undefined;
  latestTurnFollowContentRef?: React.Ref<HTMLDivElement> | undefined;
  getBottomScrollPaddingPx?: (() => number) | undefined;
  normalizeMeasuredPixels?: ((cssPixels: number, windowZoom: number) => number) | undefined;
  onApiChange?: ((api: VirtualizedTurnListApi | null) => void) | undefined;
  onVisibleContentReady?: (() => void) | undefined;
  onViewportChange?: ((viewport: { viewportStartPx: number; viewportEndPx: number }) => void) | undefined;
}

interface NavigationRequest {
  turnKey: string;
  align: "center" | "top" | "bottom";
  getTargetElement?: ((turnElement: HTMLElement) => HTMLElement | null) | undefined;
  signal?: AbortSignal | undefined;
  resolve: () => void;
  abortHandler?: (() => void) | undefined;
}

function defaultNormalizeMeasuredPixels(cssPixels: number, windowZoom: number): number {
  return cssPixels / Math.max(windowZoom, 0.01);
}

function sameMeasuredHeight(
  previous: Readonly<Record<string, number>>,
  next: Readonly<Record<string, number>>,
): boolean {
  const previousKeys = Object.keys(previous);
  const nextKeys = Object.keys(next);
  return previousKeys.length === nextKeys.length &&
    nextKeys.every((key) => previous[key] === next[key]);
}

/**
 * Adapter-based reconstruction of the React virtualized turn-list shell from
 * `virtualized-turn-list-d00a3b041bce.js`.
 *
 * The Codex scroll controller, row renderer, Electron host and design-system
 * components are deliberately injected. This keeps the list reusable with an
 * Agent backend without pretending Codex's private IPC contract is compatible.
 */
export function VirtualizedTurnList<Entry extends ThreadVirtualizerEntry>(
  props: VirtualizedTurnListProps<Entry>,
) {
  const {
    entries,
    RowComponent,
    scrollController,
    gapPx,
    collapseEmptyRows = false,
    className,
    overscanCount = DEFAULT_VIRTUALIZER_OVERSCAN_COUNT,
    pixelScale,
    windowZoom = 1,
    retainedTurnKeys = [],
    latestTurnFooter,
    latestTurnFooterKey,
    latestTurnFollowContentRef,
    getBottomScrollPaddingPx,
    normalizeMeasuredPixels = defaultNormalizeMeasuredPixels,
    onApiChange,
    onVisibleContentReady,
    onViewportChange,
  } = props;

  const initialMeasuredHeights = React.useRef<Record<string, number>>({});
  const [measuredHeightsByKey, setMeasuredHeightsByKey] =
    React.useState<Record<string, number>>(initialMeasuredHeights.current);
  const [viewportHeightPx, setViewportHeightPx] = React.useState(800);
  const [distanceFromBottomPx, setDistanceFromBottomPx] = React.useState(
    () => Math.max(0, scrollController.getLastScrollDistanceFromBottomPx()),
  );
  const [navigation, setNavigation] = React.useState<NavigationRequest | null>(null);

  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const rowElementsRef = React.useRef(new Map<string, HTMLDivElement>());
  const rowRefCallbacksRef = React.useRef(
    new Map<string, (element: HTMLDivElement | null) => void>(),
  );
  const elementKeysRef = React.useRef(new WeakMap<Element, string>());
  const rowObserverRef = React.useRef<ResizeObserver | null>(null);
  const viewportObserverRef = React.useRef<ResizeObserver | null>(null);
  const pendingNavigationRef = React.useRef<NavigationRequest | null>(null);
  const layoutRef = React.useRef<ThreadVirtualizerLayout | null>(null);
  const measuredRef = React.useRef<Record<string, number>>({});
  const distanceRef = React.useRef(distanceFromBottomPx);
  distanceRef.current = distanceFromBottomPx;

  const effectivePixelScale = pixelScale ??
    (typeof window === "undefined" ? 1 : window.devicePixelRatio || 1);

  const layout = React.useMemo(
    () => buildThreadVirtualizerLayout({
      collapseEmptyRows,
      entries,
      gapPx,
      measuredHeightsByKey,
      pixelScale: effectivePixelScale,
    }),
    [collapseEmptyRows, entries, gapPx, measuredHeightsByKey, effectivePixelScale],
  );

  const finishNavigation = React.useCallback((request: NavigationRequest) => {
    if (request.signal != null && request.abortHandler != null) {
      request.signal.removeEventListener("abort", request.abortHandler);
    }
    if (pendingNavigationRef.current === request) {
      pendingNavigationRef.current = null;
      setNavigation(null);
    }
    request.resolve();
  }, []);

  const getRowRef = React.useCallback((turnKey: string) => {
    const cached = rowRefCallbacksRef.current.get(turnKey);
    if (cached != null) return cached;
    const callback = (element: HTMLDivElement | null) => {
      const previous = rowElementsRef.current.get(turnKey);
      if (previous != null && previous !== element) {
        rowObserverRef.current?.unobserve(previous);
        elementKeysRef.current.delete(previous);
        rowElementsRef.current.delete(turnKey);
      }
      if (element != null) {
        rowElementsRef.current.set(turnKey, element);
        elementKeysRef.current.set(element, turnKey);
        rowObserverRef.current?.observe(element);
      }
    };
    rowRefCallbacksRef.current.set(turnKey, callback);
    return callback;
  }, []);

  React.useLayoutEffect(() => {
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((records) => {
      const updates: Record<string, number> = {};
      for (const record of records) {
        const key = elementKeysRef.current.get(record.target);
        if (key == null) continue;
        const height = normalizeMeasuredPixels(record.contentRect.height, windowZoom);
        if (Number.isFinite(height) && height >= 0) updates[key] = height;
      }
      if (Object.keys(updates).length === 0) return;
      setMeasuredHeightsByKey((previous) => {
        const next = { ...previous };
        for (const [key, height] of Object.entries(updates)) next[key] = height;
        return sameMeasuredHeight(previous, next) ? previous : next;
      });
    });
    rowObserverRef.current = observer;
    for (const [key, element] of rowElementsRef.current) {
      elementKeysRef.current.set(element, key);
      observer.observe(element);
    }
    return () => {
      observer.disconnect();
      if (rowObserverRef.current === observer) rowObserverRef.current = null;
    };
  }, [normalizeMeasuredPixels, windowZoom]);

  React.useLayoutEffect(() => {
    const scrollElement = scrollController.getScrollElement();
    if (scrollElement == null) return;
    const updateViewportHeight = () => {
      setViewportHeightPx(scrollElement.clientHeight || 800);
    };
    updateViewportHeight();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(updateViewportHeight);
    observer.observe(scrollElement);
    return () => observer.disconnect();
  }, [scrollController]);

  React.useEffect(() => {
    const unsubscribe = scrollController.subscribeScroll((nextDistance) => {
      const next = Math.max(0, nextDistance);
      distanceRef.current = next;
      setDistanceFromBottomPx(next);
    });
    return unsubscribe;
  }, [scrollController]);

  React.useLayoutEffect(() => {
    const previousLayout = layoutRef.current;
    if (previousLayout != null && previousLayout !== layout && pendingNavigationRef.current == null) {
      const anchorKey = findVisibleMeasuredAnchor({
        distanceFromBottomPx: distanceRef.current,
        layout: previousLayout,
        measuredHeightsByKey: measuredRef.current,
        nextLayout: layout,
        preferLatestVisibleRow: distanceRef.current < viewportHeightPx,
        viewportHeightPx,
      });
      if (anchorKey != null) {
        const correctedDistance = adjustDistanceFromBottomForLayoutChange({
          anchorKey,
          distanceFromBottomPx: distanceRef.current,
          previousLayout,
          nextLayout: layout,
        });
        if (
          correctedDistance != null &&
          Math.abs(correctedDistance - distanceRef.current) > 0.5
        ) {
          distanceRef.current = correctedDistance;
          setDistanceFromBottomPx(correctedDistance);
          if (scrollController.compensateScrollToDistanceFromBottomPx != null) {
            scrollController.compensateScrollToDistanceFromBottomPx(correctedDistance);
          } else {
            scrollController.scrollToDistanceFromBottomPx(
              correctedDistance + Math.max(0, getBottomScrollPaddingPx?.() ?? 0),
              "instant",
              "programmatic",
            );
          }
        }
      }
    }
    layoutRef.current = layout;
    measuredRef.current = measuredHeightsByKey;
  }, [
    layout,
    measuredHeightsByKey,
    viewportHeightPx,
    scrollController,
    getBottomScrollPaddingPx,
  ]);

  const navigationDistance = navigation == null
    ? null
    : getDistanceToTurn({
        align: navigation.align,
        layout,
        turnKey: navigation.turnKey,
        viewportHeightPx,
        scrollMarginPx: DEFAULT_TURN_SCROLL_MARGIN_PX,
      });

  const effectiveDistanceFromBottomPx = navigationDistance ?? distanceFromBottomPx;
  const visibleRange: ThreadVirtualizerRange = React.useMemo(
    () => getVisibleThreadRange({
      distanceFromBottomPx: effectiveDistanceFromBottomPx,
      layout,
      overscanCount,
      viewportHeightPx,
    }),
    [effectiveDistanceFromBottomPx, layout, overscanCount, viewportHeightPx],
  );

  const getEntryGeometry = React.useCallback((turnKey: string) => {
    const index = layout.turnIndexByKey.get(turnKey);
    if (index == null) return null;
    const startPx = layout.topOffsetsPx[index];
    const heightPx = layout.heightsPx[index];
    if (startPx == null || heightPx == null) return null;
    return { startPx, endPx: startPx + heightPx };
  }, [layout]);

  const scrollToKey = React.useCallback((
    turnKey: string,
    getTargetElement?: ((turnElement: HTMLElement) => HTMLElement | null) | undefined,
    options?: {
      align?: "center" | "top" | "bottom" | undefined;
      signal?: AbortSignal | undefined;
    } | undefined,
  ) => new Promise<void>((resolve) => {
    if (options?.signal?.aborted || !layout.turnIndexByKey.has(turnKey)) {
      resolve();
      return;
    }
    if (pendingNavigationRef.current != null) {
      finishNavigation(pendingNavigationRef.current);
    }
    const request: NavigationRequest = {
      turnKey,
      align: options?.align ?? "center",
      getTargetElement,
      signal: options?.signal,
      resolve,
    };
    if (request.signal != null) {
      request.abortHandler = () => finishNavigation(request);
      request.signal.addEventListener("abort", request.abortHandler, { once: true });
    }
    pendingNavigationRef.current = request;
    setNavigation(request);
  }), [finishNavigation, layout]);

  React.useLayoutEffect(() => {
    if (navigation == null) return;
    const turnElement = rowElementsRef.current.get(navigation.turnKey);
    const index = layout.turnIndexByKey.get(navigation.turnKey);
    if (turnElement == null || index == null) return;
    const targetElement = navigation.getTargetElement?.(turnElement) ?? turnElement;
    const turnRect = turnElement.getBoundingClientRect();
    const targetRect = targetElement.getBoundingClientRect();
    const targetTopWithinTurnPx = normalizeMeasuredPixels(
      targetRect.top - turnRect.top,
      windowZoom,
    );
    const targetHeightPx = normalizeMeasuredPixels(targetRect.height, windowZoom);
    const distanceToTopOfTurn = (layout.bottomOffsetsPx[index] ?? 0) +
      (layout.heightsPx[index] ?? 0);
    const targetTopDistanceFromBottom = distanceToTopOfTurn - targetTopWithinTurnPx;
    const targetDistance = navigation.getTargetElement == null
      ? getDistanceToTurn({
          align: navigation.align,
          layout,
          turnKey: navigation.turnKey,
          viewportHeightPx,
        })
      : navigation.align === "top"
        ? Math.max(
            0,
            targetTopDistanceFromBottom - viewportHeightPx + DEFAULT_TURN_SCROLL_MARGIN_PX,
          )
        : Math.max(
            0,
            targetTopDistanceFromBottom - targetHeightPx / 2 - viewportHeightPx / 2,
          );
    if (targetDistance == null) {
      finishNavigation(navigation);
      return;
    }
    const paddedDistance = targetDistance + Math.max(0, getBottomScrollPaddingPx?.() ?? 0);
    scrollController.scrollToDistanceFromBottomPx(paddedDistance, "instant", "user");
    distanceRef.current = targetDistance;
    setDistanceFromBottomPx(targetDistance);
    finishNavigation(navigation);
  }, [
    navigation,
    layout,
    normalizeMeasuredPixels,
    windowZoom,
    viewportHeightPx,
    getBottomScrollPaddingPx,
    scrollController,
    finishNavigation,
  ]);

  const api = React.useMemo<VirtualizedTurnListApi>(
    () => ({ getEntryGeometry, scrollToKey }),
    [getEntryGeometry, scrollToKey],
  );

  React.useEffect(() => {
    onApiChange?.(api);
    return () => onApiChange?.(null);
  }, [api, onApiChange]);

  React.useEffect(() => {
    if (onViewportChange == null) return;
    const viewportEndPx = Math.max(
      0,
      Math.min(layout.totalHeightPx, layout.totalHeightPx - distanceFromBottomPx),
    );
    onViewportChange({
      viewportEndPx,
      viewportStartPx: Math.max(0, viewportEndPx - viewportHeightPx),
    });
  }, [distanceFromBottomPx, layout, onViewportChange, viewportHeightPx]);

  React.useEffect(() => {
    if (onVisibleContentReady == null || typeof window === "undefined") return;
    if (entries.length > 0 && rowElementsRef.current.size === 0) return;
    let first = 0;
    let second = 0;
    first = window.requestAnimationFrame(() => {
      second = window.requestAnimationFrame(() => onVisibleContentReady());
    });
    return () => {
      window.cancelAnimationFrame(first);
      window.cancelAnimationFrame(second);
    };
  }, [entries.length, onVisibleContentReady, visibleRange.startIndex, visibleRange.endIndex]);

  const renderedRows = React.useMemo(() => {
    const byKey = new Map<string, { entry: Entry; index: number }>();
    for (let index = visibleRange.startIndex; index < visibleRange.endIndex; index += 1) {
      const entry = entries[index];
      if (entry != null) byKey.set(entry.turnKey, { entry, index });
    }
    for (const key of retainedTurnKeys) {
      const index = layout.turnIndexByKey.get(key);
      const entry = index == null ? undefined : entries[index];
      if (entry != null && !byKey.has(key)) byKey.set(key, { entry, index: index! });
    }
    return [...byKey.values()].sort((a, b) => a.index - b.index);
  }, [entries, layout, retainedTurnKeys, visibleRange.endIndex, visibleRange.startIndex]);

  const latestTurnKey = entries.at(-1)?.turnKey;
  const topOffset = layout.topOffsetsPx[visibleRange.startIndex] ?? 0;

  return (
    <div
      ref={rootRef}
      className={`relative shrink-0${className ? ` ${className}` : ""}`}
      style={{ height: layout.totalHeightPx }}
    >
      <div className="flex flex-col" style={{ marginTop: `${topOffset}px` }}>
        {renderedRows.map(({ entry, index }) => {
          const isRetained = index < visibleRange.startIndex || index >= visibleRange.endIndex;
          const measuredHeightPx = measuredHeightsByKey[entry.turnKey] == null
            ? undefined
            : layout.heightsPx[index];
          const constrainedHeightPx =
            index !== entries.length - 1 &&
            navigation?.turnKey !== entry.turnKey &&
            measuredHeightsByKey[entry.turnKey] == null
              ? layout.heightsPx[index]
              : undefined;
          const rowHeight = measuredHeightPx ?? constrainedHeightPx;
          const style: React.CSSProperties = {
            height: rowHeight,
            marginTop: isRetained ? 0 : index === visibleRange.startIndex
              ? 0
              : layout.gapsBeforePx[index] ?? 0,
            minHeight: measuredHeightPx == null ? entry.minHeightPx ?? undefined : undefined,
            top: isRetained ? layout.topOffsetsPx[index] : undefined,
          };
          const rowClassName = [
            isRetained ? "absolute inset-x-0" : "",
            constrainedHeightPx != null ? "overflow-hidden" : "",
          ].filter(Boolean).join(" ");

          return (
            <div key={entry.turnKey} className={rowClassName} style={style}>
              <div
                ref={getRowRef(entry.turnKey)}
                className="[&_[data-virtualized-turn-content]]:[content-visibility:visible]"
                data-turn-key={entry.turnKey}
              >
                <RowComponent
                  entry={entry}
                  latestTurnFooter={
                    entry.turnKey === (latestTurnFooterKey ?? latestTurnKey)
                      ? latestTurnFooter
                      : undefined
                  }
                  latestTurnFollowContentRef={
                    index === entries.length - 1 ? latestTurnFollowContentRef : undefined
                  }
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
