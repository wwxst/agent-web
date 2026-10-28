# Codex workspace context menu: source SXo Copy path with cwd — 2026-10-28

## Exact original-bundle evidence

From the user-uploaded original compiled resources (not checked into Git):

- `frontend/webview/assets/app-initial-5851df3f6cb1.js`,
  SHA-256 `c70d95da34ba7e5962a559dbf68d0102d10b4b47b877f5d9933629bb5a1f3a10`.
- `SXo` menu constructor at byte ~7,813,299:
  `C = cwd == null ? path : Va(cwd,path)`. The source item
  `workspace-file-copy-path` calls
  `Oi.clipboard.writeText(C).catch(()=>il(C))`.
  `workspace-file-copy-contents` independently calls
  `_Xo(queryClient,{hostId,path})`, **not** `_Xo(...,{path:C})`.
- In the app-initial import table, `VR as Va` maps to
  `app-shared-bbfeca5e5737.js` `q2` at ~3,187,071:
  `q2(cwd,path)` performs `K2` backslash/prefix normalization,
  checks `J2` absolute target, joins with `$6e` when relative,
  and runs `Z6e` to prefix a slash to Windows drive-based paths.
  Critically, `$6e` does **not** collapse `..` segments. This is
  the original **clipboard label/path semantics**, not a secure
  filesystem resolver.

## Concrete reconstruction

`src/conversation/SourceWorkspaceFileContextMenuModel.ts` exports
`sourceWorkspaceFileCopyPath(route)` with the above `SXo/q2` semantics,
keeping Qe's explicit host-owned `cwd`. The existing real
`demo/adapters.tsx` menu action now supplies this value to the typed
`copyWorkspaceFilePath` Electron clipboard API rather than blindly
copying `route.qe.path`. This changes a real user-message attachment
menu action, not a separate demonstration widget.

An independent Electron host has narrower authority than Codex's
private `Oi` clipboard and `_Xo` content service. To avoid clickable
actions that will always reject in the native host:
`requiresAbsoluteCopyPath` suppresses Copy path if no absolute path
can be established, and `requiresAbsoluteReadPath` suppresses Copy
file contents for still-relative source paths. Both are explicitly set
in the independent host only; original `SXo` predicates remain
unchanged for other host implementations. Only the actual main
process validates absolute local paths and file access grants; a
normalized display path never substitutes for `realpath` or
authorizes any file operation.

Unit tests pin POSIX relative/absolute paths, Windows drive and UNC
paths, source `..` preservation, absent cwd behavior, source ordering
and independent-host fail-closed gates. Existing browser/Linux/Windows
full regression suites remain required at the last HEAD.

## Still missing

Codex's private `xXo` target discovery, original multi-tab editor,
file-manager navigation, upstream authenticated cwd/hostId, and real
Agent message/event integration are not restored here. Matching-build
pixel comparison and manual native Windows folder picker verification
remain open. No backend or `main` mutation.
