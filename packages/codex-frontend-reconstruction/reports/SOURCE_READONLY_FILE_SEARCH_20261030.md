# Source-backed read-only file Find panel — 2026-10-30

## Compiled-source evidence

All observations below were checked against the user-provided `frontend.zip`. The proprietary compiled assets are not copied into this repository.

- `frontend/webview/assets/text-file-editor-search-panel-ab7444d105ea.js`
  - SHA-256: `b3c7e4664f2d3348f5a7c7706504c6d3d1a31a3f53d9ea97ad49678513f9a826`
  - The `Yr` extension builder creates a top CodeMirror search panel. Its `ai` panel class mounts the React `Xr` controls, observes document/selection/query changes, and closes through the existing CodeMirror search state.
  - `Xr` exposes the Find input, previous/next navigation, result count and close action. The result counter caps display at 999 and marks larger result sets as capped.
  - The search highlighter uses `cm-searchMatch` and `cm-searchMatch-selected`. The panel theme places the panel at the top-right of the editor with a 12px inset and uses the original info-soft/info-surface theme variables.
  - The source keymap includes Mod-F, F3 / Mod-G, Shift-F3 / Shift-Mod-G and Escape for search-panel navigation and dismissal.
- `frontend/webview/assets/text-file-editor-extensions-d7a11bb2b948.js`
  - SHA-256: `9bd589477da5eb604b0e7be52bc1ea7100c1f6e7c220c658184f8e089830c2a8`
  - The original file-editor extension composition calls the search-panel extension with `searchMessages` and `onOpenFind`; this is part of the existing CodeMirror editor extension stack, not a separate editor.
- `frontend/webview/assets/text-file-editor-tab-content.electron-e71f710dc03c.js`
  - SHA-256: `ba7c1910c4075b90e92cf1566a76ffef1f630dada835bf5b466a031d77150607`
  - The text-file editor controller passes `searchMessages` and `onOpenFind` into that existing extension stack and owns the editor/search-controller lifecycle.

## Integrated implementation

- Added `@codemirror/search` `^6.7.2` to the existing frontend package; no second editor or search store was introduced.
- Added `WorkspaceReadOnlyFileSearchPanel.tsx`, a custom top CodeMirror `Panel` backed by CodeMirror's search state. It preserves query flags, updates only on document/selection/query changes, reports the active match and up to 999 results, and exposes previous/next/close controls.
- Mounted `sourceReadOnlyFileSearch()` in the existing `WorkspaceReadOnlyCodeMirror` extension list. Each already-retained file-tab EditorView owns its own search state and panel lifecycle.
- Restored the source key bindings through `searchKeymap`: Mod-F, F3, Shift-F3, Mod-G and Shift-Mod-G. The panel input receives focus when opened; navigation buttons retain input focus.
- Added the original panel placement and match-class theme hooks to `workspaceReadOnlyPreview.css`.
- Kept the preview read-only: `EditorState.readOnly` and `EditorView.editable(false)` remain in force. This implementation adds no Replace controls, save path, file-write API or new Electron IPC.

## Validation

GitHub Actions run [40983135835](https://github.com/wwxst/agent-web/actions/runs/40983135835) passed on the exact branch head:

- Core reconstruction tests: 529 passed, 0 failed.
- Demo data-model tests: 5 passed, 0 failed.
- TypeScript / Vite React preview build: passed.
- Chromium browser suite: 74 passed, 0 failed, including `source-readonly-file-search.spec.ts`.
- Desktop Node smoke tests: 82 passed, 0 failed.
- Linux Electron window / preload smoke: passed.
- Windows Electron window / preload / IPC / native-menu smoke: passed.

The mounted browser regression checks Mod-F opening and focus, 11 matching results, match decorations, Enter/F3/Shift-F3/Mod-G navigation, the previous-result button, Escape, query retention after reopening, the absence of Replace controls, and the unchanged read-only editor boundary.

## Fidelity and remaining limits

- The CodeMirror search state, top-panel lifecycle, result counting, key bindings and match-decoration contract are source-backed.
- The current independent preview uses local React/CSS controls in place of Codex's private design-system components. This restores the observed layout and interaction contract but is **not** a claim of pixel parity.
- The original localized `searchMessages` provider is not yet wired; the current labels are English defaults.
- A same-build, same-theme visual comparison against a running original Codex Electron window remains outstanding.
- No Agent backend code or `main` branch code was changed.
