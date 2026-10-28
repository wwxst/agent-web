# Original Ve/Un file-tree search and native bounded filename fallback — 2026-10-28

## Direct evidence: uploaded frontend.zip

- `frontend/webview/assets/review-file-tree-side-pane-6403b8872f72.js`,
  SHA256 `7db45f694481f92c4e0320484d012797b49439d1b53958491623f326c766a319`:
  `Un` requests `G(an,{directoryPath:null,expandedPaths,hostId,environmentId,includeHidden,refreshKey,workspaceRoot})`
  for directory presentation. It invokes a **separate** `Ve({hostId,onFiles,query,roots})`
  for global file search. `Gn` maps `Vn` deduplicated display paths into
  a file tree, and distinguishes `Searching files…` / `No matching files`.
  Search result selection delegates to the same `onSelectFile` callback.
- `frontend/webview/assets/workspace-directory-entries-query-380a93ae197a.js`,
  SHA256 `1e8998f1feeeb8a0e324bb05ce1aea9a01819f757f5a5b410ed1669b4f6de01f`:
  exported `v` builds the keyed `workspace-directory-entries` query with
  `directoryPath`, `hostId`, `environmentId`, `includeHidden`,
  `workspaceRoot` and `refreshKey`, with a 5-second stale time;
  exported `y` aggregates root and currently expanded path entries
  into a deduplicated set, appending a trailing slash to directory paths.
- `frontend/webview/assets/base-file-tree-1123b9ab610d.js`,
  SHA256 `2d9e8117babe68610dfdd515d084501fa420d9d34098cfb83fb6561d2c34df6f`
  implements tree selection and expansion; no private service is copied.

## Real independent Electron implementation on top of PR #71

- A new `agent-web:search-workspace-files` IPC is offered **only** through
  a fixed preload method `searchWorkspaceFiles({query})`. The trusted
  main-frame guard and existing native user-selected folder grant are
  mandatory. Search input is 2–80 characters, trimmed and control-free.
- Search is **only previewable filename/path matching** (case-insensitive),
  never file content search. It reuses audited grant-scoped, non-recursive
  `listDirectory` for breadth-first traversal; the entire search is bounded
  to **32 examined folders, 100 returned matching text files**, and the
  existing per-folder 400 scans / 200 records caps. Hidden entries,
  unsupported extensions, symlinks, outside-grant paths are excluded.
  The exact user's absolute root, bytes, inode and handles never leave main.
- Revoking the native grant (or replacing the selection at the same path)
  during the search rejects the whole stale result. Search returns the
  explicit `truncated` flag and `scannedDirectories` rather than claiming
  complete results.
- `WorkspaceGrantedDirectoryTree.tsx` now invokes this host search for a
  2+ character query while showing the source-confirmed searching/empty
  states and displaying **full relative paths** to disambiguate same-named
  files. Selecting an unopened nested result calls the already integrated
  read-only `openWorkspaceTreeFile` route to `k3o` tabs and CodeMirror.
  Requests are delayed 180 ms and stale result promises are ignored when
  query changes/unmounts.
- Without the new search capability, older browser/test hosts retain the
  loaded-directory-only local filter. Clearing search restores previously
  expanded directory rows; no unrelated filesystem enumeration happens.
- `Refresh workspace directory` now forces root **and expanded branches**
  to refetch using per-path request sequence tokens, preventing earlier
  refreshes from overwriting newer responses. This corresponds to the
  original `an` `refreshKey` invalidation but does not emulate its private
  query cache/subscriptions.

## Tests and strict limitations

Native temporary directory tests verify unopened nested file discoverability,
hidden/symlink/unsupported/outside filtering, invalid input rejection,
directory caps and revoke races. The canonical browser user-message preview
test checks a search result from an **unopened, unexpanded** path opens the
same real read-only CodeMirror editor, clears to the old tree, and refreshes
both root and expanded directories. The Electron smoke now asserts the
real isolated preload method rejects invalid and ungranted searches.

This is **not** the proprietary `Ve` service: it lacks remote environments,
host-level indices, fuzzy ranking, true workspace-wide unlimited search,
filesystem watches, Git decorations, open-preview vs pinned-tab gestures,
editable saves, or version-matched screenshot/pixel parity. The bounded
fallback explicitly reports limits; no Agent backend code or original
compiled asset is checked into the repository.
