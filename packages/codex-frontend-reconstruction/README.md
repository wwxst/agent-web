# Codex Frontend Semantic Reconstruction

This package is a staged, independently authored semantic reconstruction of selected modules inferred from the user's extracted Codex desktop frontend. It is not the original Codex source repository and does not claim to recover original TypeScript/React source verbatim.

## Current modules

- `src/conversation/ActiveToolActivityLabel.ts` — activity-label mapping and safe search-term formatting.
- `src/conversation/ActivityGroupingModel.ts` — activity-row classification and automatic-approval metadata normalization.
- `src/conversation/TurnEntriesModel.ts` — reply-chain indexing, timestamp markers, item lookup, virtualization estimates and memo equality.
- `src/conversation/TurnItemRenderGroups.ts` — raw turn-item grouping for the conversation timeline.
- `src/conversation/TranscriptEntryExpansion.ts` — turn-to-transcript-entry orchestration.
- `src/conversation/StaticThreadTranscriptModel.ts` — static snapshot message/activity normalization, image/file-diff extraction and navigation anchors.
- `src/components/TimelineActivityBody.tsx` — reconstructed activity layout wrapper.
- `src/components/CollapsedTurnDisclosure.tsx` — reconstructed activity disclosure UI.
- `src/components/StaticThreadTranscript.tsx` — adapter-based React shell for the static shared-thread transcript.
- `src/ui.ts` — UI-only exports, kept separate from the dependency-light core entrypoint.

## Live-thread modules (current batch)

- `src/conversation/LiveTimelineMerge.ts` — source-turn classification, latest-turn flags, voice chunk coalescing and timeline reconciliation.
- `src/conversation/LiveViewportFollowState.ts` — scroll-follow state reducer and phase/spacer persistence helpers.
- `src/conversation/LiveVoiceBlockProjection.ts` — projects canonicalized voice/BEM blocks into typed display entries using explicit host adapters.
- `src/conversation/LiveConversationTimelineCoordinator.ts` — connects loaded history, synthetic tail filtering, ordinary turns, voice projection and latest-state marking.

See `reports/LIVE_CONVERSATION_PIPELINE.md` for compiled evidence, exact missing dependencies and implementation status. The modules are independently authored for interface clarity and do not claim to be the original bundled source.

## Verification

```sh
npm run test:core
```

The strict core build compiles pure TypeScript modules and the Node test suite covers recovered semantic behavior. React components are authored separately because the matching Codex design-system and host dependencies are not included.

## Fidelity and limitations

- The extracted compiled bundle is retained separately as a read-only reference.
- Reconstructed names are descriptive names chosen during analysis, not claimed to be original names.
- Private host predicates, Markdown/message body, image preview, diff and design-system components, and the Electron bridge require verified adapters.
- The static transcript component has been syntax-checked but not fully type-checked or mounted with React in this environment.
- No Electron visual regression has been performed.
- No GitHub commit or push has been performed.

- `src/conversation/ThreadVirtualizerModel.ts` — virtualized turn layout, visible ranges, anchor preservation and navigation offsets recovered from the compiled virtualizer.

- `src/components/VirtualizedTurnList.tsx` — adapter-based live virtualized turn-list shell, using the reconstructed geometry model.

- `src/conversation/ConversationRenderEntriesModel.ts` — live transcript entry metadata, timestamp/channel markers, reply boundaries, handoff placement and row reuse.
- `src/components/LiveConversationTranscript.tsx` — composes the recovered entry projection with the virtualized list through adapters.

## Live source adapter

`src/conversation/LiveConversationSource.ts` provides host-agnostic immutable snapshots and subscriptions. `src/components/ConnectedLiveConversationTranscript.tsx` subscribes via `useSyncExternalStore`. This does not reconstruct Codex private subscription implementation or make the full app runnable. See `reports/LIVE_SOURCE_INTEGRATION.md`.

## Live message renderer batch

- `src/conversation/ConversationMessageRenderPlan.ts` — typed block dispatch, activity partitions, user/assistant/image rows, thinking/typing placeholders, in-progress todo/diff metadata, first-response and footer placement.
- `src/components/ConversationMessageBlocks.tsx` — adapter-based JSX wrapper with the compiled conversation utility classes and node renderer slots.
- `createConversationLiveRow(adapters)` is exported from `src/ui.ts` and can be passed to the existing `LiveConversationTranscript.RowComponent` prop. An already-expanded single-block row can use `getDirectTranscriptBlock`. The caller must provide message/activity renderers, a partitioner and conversation-specific state.

See `reports/CONVERSATION_MESSAGE_RENDERING.md` for source evidence and exact boundaries. The real Markdown, tool/approval/diff, composer and Electron integration are not complete.

## Rich-message primitives (2026-10-21)

- `src/conversation/ConversationMarkdownPresentation.ts` — verified Markdown-formatting *helpers*, tool activity summary, exit status and diff counts (not a full Markdown parser).
- `src/conversation/InlineFileReviewModel.ts` — file preview guards and action permissions.
- `src/conversation/ActivityStatusPresentation.ts` — activity status fallback, review risk labels, MCP never-policy handling.
- `src/components/InlineFileReview.tsx` — compact/too-large review UI with host-supplied full Diff renderer and explicit file-action callbacks.
- `src/components/ActivityStatusViews.tsx` — activity status and approval review disclosure/notice, with localization and private detail formatter injected.

See `reports/RICH_MESSAGE_PRIMITIVES.md` for source evidence and limitations. These components do not yet provide a complete Codex Markdown or FileDiff engine.

## Continuation: connected message presentation adapter

`createConnectedConversationMessageRenderers(host)` bridges the existing block dispatcher to the recovered status/approval/file-review leaves. The host **must** provide Markdown, activity details, images, thinking, activity results, full FileDiff (optional), and explicit action callbacks. Unknown structured messages are never coerced into Markdown; Edit/Accept default to disallowed. The new `ConversationPresentationAdapterModel` is tested separately.

See `reports/CONNECTED_MESSAGE_PRESENTATION.md`. This is a local integration layer only; it has not been mounted in a real React/Electron host or pixel-compared with Codex.
