# Next reconstruction batch — 2026-10-30 priority reset

The project has a working React/TypeScript and Electron foundation plus substantial recovered UI. The next milestone is **a complete Codex work experience**, not a larger count of isolated feature leaves.

## Priority 1 — original Codex screenshot comparison and UI correction loop

- Workflow and evidence: `reports/VISUAL_REGRESSION_WORKFLOW_20261030.md`.
- Added `scripts/compare-ui-screenshots.mjs` and `npm run visual:compare`. The tool records image hashes/dimensions, refuses to rescale mismatched screenshots, and for valid same-size pairs produces overlay, pixel-difference heatmap, side-by-side image, and JSON metrics.
- Added unit coverage for PNG metadata, CLI argument validation, hashes, and dimension-mismatch fail-closed behavior.
- Added the test-only `?visualScenario=shell-empty` route and `AGENT_WEB_VISUAL_SCENARIO=shell-empty` Electron dev startup. It mounts the real shell and Composer with an empty transcript, stays hidden from the sidebar, and does not read or overwrite saved pins. A mounted Playwright test records its geometry and screenshot.
- First uploaded pair was inspected: original Codex 1211×759, reconstructed frontend 1352×760. Their content/state also differs, so they are a qualitative structural reference only; no misleading pixel-diff or parity claim is accepted.
- Next: capture the original Codex and the **actual Electron reconstruction** at identical bounds/scale/DPR and identical scenario content. Start with scenario A (empty shell + idle Composer), then B/C/D (Markdown transcript, running tool, pending approval). Review each diff and fix the owning component/token/host boundary.

## Priority 2 — integrate the complete core conversation workflow

Do not create new isolated demo widgets. Integrate the existing modules into one coherent mounted conversation:

- Source-backed message timeline with user/assistant/reasoning/commentary/final rows, streaming and finalization, history hydration, scroll/follow behavior.
- Complete Composer built around the existing mounted ProseMirror controller: editor schema/plugins, IME, paste/drop, attachment intake, file mentions and slash suggestions where confirmed by source, model/reasoning/permission controls, send/stop/queue/steer, drafts, disabled/loading states.
- **Completed first attachment-intake slice:** `reports/COMPOSER_ATTACHMENT_INTAKE_STAGE_01_20261030.md`. The source-shaped tray is mounted in the real Composer; the plus control opens a multiple-file picker; ProseMirror image/file paste channels and the outer-form file-drop path share one per-thread draft model; remove, preview, switch-thread retention and reset are wired. The preview never reads bytes, grants a path, creates an upload ID or calls the Agent backend. Demo submission uses label-only non-openable transcript references and explicitly says files were not uploaded.
- Next Composer slice: recover and mount the original model picker / reasoning-effort and permission-mode controls from `app-primary` owners `i9e`, `f9e`, and `fG`. Keep model and permission choices host-provided; do not add invented static model inventories or pretend a local selection changed backend permissions.
- Tool activity in the same timeline: command execution, file changes/diffs, MCP, browser/computer use, subagents, status and result transitions.
- Approval lifecycle: request, scope/risk explanation, approve/decline/cancel, pending/settled/failed/retry states, keyboard and focus behavior.

For each workflow, trace the exact compiled Codex owner module first, reuse the existing recovered component/model, define its real host contract, then validate mounted Electron behavior and screenshot state.

## Priority 3 — finish the real host/runtime chain

- Type-safe React ↔ Preload ↔ Electron Main event/request contracts.
- Explicit lifecycle for streaming, cancellation, approval replies, errors, reconnect, and window teardown.
- Session persistence and restoration with stable conversation identity.
- Validate host functionality independently before connecting the existing Agent backend.
- Only after the host contract is stable, add the adapter to the user's Agent backend. Do not re-architect the backend or fabricate success events.

## Deferred, retained work

Cross-window pinned-tab owner/reveal RPC, durable-route preload, pinned-file thumbnails, and original reorder behavior remain source-confirmed tasks. Keep the existing same-window pin implementation, read-only preview, Find, and all passing regressions intact, but do not let this narrow feature chain outrank the three product-wide priorities above.

## Acceptance rule

A component is not complete because it renders. A scenario is complete only when:
1. its source behavior is understood and documented;
2. it is mounted in the real Electron app;
3. its controls/events reach the correct host contract;
4. its screenshot is compared to the same original Codex state;
5. relevant browser, Electron, and regression tests pass;
6. remaining differences and limitations are explicit.

Continue on this stacked recovery branch/PR. Do not merge PR #80/#81, retarget to `main`, or modify the Agent backend without explicit approval.


