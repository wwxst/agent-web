import * as React from "react";
import {
  buildStaticThreadTranscriptModel,
  findLastUserMessageEntryIndex,
  getVisibleWorkGroupItems,
  shouldInitiallyCollapseWorkGroup,
  type SharedSnapshot,
  type SnapshotFileChange,
  type SnapshotMessage,
  type SnapshotRenderEntry,
  type SnapshotTurnRenderModel,
  type SnapshotWorkEntry,
} from "../conversation/StaticThreadTranscriptModel.js";

export interface StaticThreadTranscriptAdapters {
  /** Full message renderer; connect this to the recovered Markdown/message-body component. */
  Message: React.ComponentType<{
    id: string;
    message: SnapshotMessage;
    imagePreviewsRef: React.MutableRefObject<Map<string, unknown>>;
    initialMessageRef?: React.Ref<HTMLElement> | undefined;
    isInitialUserMessage: boolean;
    userImageAlt: string;
  }>;
  /** The shared activity disclosure and activity markdown renderer. */
  Activity: React.ComponentType<{
    item: Extract<SnapshotWorkEntry, { type: "reasoning" | "commentary" }>;
  }>;
  CollapsedTurnDisclosure: React.ComponentType<{
    collapsedMessageCount: number;
    workedDurationMs: number | null;
    workedForItem: null;
    isCollapsed: boolean;
    onToggle: () => void;
  }>;
  ConversationGap: React.ComponentType<Record<string, never>>;
  InspectedImages: React.ComponentType<{ images: string[] }>;
  GeneratedImages: React.ComponentType<{ images: unknown[] }>;
  FileChanges: React.ComponentType<{ diffs: SnapshotFileChange[] }>;
  OmissionNotice: React.ComponentType<{ snapshot: SharedSnapshot }>;
  getUserImageAlt(): string;
  shouldOmitFirstTurn(snapshot: SharedSnapshot): boolean;
  hasOmissionNotice(snapshot: SharedSnapshot): boolean;
  /** Optional wrapper that restores the snapshot asset/image context. */
  AssetProvider?: React.ComponentType<{
    assets?: Record<string, unknown> | null | undefined;
    shareId?: string | null | undefined;
    previewAssetSources?: Record<string, string> | undefined;
    loadAsset?: ((assetId: string, signal: AbortSignal) => Promise<Blob>) | null | undefined;
    children: React.ReactNode;
  }>;
}

export interface StaticThreadTranscriptProps {
  snapshot: SharedSnapshot;
  idPrefix?: string;
  initialMessageId?: string;
  initialMessageRef?: React.Ref<HTMLElement> | undefined;
  shareId?: string | null | undefined;
  previewAssetSources?: Record<string, string> | undefined;
  loadAsset?: ((assetId: string, signal: AbortSignal) => Promise<Blob>) | null | undefined;
  showOmissionNotice?: boolean;
}

/**
 * React reconstruction of the static shared-thread transcript's component
 * orchestration (`Ot`, `At`, and `Vt` in the compiled bundle).
 *
 * Design-system, Markdown, image-preview, diff and omission-policy components
 * are injected. The surrounding DOM hierarchy and item-placement rules are
 * reconstructed from the compiled reference.
 */
