# Next reconstruction batch — ProseMirror rich extensions

## Verified base (2026-10-23)

- Recovery branch: recovery/codex-frontend-through-connected-message-20261021, draft PR #1 unmerged.
- Main conversation Composer uses a real ProseMirror plain-mode EditorView, mounted through existing CodexSourceComposerEditorMount and CodexSourceComposerHostEvents.
- Core 322/322; demo models 4/4; TypeScript/Vite build passed; Chromium browser 16/16 at Actions run 39885831086.
- Source evidence and limitations are recorded in PROSEMIRROR_PLAIN_MODE.md and COMPOSER_SOURCE_RECOVERY.md.

## Current incremental implementation: source-confirmed rich-input leaves

- KCa-shaped link metadata, source-side URL guard, `span[text-link-href]` import and selected-text URL paste are restored in the **existing** mounted ProseMirror controller.
- Yja's exact three-backtick paragraph-end input rule is implemented as an isolated upstream ProseMirror plugin; browser tests exercise the visible editor.
- This remains a **plain base schema with two source-confirmed rich behaviors**, not full jja Markdown, Dja mention atoms or private suggestion state. Source evidence: `PROSEMIRROR_RICH_INPUTS_STAGE_01.md`.
- Before expanding the editor further, verify CI and review mismatch against original rich mode; continue with link serializer/clipboard provenance, genuine jja schema, mention plugin and host input contracts.

## Source-first activity-continuity integration checkpoint (2026-10-23)

- Source N/P grouping with host-supplied _e classification replaces unconditional demo grouping.
- Source mk/rk group expandability replaces demo canExpand=true; private meaningful-read, visualization and hidden-dynamic-tool callbacks stay explicit.
- The existing nk-inspired React group gets its own max-h-56 / overflow-y-auto scroller, independent of nested FileDiff.
- Chinese file-edit/command summary labels use verified zh-CN bundle phrases; demo annotations remain visible.
- A synthetic combined command+two-file patch scenario and browser tests exercise the **existing** connected transcript, not a new isolated UI.
- Original compiled resources are not committed. A different Codex app build or theme must still be version-checked; this is not pixel parity or Electron/Agent execution.

## Turn-level source integration (2026-10-23)

- Original local-conversation-turn branches n=latest (direct ga) versus n=all (Rk historical collapse); ConversationMessageRenderPlan/ConnectedConversationMessageRenderers now carry that mode to actual React rendering.
- Existing splitTurnItemsIntoRenderGroups feeds SourceTurnTranscriptBlocks, retaining current commentary and extracting final assistant content into the SAME turn row.
- The review fixture now uses a single turn.items array (commentary → three commands → two edited files → final response), not multiple fake virtual turns. The source latest-mode drops superseded commentary after final starts; Chromium checks that plus one row, direct activity group, file preview and final answer.
- The fixture supplies one explicit commentary-to-command group boundary via the private canGroupActivityWithNext adapter; no production decision is inferred. The host's private Wa grouping, full hn partitions, persistence, and Electron/Agent events are still unimplemented.
- Continue by recovering full latest-turn Ga filtering, activity slice closure and persistent collapse state; compare theme-matched Codex screenshots before claiming visual parity.

## Priority order

1. Trace the rich jja/pmu.schema() schema, the private Dja mention atoms and KCa link mark fields in the exact user asset. Record what can be restored using upstream ProseMirror without guessing.
2. Recover the original rUu plugin ordering and observable input rules: suggestions, link handling, code fences, Markdown-to-node conversions, undo/input-rule isolation and clipboard serialization.
3. Implement source-verified features within SourcePlainProseMirrorController or a clearly versioned successor plugged into the same CodexSourceComposerEditorMount; never introduce another independent Composer shell.
4. Test composition (including keyCode 229), submit readiness, Shift/Alt/Mod-Enter, history, long text and HTML/file paste, overflow, controller cleanup and keyboard focus in Playwright.
5. Only after real host contracts have been confirmed, connect attachment intake, Electron IPC and Agent backend events. Preserve the backend boundary.
6. Compare an actual running Electron/web UI to the same Codex build at identical viewport and theme; correct measurable differences before claiming parity.

## Hard constraints

- Do not ship the private compiled frontend chunks in Git.
- Do not claim the base plain schema is the full rich Codex editor.
- Keep core, virtual-list, activity, FileDiff and Composer browser tests green.
- Use the independent recovery branch, do not merge main without permission.

