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