export function createStaticThreadTranscript(adapters: StaticThreadTranscriptAdapters) {
  const {
    Message,
    Activity,
    CollapsedTurnDisclosure,
    ConversationGap,
    InspectedImages,
    GeneratedImages,
    FileChanges,
    OmissionNotice,
    AssetProvider,
  } = adapters;

  function WorkGroup({
    items,
    durationMs,
    idPrefix,
    initialMessageId,
    initialMessageRef,
    userImageAlt,
    imagePreviewsRef,
  }: {
    items: SnapshotWorkEntry[];
    durationMs: number | null;
    idPrefix: string;
    initialMessageId: string;
    initialMessageRef?: React.Ref<HTMLElement> | undefined;
    userImageAlt: string;
    imagePreviewsRef: React.MutableRefObject<Map<string, unknown>>;
  }) {
    const [isCollapsed, setIsCollapsed] = React.useState(
      () => shouldInitiallyCollapseWorkGroup(items, initialMessageId),
    );
    const visibleItems = getVisibleWorkGroupItems(items, isCollapsed);
    const lastUserMessageIndex = findLastUserMessageEntryIndex(items);

    return (
      <div>
        <CollapsedTurnDisclosure
          collapsedMessageCount={items.length}
          workedDurationMs={durationMs}
          workedForItem={null}
          isCollapsed={isCollapsed}
          onToggle={() => setIsCollapsed((value) => !value)}
        />
        {visibleItems.length > 0 ? (
          <>
            <ConversationGap />
            <div className="flex flex-col gap-[var(--conversation-item-gap,16px)]">
              {visibleItems.map((item, index) => {
                if (item.type === "message") {
                  const ref =
                    initialMessageId.length > 0
                      ? initialMessageId === item.id
                        ? initialMessageRef
                        : undefined
                      : item === items[lastUserMessageIndex] && initialMessageRef != null
                        ? initialMessageRef
                        : undefined;
                  return (
                    <Message
                      key={`${item.id}:${index}`}
                      id={`${idPrefix}${item.id}`}
                      message={item.message}
                      imagePreviewsRef={imagePreviewsRef}
                      initialMessageRef={ref}
                      isInitialUserMessage={
                        item === items[lastUserMessageIndex] &&
                        initialMessageRef != null &&
                        initialMessageId.length === 0
                      }
                      userImageAlt={userImageAlt}
                    />
                  );
                }
                return (
                  <div
                    key={`${item.id}:${index}`}
                    className={item.type === "reasoning" ? "text-secondary" : undefined}
                  >
                    <Activity item={item} />
                  </div>
                );
              })}
            </div>
          </>
        ) : null}
      </div>
    );
  }

  function StaticThreadTranscript(props: StaticThreadTranscriptProps) {
    const {
      snapshot,
      idPrefix = "",
      initialMessageRef,
      shareId = null,
      previewAssetSources,
      loadAsset = null,
      showOmissionNotice = true,
    } = props;
    const initialMessageId =
      props.initialMessageId ??
      (typeof window === "undefined" ? "" : window.location.hash.slice(1));
    const imagePreviewsRef = React.useRef(new Map<string, unknown>());
    const userImageAlt = adapters.getUserImageAlt();
    const model = buildStaticThreadTranscriptModel(snapshot, {
      shouldOmitFirstTurn: adapters.shouldOmitFirstTurn,
    });

    const content = (
      <main
        data-thread-user-message-navigation-content
        className="relative mx-auto flex w-full max-w-3xl flex-1 shrink-0 flex-col gap-4 px-toolbar pt-4 pb-8 text-default"
      >
        {showOmissionNotice && adapters.hasOmissionNotice(snapshot) ? (
          <OmissionNotice snapshot={snapshot} />
        ) : null}
        {model.turns.map((turn) =>
          turn.omitted ? null : (
            <SnapshotTurn
              key={turn.key}
              turn={turn}
              renderWork={(entry, index, firstUserEntryIndex) => (
                <WorkGroup
                  items={entry.items}
                  durationMs={turn.durationMs}
                  idPrefix={idPrefix}
                  initialMessageId={initialMessageId}
                  initialMessageRef={
                    initialMessageId.length > 0
                      ? undefined
                      : index === firstUserEntryIndex
                        ? initialMessageRef
                        : undefined
                  }
                  userImageAlt={userImageAlt}
                  imagePreviewsRef={imagePreviewsRef}
                />
              )}
              renderMessage={(entry, index, firstUserEntryIndex) => (
                <Message
                  id={`${idPrefix}${entry.id}`}
                  message={entry.message}
                  imagePreviewsRef={imagePreviewsRef}
                  initialMessageRef={
                    initialMessageId.length > 0
                      ? initialMessageId === entry.id
                        ? initialMessageRef
                        : undefined
                      : index === firstUserEntryIndex
                        ? initialMessageRef
                        : undefined
                  }
                  isInitialUserMessage={index === firstUserEntryIndex}
                  userImageAlt={userImageAlt}
                />
              )}
            />
          ),
        )}
      </main>
    );

    return AssetProvider ? (
      <AssetProvider
        assets={snapshot.assets}
        shareId={shareId}
        previewAssetSources={previewAssetSources}
        loadAsset={loadAsset}
      >
        {content}
      </AssetProvider>
    ) : content;
  }

  function SnapshotTurn({
    turn,
    renderWork,
    renderMessage,
  }: {
    turn: SnapshotTurnRenderModel;
    renderWork: (
      entry: Extract<SnapshotRenderEntry, { type: "work" }>,
      index: number,
      firstUserEntryIndex: number,
    ) => React.ReactNode;
    renderMessage: (
      entry: Extract<SnapshotRenderEntry, { type: "message" }>,
      index: number,
      firstUserEntryIndex: number,
    ) => React.ReactNode;
  }) {
    return (
      <section data-turn-key={turn.key} className="flex flex-col gap-4">
        {turn.entries.map((entry, index) => (
          <React.Fragment key={`${entry.type}:${index}`}>
            {index === turn.firstAssistantEntryIndex && turn.inspectedImages.length > 0 ? (
              <InspectedImages images={turn.inspectedImages} />
            ) : null}
            {entry.type === "work"
              ? renderWork(entry, index, turn.firstUserEntryIndex)
              : renderMessage(entry, index, turn.firstUserEntryIndex)}
          </React.Fragment>
        ))}
        {turn.firstAssistantEntryIndex === -1 && turn.inspectedImages.length > 0 ? (
          <InspectedImages images={turn.inspectedImages} />
        ) : null}
        {turn.generatedImages.length > 0 ? (
          <GeneratedImages images={turn.generatedImages} />
        ) : null}
        {turn.fileChanges.length > 0 ? <FileChanges diffs={turn.fileChanges} /> : null}
      </section>
    );
  }

  return StaticThreadTranscript;
}
