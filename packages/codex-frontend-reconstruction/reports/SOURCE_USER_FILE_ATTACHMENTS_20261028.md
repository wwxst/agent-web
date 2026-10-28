# Source user-message file attachments, 2026-10-28

## Original evidence

Read-only original user-provided build:
`frontend/webview/assets/user-message-attachments-93893a2e6026.js`,
34,522 bytes, SHA-256
`e19f1394a0b45725c91903e7c6f597fb8a431307f5c0a3ed29c0814d3561e411`.

- Original `hn({attachment,cwd,hostId,isUploadedFileViewerEnabled})`
  branches on the presence of the `upload` property.
- Uploaded file without a preview goes to private `Me` FilePill
  (`filename:upload.fileName`, layout `pill` or `card` when
  uploaded-file viewer enabled). With a preview it calls private
  `at({preview,onClick})` (the import resolves to `Wmd` in
  `app-initial-5851df3f6cb1.js`), **not an image viewer**.
  `Wmd` uses the string preview as its label, falls back to
  "Pasted text" if the string is empty, and renders an `Eti`
  card with "Pasted text" subtitle. The reconstruction now implements
  this concrete branch in its existing attached file card.
- Resource files use `fsPath || path` for opening, `path` as a
  resource path, and `yn` for line information.
  The imported `xt` is original `app-primary` function `sV`: with
  `lineInfo` it strips any trailing ` 14-28` or ` (14-28)` shaped
  suffix from the label before FilePill displays its own range, **even
  when the suffix differs from the current lineInfo**. The original
  predicate tests only whether lineInfo exists, not equality.
  `yn` returns `startLine-endLine` if the two differ, or
  `startLine` if equal/only one. No startLine yields nothing.
- A shared-thread resource routes through the external shared-thread
  handler instead of the workspace-file opener; other paths route through
  private host `Qe`, with `line` and column 1.
- Followed the imported `Me=Eti` component in
  `frontend/webview/assets/app-initial-5851df3f6cb1.js`,
  SHA-256 `c70d95da34ba7e5962a559dbf68d0102d10b4b47b877f5d9933629bb5a1f3a10`.
  Original `Eti -> eti` is a `button[type=button]` with
  `data-composer-attachment-pill`, `rounded-full`, max width 320px,
  gap 4px, padding 8px horizontal / 6px vertical, 14px text.
  Card variant is 256px max, 8px radius and 12px/32px padding.
  Browser tests now assert these mounted pill tokens.
- The original whole-user-message renderer `Ba` in
  `frontend/webview/assets/sites-end-resource-fa77a923096d.js`
  partitions `[...attachments,...uploadedFileAttachments]` into
  `E` featured cards and `D` context pills. Uploaded pasted text is
  always featured; other uploads and workspace files require the
  original viewer gate `w` and host-side `vc` file-kind confirmation.
  `E` is a right-aligned vertical list. `D` is right-aligned,
  horizontally scrollable, `flex-row-reverse`, with a `min-w-max`
  inner row. Original outer message JSX orders them before the user-body
  node (`children:[p,m,g,_,v,x,S,C,T,E]`): `x` and `S` precede `T`.
  This source partition and ordering are now mounted in the existing
  UserMessage React leaf; private file-kind checks remain host-supplied.
- The source's card-vs-pill decision on workspace files additionally
  requires private MIME/target preview checks and a feature flag. This
  recovery therefore defaults to `pill` unless the host confirms a
  previewable path.

## Integrated, not a parallel mock

- `SourceUserFileAttachmentsModel` preserves these shape/routing branches
  and never opens a path or network URL.
- `SourceUserFileAttachments` is mounted directly under the existing
  `ConnectedConversationMessageRenderers.UserMessage` branch through
  `getUserFileAttachments(item)`. No new timeline, chat row, Composer
  or backend action is created.
- The original private FilePill icon, hosted image preview, file
  context menus and `Qe/U` host openers remain host-provided. A
  conservative native-file pill is a **visual approximation**.
- Without a verified `onUserFileAttachmentOpen` callback the controls
  are explicitly disabled. Empty/unknown targets are also disabled.
- Synthetic fixture lives only behind the demo tool picker and adds a
  user message with typed paths/uploads to the same current
  `LiveConversationSource`. Chromium tests use the actual virtual row;
  Node tests cover `hn` route and `yn` lines.

## Remaining work

Real Composer file intake, file upload lifecycle/progress, data URL previews,
Electron secure open-file transport, actual file-manager routing, image
lightbox, trusted workspace-file menus, and private theme/icon token mapping
remain unimplemented. FilePill geometry was verified against `Eti/eti`,
but its full design system and hover/disabled behavior are not identical. The synthetic attachment objects are not evidence
of an actual upload or mounted filesystem permission.

Do not include original compiled assets in Git. Keep backend unchanged.
Validate final CI on branch HEAD before proposing merge.