## Activity collapse/headers batch (2026-10-23)

- Implemented source Rk host-owned in-memory collapse state through the existing React row; key is scoped by conversation/turn/activity. Host reset clears, switching/remounting retains explicit user choices.
- ek/hg header input now knows the latest visible unit and source-closed activity slices. Other original host display predicates remain injectable, not reconstructed by guesswork.
- Source signature and scope: `ACTIVITY_COLLAPSE_AND_HEADER_RECOVERY.md`.
- Next: recover Wa/hn group classification and nested MCP grouping, then compare exact build matching and do not conflate browser smoke with Electron verification.

## Source ek/ok combined trace (2026-10-23)

- Recovered ek's host-supplied combinedUnitKey branch and ok's source-order flattening of grouped and standalone units. When the key is absent the normal N/P unit layout is unchanged.
- The existing React activity renderer now invokes this branch; no parallel demo timeline. Synthetic fixture includes an explicit command/patch split and a separate explicit trace key, verified by unit and Chromium regressions.
- Evidence and limits: `COMBINED_ACTIVITY_TRACE_RECOVERY.md`. The real host's key selector remains unknown.
- Next concrete source tasks: original private Wa/hn activity classification, MCP repeated-call subgroup composition and running-vs-complete slice visibility, without inferring production metadata from demo fields.

## Je/bg MCP & external-event subgroups (2026-10-23)

- Recovered source-constrained, consecutive-only repeated MCP/external-event grouping and mounted it inside the existing nk group details scroller. Demo labels and safety guards are explicitly synthetic.
- `XO/V_` source wrappers are approximated with a semantic nested disclosure, not claimed identical; private `ie`, `bm` and MCP metadata require further inverse reconstruction.
- Evidence/tests: `REPEATED_MCP_ACTIVITY_SOURCE_RECOVERY.md`; verify the current CI before reporting success.

## Source A_ / XO / V_ nested disclosure (2026-10-23)

- The original `sites-end-resource` A_ four-phase state contract is restored as `SourceActivityDisclosureModel`; nested MCP and external-event groups now mount the shared `SourceActivityDisclosure` component instead of native `<details>`.
- XO and V_ now have separate host icon slots and lazy nested children, with CSS grid as an explicit temporary substitute for the private motion runtime. The 224px nk scroller and the existing fk tool leaves are unchanged.
- A deterministic historical-turn fixture checks consecutive external events and a subscription-ended barrier. Core tests cover interrupted closing; Chromium tests verify nested lazy lifecycle.
- Verified original source hashes, signatures, implemented limitations and reproduction command: `reports/ACTIVITY_DISCLOSURE_PHASE_RECOVERY.md`.
- **Next:** source exact `mv/bv` icon resolution and `_m/KO` labels, then latest-turn `Wa/hn` partition; do not replace private data with inferred mock metadata. Electron/Agent integration and pixel parity remain open.

## 2026-10-23 — source Ke/fr + qe live-turn visibility checkpoint

- From the supplied original compiled bundle, verified `Ke -> fr -> _e -> N` and `qe/Ga` latest-group filtering, plus the original `F$n` meaningful assistant predicate. SHA-256 evidence and code links: `LATEST_ACTIVITY_KE_QE_SOURCE_RECOVERY.md`.
- Added `SourcePreGroupExecFilter` into the **existing** `AgentActivityUnitGrouping` before classification. No guessed private skill/visualization detection: only host-confirmed redundant execs are skipped.
- Added `SourceLatestActivityVisibility` to the real connected React latest-turn `ga` path. The private `Gi` turn flag remains an explicit host-owned boolean; unresolved host state leaves the verified UI intact. Activity group header now uses post-filter latest visible units.
- Unit tests validate completed/running/interrupted groups, trailing commentary, structured output, redundant reads/visualization command, and unchanged input identity. One marked DEMO-only Chromium test validates actual mounted React rows and absence of the source-suppressed tool calls.
- **Next:** restore real `Gi` host gating from `local-conversation-turn` and the exact `Jt/Kt/qt/Zt` predicates without synthetic evidence, then source-version visual comparison and Electron lifecycle integration. Do not wire Agent backend prematurely.

## 2026-10-23 — Gi status gate and precise visualization Skill handling

