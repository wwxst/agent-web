# Source line / endLine / column reveal in the mounted local editor — 2026-10-29

## Compiled source evidence

The source is the user-provided `frontend.zip`; the compiled bundle is not copied into Git.

- `frontend/webview/assets/app-initial-5851df3f6cb1.js`, SHA-256
  `c70d95da34ba7e5962a559dbf68d0102d10b4b47b877f5d9933629bb5a1f3a10`.
  The file-panel `onOpenLocation` callback calls `IX` with
  `column:t.range.start.character+1`, `line:t.range.start.line+1`,
  `endLine` from the resolved location, and `resetTabState:true`.
  The file tab props forward `initialLine` / `initialEndLine`; editor state
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

This restores the verified reveal metadata only. It does not restore the
private Codex `contentInstance`, full editor state/persistence, writable
selection/dirty/save state, remote hosts, or pixel parity. The independent
editor currently recreates CodeMirror on tab switch and retains scroll only.
