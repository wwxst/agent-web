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


## Current checkpoint — source-derived history transforms (2026-10-22)

- Added `ToolActivityHistorySourceTransforms.ts` from the original app-initial, app-primary and app-shared bundle logic: assistant content/heartbeat normalization (`wo`), reasoning summary (`Wa`), file-change projection and visualization filtering (`zl/WMe`), image failure validation (`qr`), Codex Apps action classification (`Po`), MCP result formatting/content normalization (`wl/amn`), visualization activity kind (`cc`) and declined-review predicate (`Gf`).
- Added `createSourceToolActivityHistoryDependencies`; only the specialized MCP-to-external-message converter (`Uf`) remains a required host adapter for history hydration. The meaningful-read predicate (`NO/mh`) and live `Mr(Au/Vd)` subscriptions also remain host-owned.
- Validation at code HEAD `5d3efee`: 253/253 core tests, 4/4 demo model tests, production typecheck/build, 9/9 Chromium tests. Original source audits passed 34/34 signatures for sites-end-resource and 18/18 signatures across the three helper bundles.
- The browser demo remains mock-only; real Electron IPC, live history subscriptions, proprietary visual leaves and pixel-level Codex comparison are not claimed complete.


## Current checkpoint — tool activity history subscription integration (2026-10-22)

- Recovered the external-message conversion branches from original `app-initial` (`ihn/Ihn/Fhn`): accepted Codex Apps Slack receipts and schema-validated outgoing Slack/Teams delivery records. The source's Slack-only return condition is preserved; unrecognized/non-Slack receipt variants are not fabricated into assistant messages.
- Recovered `NO/mh` meaningful-read classification from `sites-end-resource` plus `skill-exploration-labels` and the app-initial skill-path parser. Read commands are treated as skill exploration only when the resolved path is a `skill.md` definition under the observed Codex/Agents/plugin layouts.
- Added `ToolActivityHistorySource.ts`: a host-agnostic observable store that connects the verified LO query plan and zO hydration model to two injected subscription channels corresponding to `Mr(Au)` and `Mr(Vd)`. It handles query rebinding, stale callback rejection, cleanup, loading/ready/unavailable/error states, and immutable snapshots.
- Added `ConnectedCodexToolActivityItem.tsx`: React `useSyncExternalStore` adapter that forwards hydrated item/copy text to the existing source-shaped activity renderer.
- CI at `5ecc8c1e4a8f7d612c3f72ace47513c49bd2c6a0`: 268/268 core tests, 4/4 demo model tests, React/TypeScript build and 9/9 Chromium tests passed. Raw `frontend.zip` audit also passed locally: main bundle 34/34 signatures; helper bundles plus skill parser 30/30 signatures with pinned SHA-256 hashes.
- Remaining boundary: the generic subscription host still needs binding to the actual private Codex query runtime; original visual leaves, Electron IPC, Agent backend integration and version-matched pixel/interaction parity are not complete.

## Current checkpoint — connected history source mounted in the live transcript (2026-10-22)

- Verified branch HEAD at this documentation update: `3baa88e3870647b93ed3874786b31be07ab57f7c`; the preceding tool-detail evidence commit `396685ee2cc1ce617a664d2d899e8c2ad4cde04e` is part of the earlier history, not the current HEAD.
- `ConnectedConversationMessageRenderers` mounts `ConnectedCodexToolActivityItem` through a stable host-supplied history-source registry. The legacy pre-hydrated path remains available.
- The browser demo exercises entity store → history source → `useSyncExternalStore` → tool leaf using explicitly synthetic fixture entities; the source registry is disposed with its row host.
- Latest confirmed GitHub Actions run: [run 39721848764](https://github.com/wwxst/agent-web/actions/runs/39721848764), successful. Verified checks inherited by the current documentation-only HEAD: 275/275 core tests, 4/4 demo model tests, strict React/TypeScript build, and 9/9 Chromium tests.
- Source audit records: `sites-end-resource` 34/34 signatures; helper bundles and skill-path parser 30/30 signatures with pinned hashes. These are signature checks, not visual-parity measurements.
- **Next implementation gate:** restore/verify the original `CC/RC/EC/NC/PT/IT` leaves and complete FileDiff/MCP/approval visuals from the exact user-provided Codex bundle; then bind the host entity store to a confirmed Agent/Electron event contract and run version-matched screenshot/interaction tests.
- **Known boundary:** this current workspace's accessible Library does not contain the referenced Codex `frontend.zip` or `sites-end-resource-fa77a923096d.js`; the original visual leaf work must not be guessed. No complete Electron app, real Agent event stream, real command execution, or pixel-level parity is claimed.


## Latest verified checkpoint — source-aligned FileDiff and fallback (2026-10-22)

- Branch: `recovery/codex-frontend-through-connected-message-20261021`; draft PR #1 remains open. Latest implementation commit: `f6f04330c5a910ca48823f9d88a05355ee5cb993`.
- In `CodexSourcePatchDiffPreview.tsx`, the actual `@pierre/diffs` `FileDiff` host now receives the source-observed `composer-diff-simple-line` class and vertical-scroll behavior. The source's pending/regular viewport bounds are preserved as 100px / 240px.
- The `VT` fallback now uses the original change content for add/update and a deleted-content label for delete, rather than displaying the synthesized git header when the parser cannot render a binary or invalid diff.
- The synthetic patch fixture now exercises actual vertical scrolling and a binary-diff fallback. Browser tests verify line gutters, source classes, viewport overflow, scroll movement and binary fallback.
- GitHub Actions at `f6f0433` passed: 296/296 core tests, 4/4 demo model tests, strict React/TypeScript build, and 12/12 Chromium tests. The prior failed run at `e033ffa` was caused by a double-escaped newline in the new fixture; the fixture was corrected before this green checkpoint.
- The public repository still contains no raw original bundle. The preview remains synthetic/demo-only; the Codex soft-theme resolver, full private design system, live history runtime, Electron IPC and real Agent backend are not yet integrated.

## Next implementation gate

See `reports/NEXT_BATCH.md`: trace the actual main conversation Composer call site and event/controller contract in the provided bundle before implementing editor behavior or wiring any host action.


## Latest verified checkpoint — main Composer submit-gate recovery (2026-10-22)

- Traced the actual main Composer in `app-primary-fe8a450b3b04.js` (`YMt`) and its rich-text editor in `app-initial-5851df3f6cb1.js` (`XWu`); exact full SHA-256 hashes and reproducible signature checks are recorded in `reports/COMPOSER_SOURCE_RECOVERY.md`.
- Added `ComposerInteractionModel.ts` for the source-confirmed submit-readiness and outer host gates; integrated it into the existing demo send path rather than leaving it as a standalone test-only module.
- Added IME composition guards to the demo input and a browser test. This is an explicit textarea-demo safety adaptation, not a claim of ProseMirror keyboard parity.
- Current verified baseline before this batch: commit `44829b77e98cfe8a660afa8eb8f8466234a5c3d8`, with 296/296 core tests, 4/4 demo model tests, strict React/TypeScript build, and 12/12 Chromium tests. New batch CI is pending.
- Still missing: actual ProseMirror controller/editor integration, complete paste/drop and attachment routing, source-exact stop/streaming state transitions, Electron IPC, and real Agent backend connection.
