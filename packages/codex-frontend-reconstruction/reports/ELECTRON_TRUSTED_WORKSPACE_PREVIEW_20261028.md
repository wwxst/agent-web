# Electron local workspace preview — 2026-10-28

## Original compiled source evidence

- `frontend/webview/assets/user-message-attachments-93893a2e6026.js`
  (SHA-256 `e19f1394a0b45725c91903e7c6f597fb8a431307f5c0a3ed29c0814d3561e411`).
- Original `hn` chooses `fsPath || path`, carries `cwd`, `hostId`,
  `startLine`, `column=1` and conditions `isAttachmentPreview`,
  `attachmentPreviewOrigin`, `openInSidePanel`, and
  `target="fileManager"` into `Qe({scope,...})`. Shared-thread
  resources instead open an encoded HTTPS ChatGPT share URL; upload
  resources use another `U(scope, upload)` path.
- The same `hn` wraps local workspace resources in the original
  `workspace-file-context-menu-trigger-2c51b734f37b.js` module
  (`Et` from `hn`, `d` in original trigger), which receives
  `path`, `cwd`, `hostId`, `line`, `endLine`, and preview flags.
- The independent desktop host does **not** have Codex's private `Qe`,
  original file-manager router, or authenticated root/grant registry.
  Calling OS shell `openPath` on arbitrary message paths would be unsafe.

## Real independent Electron capability

`desktop/trustedWorkspacePreview.cjs` now implements a **separate
first-stage host fallback**, not a claim of full Codex editor recovery:

1. A trusted primary renderer invokes the *native* directory chooser,
   without any renderer-provided grant path.
2. Main canonicalizes the selected directory and binds it exclusively
   to the sender's webContents ID; reload/navigation/close revokes it.
3. Only after that grant, a typed message path is canonicalized using
   `realpath` and checked to stay strictly under the authorized root,
   including symbolic-link targets.
4. Only regular UTF-8 text files of a bounded extension allowlist
   and at most 1 MiB may be read. File content is not executed, modified,
   uploaded, or opened through shell. Raw Electron IPC and Node access
   remain absent from the renderer.
5. The React `UserMessage` attachment button invokes this capability
   only for a workspace resource in native Electron. Uploaded files
   and shared-thread resources remain read-only; source `hn` / `Ba`
   attachment grouping is unchanged.
6. The result renders as a marked read-only panel alongside the actual
   conversation thread. The original editor, preview tabs, file-manager
   gestures, context menus and visual skin are not reconstructed by
   this fallback.

`desktop/trusted-workspace-preview.test.mjs` exercises actual temp
files, per-renderer isolation, symlink traversal, outside paths, revoke,
oversized content and cancellation. Native Electron IPC smoke verifies
preload method narrowness, an ungranted file read rejection, malformed
argument rejection, and the real mounted transcript's per-file click
permissions. It deliberately **does not automatically authorize** a
native file chooser or fabricate a grant.

## Gaps and explicit cautions

The user-provided ZIP is reference only; never check it into the repo.
No original `Qe` host data is present, and the independent host
does not yet subscribe to real Agent user messages, so a synthetic demo
attachment path is not expected to correspond to a real file. Backend
and FilePill source components are unchanged. Exact panel geometry and
source UI remain unverified against a running Codex Windows build.
Windows/Linux Electron and browser suites must pass on the final HEAD.

Security limits: a user-approved directory can contain sensitive text.
This feature requires an explicit native folder grant, but is not a
general filesystem sandbox against concurrent path mutation or a
replacement for OS-level filesystem permissions. Production integration
must bind real workspace identity and root authorization to its own
authenticated Agent host, and must not infer them from transcript paths.
