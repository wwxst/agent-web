import * as React from "react";
import {
  buildConversationRenderEntries,
  type ConversationRenderEntry,
  type ConversationRenderProjectionDependencies,
  type ConversationRenderProjectionOptions,
  type ConversationRenderProjectionResult,
} from "../conversation/ConversationRenderEntriesModel.js";
import {
  VirtualizedTurnList,
  type VirtualizedTurnListApi,
  type VirtualizedTurnRowProps,
  type VirtualizedTurnScrollController,
} from "./VirtualizedTurnList.js";

export type LiveConversationVirtualEntry = ConversationRenderEntry & { turnKey: string };

export interface LiveConversationTranscriptProps {
  baseEntries: ConversationRenderEntry[];
  projectionOptions: Omit<ConversationRenderProjectionOptions, "baseEntries" | "previousEntries">;
  projectionDependencies: ConversationRenderProjectionDependencies;
  RowComponent: React.ComponentType<VirtualizedTurnRowProps<LiveConversationVirtualEntry>>;
  scrollController: VirtualizedTurnScrollController;
  gapPx?: number | undefined;
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
  onProjectionChange?: ((projection: ConversationRenderProjectionResult) => void) | undefined;
  onVisibleContentReady?: (() => void) | undefined;
  onViewportChange?: ((viewport: { viewportStartPx: number; viewportEndPx: number }) => void) | undefined;
}

/**
 * Connects the recovered conversation-entry projection to the recovered
 * virtualized React list. The caller still supplies Codex/Agent-specific row
 * rendering, data projection and scroll-host adapters.
 */
export function LiveConversationTranscript(props: LiveConversationTranscriptProps) {
  const {
    baseEntries,
    projectionOptions,
    projectionDependencies,
    RowComponent,
    scrollController,
    gapPx = 0,
    className,
    overscanCount,
    pixelScale,
    windowZoom,
    retainedTurnKeys,
    latestTurnFooter,
    latestTurnFooterKey,
    latestTurnFollowContentRef,
    getBottomScrollPaddingPx,
    normalizeMeasuredPixels,
    onApiChange,
    onProjectionChange,
    onVisibleContentReady,
    onViewportChange,
  } = props;

  const previousEntriesRef = React.useRef<ConversationRenderEntry[]>([]);
  const projection = React.useMemo(
    () => buildConversationRenderEntries({
      ...projectionOptions,
      baseEntries,
      previousEntries: previousEntriesRef.current,
    }, projectionDependencies),
    [baseEntries, projectionOptions, projectionDependencies],
  );

  React.useEffect(() => {
    previousEntriesRef.current = projection.entries;
    onProjectionChange?.(projection);
  }, [projection, onProjectionChange]);

  const virtualEntries = React.useMemo<LiveConversationVirtualEntry[]>(
    () => projection.entries.map((entry, index) => {
      if (typeof entry.turnKey === "string" && entry.turnKey.length > 0) {
        return entry as LiveConversationVirtualEntry;
      }
      // The compiled source normally gives every render entry a key. This
      // fallback makes malformed/adapter-provided rows render deterministically.
      return { ...entry, turnKey: `conversation-entry:${index}` };
    }),
    [projection.entries],
  );

  return (
    <VirtualizedTurnList<LiveConversationVirtualEntry>
      entries={virtualEntries}
      RowComponent={RowComponent}
      scrollController={scrollController}
      gapPx={gapPx}
      className={className}
      overscanCount={overscanCount}
      pixelScale={pixelScale}
      windowZoom={windowZoom}
      retainedTurnKeys={retainedTurnKeys}
      latestTurnFooter={latestTurnFooter}
      latestTurnFooterKey={latestTurnFooterKey ?? projection.latestRenderedTurnKey ?? undefined}
      latestTurnFollowContentRef={latestTurnFollowContentRef}
      getBottomScrollPaddingPx={getBottomScrollPaddingPx}
      normalizeMeasuredPixels={normalizeMeasuredPixels}
      onApiChange={onApiChange}
      onVisibleContentReady={onVisibleContentReady}
      onViewportChange={onViewportChange}
    />
  );
}
