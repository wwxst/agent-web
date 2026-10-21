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

## Browser integration preview (demo-only)

This package now includes `demo/`, a real React/Vite mounting host for the existing recovered modules. On Node.js 22 with npm access:

```bash
npm install
npm run test:core
npm run demo:check-model
npm run demo:build
npm run demo:dev
```

Visit http://127.0.0.1:5173/. The preview uses synthetic conversations and host adapters. **It does not talk to an Agent backend, run commands, modify files, or replicate the private Codex runtime.** See `demo/README.md` and `reports/DEMO_INTEGRATION.md`.


UI alignment checkpoint: see `reports/UI_FIDELITY_STAGE_01.md` for the light desktop shell, source evidence, browser test geometry, and remaining Composer/Electron gaps.

## Source-first Navigation Rail checkpoint

`src/conversation/NavigationRailModel.ts` models the compiled `dWc/GZc/QZc`
rail-versus-sidebar destination routing; `src/components/CodexNavigationRail.tsx`
provides the independently measured `<nav>` landmark. The real account state,
reordering and private icon assets are not restored. See
`reports/NAVIGATION_RAIL_SOURCE_RECOVERY.md` and `demo/README.md`.

### Source-backed AgentActivity collapse checkpoint

The recovered `AgentActivityProjection` and `CodexAgentActivity` implement part of the original `Rk`/`Lk`/`kk` collapse composition; private item predicates and tool renderers remain injected adapters. Evidence and remaining work: [`reports/AGENT_ACTIVITY_SOURCE_RECOVERY.md`](reports/AGENT_ACTIVITY_SOURCE_RECOVERY.md).


## Source-checked group headers (2026-10-21)

See [AgentActivity group-header recovery](reports/AGENT_ACTIVITY_GROUP_HEADER_SOURCE_RECOVERY.md). This stage restores Xe/Ze/Q/K/I active state selection, sk message identifiers, je ordering and Ye standalone demotion into the existing ActivityGroup pipeline. The real Sg/We aggregation, nk tool row details/icons, and Electron backend are **not** recovered. The browser demo remains mock-only.
