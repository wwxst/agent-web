# Source line / endLine / column reveal in the mounted local editor — 2026-10-29

## Compiled source evidence

The source is the user-provided `frontend.zip`; the compiled bundle is not copied into Git.

- `frontend/webview/assets/app-initial-5851df3f6cb1.js`, SHA-256
  `c70d95da34ba7e5962a559dbf68d0102d10b4b47b877f5d9933629bb5a1f3a10`.
  The local file-panel `onOpenLocation` callback calls `IX` with
  `column:t.range.start.character+1`, `line:t.range.start.line+1`, and
  `resetTabState:true`. This callback does **not** forward `range.end` as
  `endLine`; the file tab's separate initial-open props can carry an
  `initialEndLine` when another caller explicitly supplies one. Editor state
  reset sets `editor.lineToReveal` and clears prior markdown/source scroll
  snapshots. This establishes one-based line and column semantics and that
  location navigation must supersede a stale saved scroll.
- `frontend/webview/assets/text-file-editor-tab-content.electron-e71f710dc03c.js`,
  original CodeMirror editor mount (`Kr`), supports the editor being the
  destination for this location metadata.

## Mounted independent integration

- The already-existing attachment route accepts optional `line`,
  `endLine`, `column` and `resetTabState`. Only the original supported
  read fields (`path`, `line`, `endLine`) are sent to the host reader;
  column/reset flags remain presentation metadata, not filesystem authority.
- The existing tree-open callback accepts optional location metadata too;
  it reuses the same root-relative file identity and does not add a new
  IPC, host permission or duplicate tab.
- `WorkspaceReadOnlyCodeMirror` validates positive safe-integer line/column,
  clamps the line to the document and column to the actual line length, sets
  a CodeMirror selection at that position, and scrolls the line into view.
  `resetTabState:true` ignores a previous tab scroll snapshot for this
  navigation; ordinary tab re-selection continues restoring its scroll.
- File access remains native-grant scoped and read-only. Location values do
  not widen the authorized path or grant.

## Not claimed

This restores the verified reveal metadata only. PR #75 now keeps
one mounted read-only CodeMirror `EditorView` per local tab, but that is not
the private Codex `contentInstance` or full editor state/persistence. Writable
selection/dirty/save state, remote hosts, and pixel parity remain unimplemented.


## Latest integrated route and verification

The existing `demo/adapters.tsx` attachment callback previously discarded `sourceRoute.qe.column` even though the source model provides a one-based column. It now forwards the column to `openWorkspaceAttachment`; `App.tsx` keeps it as renderer metadata and sends only supported `path`, `line`, and `endLine` fields to the native reader. The mounted CodeMirror selection uses `line.from + (column - 1)`, clamped to the actual line length.

A monotonic `locationRequestId` differentiates repeated navigation to the same location from ordinary tab switching. A new location wins over the old scroll snapshot; switching away and back restores the stored scroll offset. Playwright verifies the real caret at the source attachment's line 14 / column 1 and re-opening that location after scrolling to the end. PR #77 now maps the separate source `onOpenLocation` payload into this same route; the language-service provider and original definition/reference UI remain unimplemented. See `SOURCE_OPEN_LOCATION_ROUTE_20261029.md`.

Verification at code head `c71cb40a5212ee32a38849fe24e2641121e20c96`: core 516/516, demo model 5/5, Chromium 66/66, Linux Electron 80/80, Windows Electron 79 passed / 1 skipped / 0 failed. TypeScript/Vite and both real Electron smoke jobs passed. PR #74 remains Draft and is stacked on PR #73; no Agent backend or `main` changes.
