# Next reconstruction batch — ProseMirror rich extensions

## Verified base (2026-10-23)

- Recovery branch: recovery/codex-frontend-through-connected-message-20261021, draft PR #1 unmerged.
- Main conversation Composer uses a real ProseMirror plain-mode EditorView, mounted through existing CodexSourceComposerEditorMount and CodexSourceComposerHostEvents.
- Core 322/322; demo models 4/4; TypeScript/Vite build passed; Chromium browser 16/16 at Actions run 39885831086.
- Source evidence and limitations are recorded in PROSEMIRROR_PLAIN_MODE.md and COMPOSER_SOURCE_RECOVERY.md.

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
