# Source user file hn -> Qe / Et routing — 2026-10-28

## Compiled evidence (read only)

Original asset `frontend/webview/assets/user-message-attachments-93893a2e6026.js`
SHA-256: `e19f1394a0b45725c91903e7c6f597fb8a431307f5c0a3ed29c0814d3561e411`.
The actual `hn` function starts around unminified byte offset 29430.

`hn` accepts `{attachment:n,cwd:r,hostId:a,isUploadedFileViewerEnabled:o}`,
where `s=o!==undefined&&o`. For workspace attachments, `h=n.fsPath||n.path`;
`p=yn(n)` is the line label, not a line range to the Qe click.

The original control flow, transcribed rather than guessed:

- `o=i(n)`: private file-manager predicate, **not** a filename heuristic.
- `f=!o && s && ze(h)!=null && n.startLine==null`.
- `m=!o && (f || ze(h)==="pptx" || n.isPastedText ||
  ut(h) || (n.startLine==null && Ge(h)))`.
- For `sharedThread`, `Fe({href:"https://chatgpt.com/s/"+encodeURIComponent(shareId)})`,
  not Qe. Uploads route to `U(scope,upload)`, not Qe.
- Workspace file click: `Qe({scope,path:h,line:n.startLine,
  column:n.startLine==null?undefined:1,cwd:r,hostId:a,
  attachmentPreviewOrigin:f?"sent-message":undefined,
  isAttachmentPreview:f,openInSidePanel:m,target:o?"fileManager":undefined})`.
- Only the wrapping `Et` context-menu trigger receives `endLine`
  alongside `line`, `cwd`, `hostId`, `isAttachmentPreview`,
  `attachmentPreviewOrigin` and `openInSidePanel`. The Qe *click*
  does **not** include endLine.

Original `frontend/webview/assets/workspace-file-context-menu-trigger-2c51b734f37b.js`
SHA-256: `d146a80bcb689c6c3fdd6d68362b98f61127142294aa555f9e994ad8fde1505e`.
Its wrapper `d` calls `jTt(scope,props)` to build source context-menu items.
Private host menus are not present in this reconstruction.

Original `frontend/webview/assets/app-initial-5851df3f6cb1.js`
SHA-256: `c70d95da34ba7e5962a559dbf68d0102d10b4b47b877f5d9933629bb5a1f3a10`.
The `HJ` file-open dispatcher (~offset 7302K) is not one universal
`shell.openPath`: a remote execution host can load `openReviewFileSourceTab`;
explicit target/workspace mode forwards a resolved navigation intent;
for local side-panel opens, the dispatcher queries file content metadata,
chooses preview or a file-manager fallback, and may delegate office-file
presentations. None of these private service calls can be invented in
an independent Electron host.

## Actual integrated code

- `SourceUserFileQeRouteModel.ts`: transcribes the source flags. Private
  `i`, `ze`, `ut`, `Ge` must be supplied by a verified host; unknown
  means **no invented preview or file-manager entitlement**.
- `SourceUserFileAttachments` invokes the projection in the existing
  featured/context row and passes the real route as a third argument. The
  connected user-message renderer carries it as a fourth callback argument
  along with its existing canonical item, and optionally takes host-owned
  cwd/hostId plus classifiers.
- Native demo's existing bounded preview uses the verified Qe `path/line`
  and separately `Et.endLine` to show a highlighted text range. The
  only native capability remains user-approved, read-only UTF-8 file access
  within a canonical folder root. No new shell, file-manager, upload,
  browser-open or permission-grant operation was introduced.
- `WorkspaceReadOnlyPreviewPanel` marks the selected range in one span
  rather than mounting an element for every line in a file up to 1 MiB.
- New source-route core assertions and actual React browser/real native
  IPC tests cover original source click fields, host predicate priority,
  native range validation and visual range selection.

## Unresolved, not approximated

- The private `i/ze/ut/Ge` host classifiers, canonical `cwd/hostId`
  feed from authenticated real message events, original `Qe/HJ`
  content-kind and editor/office/native target decisions, and actual
  right-click menu entries. Local read-only preview is a clearly
  labeled independent fallback, not a recovered original file manager.
- Production Agent backend is unchanged, and existing original-bundle
  assets are not added to this repository.
- Manual Windows native folder-picker validation and a matched-build
  screen-level comparison still remain necessary.

This batch is stacked on PR #59 (full CI green at commit
`a41257c293ef490b7d9a0db85095b5f16b7cdaf0`).
