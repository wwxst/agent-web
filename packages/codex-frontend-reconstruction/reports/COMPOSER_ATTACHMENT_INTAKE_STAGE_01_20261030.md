# Composer attachment intake — source recovery stage 01 (2026-10-30)

## Original compiled source evidence

Input artifact: user-provided `frontend.zip`, package `openai-codex-electron@26.1013.40934`.

| Source asset | SHA-256 | Relevant compiled owner |
|---|---|---|
| `frontend/webview/assets/app-primary-fe8a450b3b04.js` | `2a05e25229bd7a38c12c55d90f82fb07087e80b4e16070116b215484498478f2` | `opt` Composer host (offset 1,360,172), `p2e` attachment adapter (590,638), `G0e` attachment tray (570,593), `i9e` footer/control composition (852,558) |
| `frontend/webview/assets/app-initial-5851df3f6cb1.js` | `c70d95da34ba7e5962a559dbf68d0102d10b4b47b877f5d9933629bb5a1f3a10` | ProseMirror controller `rUu` paste classification and `pasted-images` / `pasted-files` subscriptions (around offset 13,117,817) |
| `frontend/webview/assets/app-initial-e7c27dd40beb.css` | `6de949e9037e0038f9d4f18530e3bc8a5aa6274fa53ec9e59be85c05218003bc` | `ComposerLayoutAttachments` and `ComposerAttachmentsScrollContainer` layout rules |

Source facts confirmed in `opt`:
- The original Composer owns separate image, pending-file, file, uploaded-file, pasted-text, appshot, selected-text and other attachment collections. It wires a generation-aware attachment handler and the upload/context preparation path; these are host-owned, not simple filename chips.
- The attachment presentation is passed through `p2e` into `G0e`.
- `G0e` renders an ordered `data-composer-attachments-row` inside a horizontal `data-composer-attachments-scroll-container`. Images use preview tiles; pending and uploaded files use the source `Dy` tile with remove/open callbacks.
- The original ProseMirror `rUu` paste handler classifies clipboard file payloads and emits `pasted-images` for image-only pastes or `pasted-files` for other files. The controller exposes paired add/remove handlers for both channels.
- The Composer host's outer interaction contract has a dedicated file-drop path; this is separate from ordinary text paste and from the inner ProseMirror editor.

## Reconstruction implemented in this stage

- Added `ComposerDraftAttachmentsModel.ts`: preserves source order, deduplicates the same `File` object when the image/file paste channels overlap, keeps distinct same-name files, derives image/file presentation from the actual MIME type, and provides immutable remove/clear/size/reference helpers.
- Added `CodexComposerDraftAttachmentTray.tsx`: a source-shaped horizontal tray with image previews, file tiles, size labels and per-item removal. Each item explicitly carries `data-composer-attachment-upload-state="local-only"`.
- Extended `CodexComposerLayout`'s existing attachments slot with the source `data-composer-attachments` / `data-visible-attachments` markers.
- Enabled the existing Composer plus control as a real multiple-file picker.
- Connected the recovered ProseMirror `onPastedImages` and `onPastedFiles` controller subscriptions to the same intake model.
- Extended `CodexSourceComposerHostForm` to accept file drops through the outer form, show a drag-active state, and leave non-file transfers untouched.
- Attachment drafts remain scoped to their conversation in memory, survive switching away and back, and are cleared when that conversation is reset or the demo message is submitted.
- The explicitly demo-only submit path displays label-only attachment references in the user transcript. Those references have **no workspace path, no upload ID and no open action**. The demo response says the files were not uploaded and no real Agent request was sent.

## Scope boundary — important

This is a real local file-selection/paste/drop and draft-lifecycle path, **not** a restored upload service:
- File bytes are not read or sent to Electron Main.
- No local path is exposed, no workspace grant is requested, and no file ID is invented.
- No upload progress, retry, cancellation, remote storage or backend attachment event is simulated.
- The tile presentation is a semantic reconstruction of the source `G0e` / `Dy` composition, not a claim that the private original component implementation was recovered verbatim.
- The original source's full appshot, screenshot capture, selected-text, MCP model-context, shared-thread, browser comment and diff attachment families remain separate and are not collapsed into this simple File intake model.

## Validation added

- Core model tests cover image/file classification, object-identity deduplication, same-name distinct files, immutable removal, display-name sanitization, size labels and non-openable message references.
- Playwright tests cover file-picker selection, image preview, remove, attachment-only demo submission, label-only transcript references, ProseMirror file paste, outer-form file drop/drag state, per-thread retention and reset.
- CI status for this stage is pending until the branch workflow finishes. No attachment upload or Agent integration is claimed.


## CI verification — 2026-10-30

GitHub Actions push run [40994743866](https://github.com/wwxst/agent-web/actions/runs/40994743866) and PR run [40994749349](https://github.com/wwxst/agent-web/actions/runs/40994749349) both passed on code head `0ec1b00942c7ddd04e8abeed46c5dace30b72468`.

- Core reconstruction: 547 passed, 0 failed.
- Demo model integration: 5 passed, 0 failed.
- Screenshot comparator Chromium smoke: 1 passed, 0 failed.
- Browser suite: 81 passed, 0 failed, including all 3 new attachment E2E scenarios.
- Linux Electron desktop smoke: 82 passed, 0 failed.
- Windows Electron desktop smoke: 81 passed, 1 skipped, 0 failed.
- React TypeScript/Vite preview and Electron renderer builds passed.
- Linux Electron desktop and browser preview screenshot artifacts were uploaded by CI.

The passing tests establish local picker/paste/drop, draft retention/removal and non-openable demo references. They do not establish upload, remote storage, backend submission or pixel parity with the original Codex app.
