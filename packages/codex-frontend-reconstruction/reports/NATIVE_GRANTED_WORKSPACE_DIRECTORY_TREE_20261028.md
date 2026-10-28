# Source Un/Wn workspace directory browser → independent granted Electron tree (2026-10-28)

## Direct compiled-source evidence

User-uploaded original `frontend.zip`:

- `frontend/webview/assets/review-file-tree-side-pane-6403b8872f72.js`
  SHA256 `7db45f694481f92c4e0320484d012797b49439d1b53958491623f326c766a319`.
  `Un` reads `an` query with
  `{directoryPath:null, expandedPaths, hostId, environmentId, includeHidden,
  refreshKey, workspaceRoot}`; `Wn` handles loading, error and empty states,
  and passes `paths`, `selectedPath`, `onSelectionChange`, `onOpenFile`
  and `initialExpandedPaths` into a tree. `Ve` is a separate host-owned
  search service; do not mistake a local loaded-row filter for it.
- `frontend/webview/assets/base-file-tree-1123b9ab610d.js`
  SHA256 `2d9e8117babe68610dfdd515d084501fa420d9d34098cfb83fb6561d2c34df6f`.
  Tree delegates to the original private virtualized tree and host actions.
- Original text file editor is CodeMirror; the independent read-only
  CodeMirror branch is stacked immediately before this PR.

No original `workspaceFiles` service implementation, authenticated
`hostId`/environment subscriber, or private tree-state module has been
imported or impersonated.

## Real integrated independent native boundary

The running independent Electron host **already** grants one root only when
the user chooses it in the native folder selector. This batch adds a
narrow, separately named, *explicitly independent* capability:

1. `agent-web:list-workspace-directory` takes exactly
   `{relativePath:""}` for root or validated root-relative `a/b`.
   No arbitrary absolute root or filesystem API is passed through preload.
2. Main guards the trusted top-level webContents, native grant, exact
   selected-root device/inode, canonical path containment, rejection of
   symlink/junction path components, directory handles and post-open
   identity. Linux directory listing uses a pinned `/proc/self/fd`
   handle; Windows relies on the native opened identity and post-checks.
   Directory reads are one level, limited to 200 visible records and
   400 examined entries, with no recursive walk or watcher.
3. Hidden and symlink entries and unsupported file types are omitted.
   The result contains only `{name, relativePath, kind}` and
   `truncated` — no absolute user root, file text, OS handle or host ID.
4. `agent-web:read-workspace-tree-text` takes a validated root-relative
   file and uses the **existing** bounded 1 MiB handle-based UTF-8
   `readTextFile`, with the same revoke, canonical path and identity
   guards. No write, save, command execution or generic IPC is added.
5. `WorkspaceGrantedDirectoryTree.tsx` mounts in the **existing**
   CodeMirror tab side panel for a native host exposing both capabilities.
   Folder expansion loads only its own children. A leaf click invokes
   `openWorkspaceTreeFile` in the existing `demo/App.tsx` tab state,
   retains original `k3o` identity, reuses already open tabs and respects
   pending-read intent and conversation revoke. Old browsers/test hosts
   without these methods continue showing the existing **Open files**
   tree. The tree explicitly states **Previewable files only**.
6. Search currently filters only loaded entries; this is **not** original
   remote `Ve` workspace-wide search. Exact private tree styling,
   file watchers and full workspace listing remain unrestored.

## Validation

- Native host test uses real temporary directories, symlink to outside,
  hidden/unsupported files, nested folder, root grant/revoke, strict path
  validation, cap and an in-flight revoke.
- Chromium browser test opens a canonical existing conversation attachment,
  receives only fake directory data from a test-only host, expands a folder,
  selects a previously unopened leaf into the existing CodeMirror, asserts
  read-only UI, reuse, no second chooser and thread revoke.
- Require full green strict core/model/build, Chromium, Linux Electron and
  real Windows Electron smoke at the final branch HEAD.
- A matched original Codex Windows build visual comparison and proof of
  complete original workspace semantics are **not** provided.