---

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

## 2026-10-24 — unified host event ingress integrated into existing conversation

- Reused separately keyed original Y, Fc/qn/Qr, and LO/Au/Vd stores and React rows; new `SourceConversationHostEventBridge` provides one non-private, typed independent-frontend event ingress and external `connect(transport)` adapter boundary.
- The **same mounted Demo React conversation** now routes all three event families through the single bridge. Added per-thread qn/Qr invalidation and stale transport fencing; tests verify cross-conversation isolation and an event-driven clear/recovery browser scenario.
- No duplicate message/activity UI, no hidden private API imitation, no Agent backend change. See `UNIFIED_FRONTEND_HOST_EVENTS.md`.
- **Next:** inspect the existing Electron host / CLI event semantics when available, bind a permission-aware transport and exercise it in an actual desktop startup. Do not fabricate a Codex IPC schema or replace genuine test data with unsupported invented fields. Compare theme/version matched UI after desktop host runs.

## 2026-10-24 — real Electron boot completed, next original UI/IPC acceptance

- Electron main/preload and `file://` React renderer now start as an independently executable desktop frontend. Playwright Electron smoke proves preload isolation and real main-process IPC delivering a qn/Qr event into the **existing** Ga/qe UI.
- Run `npm run demo:build && npm run desktop:start` to launch the built renderer, or `npm run desktop:dev` for Vite development. `npm run desktop:test:smoke` requires a display (Linux CI uses Xvfb).
- Original Codex preload evidence: `scripts/audit-electron-preload-evidence.mjs`; independent runtime, security contract and unsupported private APIs: `reports/ELECTRON_DESKTOP_HOST_STARTUP.md`.
- **Highest priority next:** inventory source-backed Electron shell geometry/assets and version-specific original screenshots; audit any missing native navigation, keyboard and window lifecycle states; then map confirmed Agent host protocol events to the independent `SourceConversationHostEventBridge` under explicit permissions. Windows packaged startup and installer smoke remain unverified. Do not merge to main until requested.

## 2026-10-24 — source-backed native window chrome and persistence

- The previously independent Electron shell used a normal OS frame *plus* mock window control glyphs, unlike original `z9/A9`. Now actual BrowserWindow has original 36px transparent titlebar overlay (win32/linux), hiddenInset traffic lights (macOS), minimum 480×600, synchronized OS caption color, and a draggable React top strip with fake window glyphs removed only in Electron.
- Restored `i3e` geometry contract using safe standalone `windowBounds.cjs`: persistence, maximization, min-width/height clamp, and display-workarea validation on restore. Source evidence SHA and nine source fingerprints are documented in `PRIMARY_WINDOW_CHROME_SOURCE_RECOVERY.md`.
- Test with actual Playwright Electron smoke + windowChrome/windowBounds Node cases; compare screenshots on native Windows against the matching Codex original before claiming pixel parity. Do not treat Linux Xvfb caption rendering as Windows UI acceptance.
- **Next priorities:** restore original native keyboard/application menu command mapping from compiled resources and integrate functional actions only after verification; audit multi-display resize/restore transitions, Windows native titlebar hit targets and shell visual diffs; then wire a permission-checked real host event stream to the independent React bridge. No Agent backend rewrite and no main merge.

## 2026-10-24 — source w0e/D0e native menu to actual Electron titlebar

- The previously inert File/Edit/View/Help text now opens real native Electron submenus in desktop mode. Source w0e Edit roles and D0e View zoom/fullscreen/File close/quit/Help documentation are implemented as a **functional limited subset**; menus whose actions require private host commands are excluded rather than simulated.
- Native main validates IPC caller identity, loaded origin, menu ID allowlist and popup anchor; renderer's isolated preload exposes only `openMenu` (not raw Electron ipcRenderer). Chromium preview remains unchanged.
- CI now includes both Linux Xvfb and Windows Electron desktop smoke; Node tests verify menu roles and shortcuts, Electron smoke verifies real menu instance and WebContents zoom action.
- Source audit/report: `scripts/audit-original-native-menu.mjs` and `reports/NATIVE_MENU_SOURCE_RECOVERY.md`.
- **Next priority:** verify Windows CI, inspect actual native Windows screenshot/artifact, then recover command dispatcher/keymap/state for private native menu commands. Ensure no guessed New Task / Search / Settings routes, no Agent backend change, and no main merge until user requests.

## 2026-10-24 — native D0e view commands now reach existing React navigation

