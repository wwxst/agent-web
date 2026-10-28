# Original CodeMirror text source versus independent, read-only local preview — 2026-10-28

## User-provided compiled source proof

Original uncommitted `frontend/webview/assets/text-file-editor-tab-content.electron-e71f710dc03c.js`:
SHA-256 `ba7c1910c4075b90e92cf1566a76ffef1f630dada835bf5b466a031d77150607`.

- `Kr` (near byte 6,008) owns `editorView`, a `readOnlyCompartment`, `initialScrollSnapshot`, `initialScrollTop` and `lineToReveal`.
- `Lr(readOnly)` returns `EditorState.readOnly.of(readOnly)` and
  `EditorView.editable.of(!readOnly)`. Do **not** merely hide an editable
  `<textarea>`.
- In `Kr` (near byte 17,816), `this.editorView = new EditorView({doc: content,
  parent: editorParentNode, ...extensions})` accepts an initial matching
  document scroll snapshot, falls back to initial scrollTop, and reveals a
  requested line. Its `revealLine` uses
  `EditorView.scrollIntoView(line.from,{y:"center"})`.
- Original `text-file-editor-extensions-d7a11bb2b948.js` SHA-256
  `9bd589477da5eb604b0e7be52bc1ea7100c1f6e7c220c658184f8e089830c2a8`
  contributes `EditorView.lineWrapping` and `.cm-line` styling.
- The original editor's write, autosave, merge/conflict resolution, external
  sync, selection-edit, search and language metadata use private host services
  and are not reconstructed here.

## Real mounted changes

- Existing `demo/WorkspaceReadOnlyPreviewPanel.tsx` now uses
  `WorkspaceReadOnlyCodeMirror.tsx` instead of a plain `<pre>`. The actual
  already mounted `SourceUserFileAttachments` → read-only native Electron
  file grant → `k3o` tab state stays intact.
- New adapter mounts an upstream CodeMirror `EditorView` in
  `useLayoutEffect`, pairs `EditorState.readOnly.of(true)` with
  `EditorView.editable.of(false)`, enables source-confirmed line wrapping,
  visible source line numbers and selected-range `Decoration.line`.
  The latter is restricted to visible ranges, avoiding thousands of extra
  rendered spans for a 1 MiB file.
- File extension-based TypeScript/JavaScript/Python/CSS/HTML parsing is an
  **independent local fallback** using already installed upstream Codemirror
  language packages; this is not a claim to recreate original private file
  metadata discovery or language extensions.
- The active editor view is disposed on tab switch; retained per-tab scroll
  offsets are keyed by the existing source `k3o` tab ID. This does not claim
  to preserve the full private `XL` tab `contentInstance`, undo or document
  model. Initial line reveal centers the requested location when no prior
  scroll offset exists.
- Source-only `Copy file contents` and native grant scope remain enforced
  in the existing main process. No file write, save, shell or Agent backend
  capability is added. `Read-only local preview` remains visibly labeled.

## Validation and limitations

- Existing Chromium test now verifies a mounted CodeMirror, non-editable
  `.cm-content`, source line decorations and no content mutation on typing.
- Existing tab concurrency, close-context and navigation tests must remain
  green, as must core tests, demo model, production React build, actual Linux
  Electron and native Windows Electron smoke.
- Current view does not restore source Markdown custom blocks, private
  `Kr` file transactions, language extension registry, go-to-line search
  panel, file-tree/editor writes, async conflict overlays or full native
  editor appearance. This is the first **real CodeMirror surface** in the
  independent native read-only preview; the original source bundles
  themselves are not checked into Git.
