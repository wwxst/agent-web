# Recovery status — 2026-10-21

## Implemented modules

1. Tool activity summary labels and safe search-query formatting.
2. Timeline activity layout wrapper and collapsed-turn disclosure UI.
3. Turn-entry model helpers: reply-chain indexing, timestamp separators, item lookup, virtualization estimates and memo equality.
4. Activity-row classification and automatic-approval metadata normalization.
5. Raw turn-item grouping for messages, tool activities, approvals, generated images, subagents and errors.
6. Turn-to-transcript-entry expansion: previous-entry reuse, pagination placeholders, transcript keys, reply-chain seeds and estimated heights.
7. Static shared-thread transcript normalization and an adapter-based React shell.
8. Live thread viewport-follow state machine: scroll/phase transitions, steering key selection and spacer-offset persistence.
9. Live thread data pipeline: source turn extraction, voice timeline merging, BEM presentation blocks, history-source annotations and tail-flush filtering.
10. Thread virtualizer geometry: measured/estimated row heights, gap layout, distance-from-bottom visible ranges, overscan, reanchoring, navigation offsets and scroll preservation.
11. Adapter-based React virtualized turn-list shell: visible-range mounting, retained rows, ResizeObserver measurement, layout-anchor correction and scroll-to-key API.
12. Conversation render-entry projection: per-turn metadata, timestamp separators, compact Aeon markers/channel changes, reply quote boundaries, gaps, historical summaries, handoff placement and row identity reuse.
13. `LiveConversationTranscript` React composition: feeds projected entries into the virtualized list through injected data, row and scroll adapters.

## Validation performed

- Strict TypeScript core build passed with `strict`, `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.
- `npm run test:core`: 87 tests passed, 0 failed.
- `StaticThreadTranscript.tsx`, `VirtualizedTurnList.tsx`, and `LiveConversationTranscript.tsx` passed a separate static TypeScript check against a temporary minimal React declaration shim.
- The shim check is not equivalent to checking against actual React package types; browser mounting, keyboard/accessibility interactions and Electron visual comparison remain unverified.

## Not yet done

- Recover the actual live page's host subscriptions/data hooks and wire `cA`-style orchestration to `LiveConversationTranscript`.
- Implement real message-body, Markdown and complete activity-row renderers; the React list still takes a row renderer adapter.
- Complete the live virtualized list's host scroll transactions, latest-turn follow-content callbacks and restore-state semantics.
- Recover the composer surface, editor behavior and send/stop/attachment interactions.
- Trace and implement the Electron bridge contract against the existing Agent backend.
- Run the assembled frontend in Electron and perform visual regression against the installed Codex app.
- Integrate with `wwxst/web-project` or `wwxst/agent`. No GitHub write or push has been performed in this environment.

## Current batch: live source integration

- `LiveConversationSource.ts` immutable external snapshot and subscription store.
- `ConnectedLiveConversationTranscript.tsx` React adapter into live transcript.
- Strict core build and 92 Node tests pass; full React mounting, Electron UI and original-client visual parity remain pending.

## Current batch: compiled message row dispatch

- Added `ConversationMessageRenderPlan.ts` from `local-conversation-turn-69783815d57d.js` (`rs`, `ls`).
- Added `ConversationMessageBlocks.tsx` and the `createConversationLiveRow` adapter into the existing live virtualized list.
- 110 core Node tests passed (18 new message dispatch tests); strict TypeScript core build passed.
- The new React TSX passed static checking against a minimal local shim; actual React mounting and visual parity are **not** verified.
- The Markdown, activity, tool/approval/diff visual components, full host event bridge, composer and Electron app remain incomplete.

## Rich-message primitives batch

- Implemented independent Markdown presentation leaf utilities, inline file-review guard/action model, activity status/approval risk model, compact review React component and activity status/review disclosure React component.
- The private full Markdown renderer, FileDiff web component/worker, review detail formatter, localization and design system are still required as adapters.
- Latest core and TSX static-check results are recorded in `reports/RICH_MESSAGE_PRIMITIVES.md` and the separate validation log.

## Continuation increment (2026-10-21): message presentation composition

- Added `ConversationPresentationAdapterModel.ts` and `ConnectedConversationMessageRenderers.tsx` to join the existing dispatch with Markdown host, activity host, recovered approval/status views, and inline file-review component.
- Explicitly deny accept/edit without host permission; do not infer private data structure.
- Core tests: 140 / 140 passing (12 new), targeted TSX static type check with temporary React declaration passed.
- No real React DOM/Electron mount or visual fidelity validation, and no GitHub push. See `CONNECTED_MESSAGE_PRESENTATION.md`.


## Current HEAD update (2026-10-22): history hydration and xC/PT leaf contracts

- Added `ToolActivityHistoryHydrationModel.ts`: source-derived LO query bypass, HO identity, zO entity mapping for assistant messages, reasoning, plans, command execution, file changes, image generation, MCP and dynamic tools. Private source helper functions remain injected.
- Added `CodexToolActivityLeafRenderer.tsx`: typed host component contracts for xC read/search/list-files/command leaves and PT patch rows; no private visual leaf is represented as recovered.
- Connected history hydration before content projection in `ConnectedConversationMessageRenderers.tsx`. The browser demo uses a marked mock command leaf adapter.
- Verified at HEAD `c246bd0`: 235/235 core tests, 4/4 demo model tests, strict React/TypeScript production build, 9/9 Chromium tests, and 34/34 original-source signature checks. Both GitHub Actions workflows passed.