- Rechecked exact original `skill-exploration-labels`, `agent-activity-item`, `app-initial` and `local-conversation-turn` bundles from the uploaded archive. Important correction: `qt` checks **visualization Skill definitions only**, not general loaded-tool reads. `Jt` permits nullable and in-progress status. `Kt` requires a source-defined visualizations directory boundary.
- Added `SourceVisualizationActivityPredicates.ts` and the structured skill-definition metadata resolver to the existing history-transform code. `SourcePreGroupExecFilter` now defaults to these actual source predicates and accepts explicit host veto rather than guessing from generic command text.
- Restored the original `Gi=K&&!ai&&!Wi` as `SourceLatestActivityRetentionGate.ts`, preserving terminal status, assistant content/phase, inline subagent commentary, most-recent up-next item and query readiness. The existing `ConversationMessageRenderPlan -> ConversationMessageBlocks -> ConnectedConversationMessageRenderers` path now passes the computed gate to `Ga/qe` before the existing `ek` trace merge.
- Browser fixture confirms a normal Skill read remains in the displayed activity while the visualize-Skill read and its paired visualization command are excluded. Targeted tests cover Jt/Kt/qt and Gi truth-table boundaries; source evidence is pinned in `reports/GI_VISUALIZATION_SOURCE_RECOVERY.md` (19 exact signatures / 4 hashes).
- **Next:** resolve real K from tool history subscription and real Qr/Ui up-next query in a turn-level host adapter, then complete source-specific task result cards and visual parity. No Agent backend change has been performed.

## 2026-10-23 — qn/Qr turn runtime reactive integration

- Directly audited original Fc's `We/Ge/K/Bi/Vi/Ui/Wi/Gi` query activation and fallback against `frontend.zip` with nine pinned signatures. See `TURN_RUNTIME_STATUS_SUBSCRIPTIONS.md` and `scripts/audit-turn-status-subscribers-evidence.mjs`.
- Added a source-bound turn runtime store and a query-driven snapshot source with current-value replay, cleanup, stale callback rejection, query-identity rebinding, and status/up-next inputs. Uses exactly the original history and up-next query keys; host must bridge them to real qn/Qr runtime events.
- Existing `createConversationLiveRow` now subscribes with `useSyncExternalStore` and forwards fresh `K` and `Gi` into the already integrated React activity plan. The tool history store and Agent backend remain untouched.
- A labeled React demo turn publishes simulated Qr and qn events via buttons. This proves the *frontend* updates without parent transcript reload; it does not imply actual Codex query engine or Agent stream.
- Browser test covers pending Qr → Qr ready → qn completed → qn inProgress, plus mounted command leaves; Node tests cover identity/cleanup/fallback.
- **Next:** connect a real host event adapter once its schema is confirmed; investigate SourceTurnTranscriptBlocks' history summary/in-progress turn variants and verify independent Electron startup/visual parity. Test counts must be read from the latest Actions head.

## 2026-10-24 — historical Y turn-content restoration (existing virtualized React row)

- Original `local-conversation-thread-turn-entries-ed0916a7814f.js` Y deliberately removes inline `turn` for non-Aeon, non-preserved, history-backed rows, retaining `turnItemIds` and `turnStatus`. The reconstructed `ConversationRenderEntriesModel` already replicated that branch, but `createConversationLiveRow` had no history-content subscription, yielding blank rows.
- Added `SourceHistoricalTurnContentSource` with per-host/thread/entity keyed subscriptions, stable immutable snapshots, current-value replay, invalidation, per-thread clear, source item ID whitelist **with Y ordering**, identity rebind, and stale subscription cleanup. The original private query runtime remains a host-owned boundary.
- Integrated a second unconditional `useSyncExternalStore` into the **existing** `ConversationMessageBlocks/createConversationLiveRow` path; host `getBlocks(entry,historySnapshot)` feeds the already recovered source turn splitter, existing Markdown, Rk historical disclosure and nk tool activity group.
- Deterministic DEMO turn is truly Y history-projected (no `preserveServerUserMessages` shortcut); preview buttons publish or clear simulated historical items, including a user message, two commands and final assistant. Core tests verify cache/identity/stale safety, and Chromium regression verifies actual mounted row hydration, nested tool expansion, invalidation and replay.
- Source audit: `reports/HISTORICAL_TURN_HYDRATION_SOURCE_RECOVERY.md` and `scripts/audit-historical-turn-hydration-evidence.mjs` (seven exact strings + full original SHA-256).
- **Next:** bind the historical turn store to a verified real host/Electron event transport, then test remount/navigation with durable history and compare exact Codex build visuals. No backend rework or main merge.