- Source-backed Toggle Sidebar and Previous/Next Thread native menu commands are wired from Electron main through the sandboxed preload into the existing `App.tsx` state and already recovered `ConnectedLiveConversationTranscript`. Original D0e evidence and dynamic-keymap boundary: `NATIVE_SIDEBAR_THREAD_COMMANDS.md`.
- The demo renderer uses its explicit two-conversation navigation semantics, not a claim about all private Codex tabs. No guessed accelerator, private IPC payload or disconnected standalone timeline.
- Both Linux and Windows desktop smoke must verify actual native item invocation and mounted React changes before CI is considered green; all previous smoke assertions preserved.
- **Next:** source-verify the original `find-in-thread` route and existing search UI before enabling native Cmd/Ctrl+F, then complete Electron window/theme screenshot comparison on a matching Codex version. Real Agent transport, original configurable keymap and Windows installer remain unimplemented.

## 2026-10-24 — navigation menu delivery now verified on actual Windows

- Verified source D0e native `toggle-sidebar`, `previousThread` and
  `nextThread` reach the mounted React sidebar and conversation selector
  via a typed, allowlisted independent preload channel; none of the original
  keymap shortcuts were invented.
- Fixed previously failing Windows delivery by canonicalizing the
  `file://` renderer permission guard with Node `fileURLToPath`. Regression
  tests cover external URL rejection and real native command actions.
- CI implementation head `c7d8f8ee` passed Windows/Linux desktop 14 tests
  each and kept all existing web regressions passing. Check final docs head.
- **Next:** source-verify `find-in-thread` original routing and recovered
  transcript search UI, integrate without new unrelated mock state; audit
  original dynamic command keymap and Windows native screenshot against
  matching source build. Real Agent and native installer still outstanding.


## 2026-10-29 — XL preview and permanent local tabs

- The mounted file tree now follows the original `review-file-tree-side-pane` selection contract: single-click/search result opens a replaceable preview, double-click opens a kept tab, and opening a new preview replaces only the prior preview. Direct conversation-attachment opens remain permanent when `isPreview` is omitted by original `IX`.
- Kept-tab state, italic preview labels, the local Keep tab action and stale async preview fencing are integrated into the existing React panel. This is not the private `XL` registry, and the original **Pin to sidebar** action is still separate and unsupported.
- Verified on feature head `a24d702`: 516/516 core, 5/5 model, 66/66 Chromium, 80/80 Linux Electron, and Windows Electron 79 passed / 1 skipped / 0 failed; TypeScript/Vite and actual Electron smoke passed. The mounted browser scenario covers tree-to-attachment tab reuse, single-click preview replacement, double-click kept tabs, Keep tab, and stale slow-read rejection.
- **Next:** restore source-confirmed file navigation state on the already mounted editor/tree—selected path and line/endLine/column reveal when opening a related file—then investigate preserving actual editor/content state across tab switches. Keep the current read-only and grant boundaries; do not invent write/save or remote-host behavior.


## 2026-10-29 — Source line/column reveal integrated into the mounted read-only editor (PR #74)

- Verified the uploaded compiled `app-initial-5851df3f6cb1.js` location contract and `user-message-attachments-93893a2e6026.js` Qe route. The existing attachment adapter was dropping the source-provided one-based `column`; it now forwards that value to the existing React file-tab route.
- The mounted CodeMirror editor clamps one-based line/column to the actual document and line length, sets the selection, and scrolls the target into view. The original `endLine` range remains highlighted only over visible virtualized lines.
- Added a monotonic location-request identity so reopening the same path and line is still treated as a new navigation and overrides an old saved scroll snapshot. Normal tab re-selection continues restoring that tab's own scroll; `resetTabState` remains an explicit reset signal.
- Column and reset metadata stay renderer-side; the native read IPC receives only its supported path/line/endLine fields. Editor remains read-only and no write/save IPC was added.
- Verified head `c71cb40a5212ee32a38849fe24e2641121e20c96`: core 516/516, demo model 5/5, Chromium 66/66, Linux Electron 80/80, Windows Electron 79 passed / 1 skipped / 0 failed. TypeScript/Vite, browser smoke, and both actual Electron smoke jobs passed.
- PR #74 is Draft and stacked on PR #73's `recovery/native-preview-pinned-tab-lifecycle-20261029` branch. No Agent backend or `main` changes.
- **Next:** wire the source-confirmed related-file `onOpenLocation` action to this existing tab route (including `resetTabState`) rather than stopping at attachment-click navigation; then test cross-tab editor-state preservation and compare the actual mounted panel against the matching original Codex build. Do not claim the private `contentInstance` or sidebar pinned-content registry is restored.
