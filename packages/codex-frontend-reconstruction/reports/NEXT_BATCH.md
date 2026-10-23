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

## XO/V_ headers, KO/bm boundary (2026-10-23)

- Implemented source XO/V_ generic tool, recognized action and external event header mode selection on the existing nested MCP disclosure. Host owns private _m action lookup, KO tool names and icons. Test labels are explicitly mock-only.
- Core and Chromium tests cover two real nested groups separated by an unfinished call. Original A_ motion, real App metadata, toolDefinition and actual bm result formatting remain unimplemented.
- See `REPEATED_MCP_HEADER_SOURCE_RECOVERY.md`. Verify CI for the branch before accepting test claims.

- Source `KO → bm` now traced to exported `xa` in `mcp-tool-activity-label-220d2d98d4ad.js`; next recover its fallbacks in source order and verify against connector metadata. Do not infer the original name/icon from demo strings.

## MCP xa common label branches (2026-10-23)

- Common XA precedence/phase gating, metadata strings and JS title cutoff are now recovered and wired into the existing generic repeated MCP header. All imported private formatters remain host callbacks, not mock implementations.
- Evidence/limits: `MCP_TOOL_ACTIVITY_LABEL_XA_RECOVERY.md`. Next recover ct/et or precisely scoped Mt/gt branches, and integrate the label with standalone MCP tool leaves.

## Single MCP KO title integration (2026-10-23)

- The same xa model now renders standalone host-leaf MCP titles through the existing toolActivity adapter, retaining old fallback when adapter is absent. Source evidence: MCP_SINGLE_KO_LEAF_INTEGRATION.md.
- Chromium must verify invoking state on pending MCP singleton and existing repeated success group behavior. Real app metadata and private ct/et are still missing.

## Visual fidelity: source scroll-edge mask (2026-10-23)

- Recovered app-shared vertical-scroll-fade-mask and edge-fade scroll-timeline behavior in the existing nk activity detail scroller; the original class was present but had no supporting CSS in the recovered UI.
- Updated Chromium tests verify 224px scroll height, CSS mask/animation support and independent FileDiff scroll. See SOURCE_ACTIVITY_SCROLL_FADE.md.
- Next: source-verify status row typography/icon spacing and FileDiff header/theme tokens against the pinned app-shared CSS and original IT/BT class list, rather than screenshot guesses. Continue React/Electron front-end integration only.

## BT outer FileDiff frame (2026-10-23)

- Restored the missing original BT frame on actual expanded PT/IT unified file-diff rows: filename/tooltip, counts, copy unified patch, original border/surface geometry and existing nested FileDiff. Preserves independent 100/240px viewport heights.
- Playwright now validates clipboard copy and frame/scroll separation. See SOURCE_PATCH_DIFF_BT_FRAME.md; exact private Or icon, theme and Electron host remain pending.

## Source-backed activity row measurements (2026-10-23)

- Exact nk details metrics aligned: max-h-56 (224px), -ms-2 / ps-2 offsets, 1.5rem scroll fade, no invented vertical border. BT frame font size and rounded/ghost tokens now reference pinned app-shared stylesheet semantics.
- Geometry and CSS assertions added to existing Chromium activity-continuity test. See SOURCE_ACTIVITY_ROW_VISUAL_ALIGNMENT.md. Still need original icon/typography runtime and same-build screenshot parity.
