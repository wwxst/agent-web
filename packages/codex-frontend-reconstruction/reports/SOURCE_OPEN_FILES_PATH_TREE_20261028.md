# Compiled Codex file-tree contract → current native open-file paths — 2026-10-28

## Compiled user asset

The verified user-provided `frontend.zip` includes:

- `frontend/webview/assets/review-file-tree-side-pane-6403b8872f72.js`
  SHA-256 `7db45f694481f92c4e0320484d012797b49439d1b53958491623f326c766a319`.
  Source `Vn` deduplicates path entries, `Un` owns
  `expandedPaths` and `selectedPath`, and `Wn` passes
  `flattenEmptyDirectories: true`, file paths, selection/open callbacks.
  It also handles `searchQuery`, `No matching files`, and a host-provided
  directory-content loader.
- `frontend/webview/assets/base-file-tree-1123b9ab610d.js`
  SHA-256 `2d9e8117babe68610dfdd515d084501fa420d9d34098cfb83fb6561d2c34df6f`.
  Its tree accepts `paths`, `flattenEmptyDirectories`,
  `expandedPaths`, `selectedPath`, `onClick`,
  `onSelectionChange`, `onExpandedPathsChange`, and `itemHeight`.
- `text-file-editor-tab-content.electron-e71f710dc03c.js` (previous
  evidence report) receives `sidePane` and `onSelectFile` and exposes
  a **Toggle file tree** control. It does **not** authorize renderer-only
  arbitrary directory listing.

## Implementation in the existing native preview

The independent Electron native host currently exposes **only** one
native-user-consented folder grant and bounded `readWorkspaceTextFile`
for explicitly requested paths. There is NO directory listing grant
and no validated private `workspace-files` subscription. Do not
represent existing open tabs as a complete workspace tree.

- `SourceOpenFilesTreeModel.ts` maps **only already loaded, authorized
  `k3o` tabs** to deduplicated normalized, root-relative paths.
  Traversal, absolute paths and malformed paths are excluded.
  The projection groups folder paths, flattens singleton directory
  chains, filters by path and retains stable `tabId` selection.
- `WorkspaceOpenFilesTree.tsx` is a small tree pane using existing
  tab callbacks, visible on explicit **Toggle open files tree**.
  It provides file-path labels, filter, expanded/collapsed folder rows,
  keyboard traversal/activation, `aria-selected` and
  `data-item-type`/path diagnostics. It shows **Open files** and
  **Opened files only · No directory access** so a partial list cannot
  be mistaken for a real workspace browser.
- `WorkspaceReadOnlyPreviewPanel.tsx` mounts this pane next to its
  **already integrated** read-only CodeMirror view; selecting a leaf
  selects the already loaded tab, not another arbitrary file read.
  Closing a tab removes its leaf and switching conversations destroys
  the entire pane and revokes native grants as before.
- No new native IPC, enumeration, file write, Agent backend, bundle
  redistribution or alternative file editor.

## Tests / remaining limits

- Core tests pin `Vn`-style deduplication, safety checks, flattened
  directory chains, expanded/selected paths and case-insensitive filter.
- Chromium tests click **real canonical user-message attachments**,
  open the tree, select actual CodeMirror tabs, collapse/filter/keyboard
  navigate, close a tab and switch threads. They verify there was no
  additional file read or directory grant.
- Run full core, demo model, TypeScript/Vite, Chromium, Linux Electron
  and Windows Electron CI at final head. Manual matched-build original
  screenshot and interaction comparison remain required.

Not restored: original review's host-loaded directory entries, full
workspace explorer, filesystem watcher, private `XL` state, editor
save/write authority, Git decorations/comments, tree virtualizer and
proprietary file-tree shadow-root markup. This is **an open-files path
projection**, not a claim of complete Codex file tree parity.
