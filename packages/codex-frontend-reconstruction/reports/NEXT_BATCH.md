# Next reconstruction batch — Real Composer editor and host integration

## Verified base (2026-10-23)

- Branch: `recovery/codex-frontend-through-connected-message-20261021`. Latest implementation commit: `3d2a3db104812160636a3c6a5b2e796df9cca139`, draft PR #1 still open.
- Controller clipboards: `ComposerControllerContract.ts`, `ComposerControllerClipboardEvents.ts` and `CodexSourceComposerHostEvents.tsx` support the original paired listener APIs. They do not upload files.
- Editor layout: `CodexComposerLayout.tsx` + `CodexSourceComposerEditorMount.tsx` use source-derived wrapper DOM and mounted controller lifecycle. The demo still supplies a *native textarea*, not ProseMirror.
- Main action: `ComposerPrimaryActionModel.ts` now owns the source `YMt/Ti/wi/Ci` visual state, with all private host selectors supplied as typed state.
- Form: `CodexSourceComposerHostForm.tsx` now owns `YMt/pd/hd/gd` form, paste/drop capture and submitter metadata, integrated with the same browser demo. Real file intake is disabled.
- Verified CI: 322/322 core, 4/4 demo model, TypeScript/Vite and 15/15 Chromium at `3d2a3db` (run `39881222988`). Proprietary assets are not in Git history.

## Highest priority — original ProseMirror controller instead of the demo textarea

1. Inspect `app-initial-5851df3f6cb1.js` `SUu -> rUu -> EUu` and the actual `YMt -> XWu` main-thread call site. Recover the schema, plugin ordering and controller factory **from source semantics**, not a hand-authored `contenteditable` clone.
2. Inventory which source-owned editor dependencies can be represented by upstream ProseMirror packages and which remain private. Keep a traceable gap matrix for the original Markdown, mentions, suggestion, link and code-block extensions.
3. Introduce a source-derived controller factory behind `ComposerControllerPort`; mount it through the existing `CodexSourceComposerEditorMount`, not a second UI shell. Prove Enter variants, IME, focus, initial text, paste, history, and controller dispose in browser tests.
4. Only after a real controller is running, wire verified host file intake and approval/permission states through explicit callbacks and source-shaped IPC contracts. Do not invent upload outcomes, Electron messages or Agent responses.
5. Compare pixel and interaction results with the *same original Codex build* and viewport. Confirm source-owned themes, resize behavior, suggestions and attachment tray.

## Source and acceptance gates

- Local user asset: `frontend.zip`; main JS hashes: `app-primary=2a05e25229bd7a38c12c55d90f82fb07087e80b4e16070116b215484498478f2`, `app-initial=c70d95da34ba7e5962a559dbf68d0102d10b4b47b877f5d9933629bb5a1f3a10`, controller hook `e39ff89c1c226141bc5f0af4f6ca70cc09e98b26561ff28fd4ab4b17a9becbef`.
- Preserve green tests for Composer, virtual list, tool activity and FileDiff while integrating the real controller.
- Confirm UI with browser/Electron; do not call the textarea preview the final frontend.
- Keep commits isolated in the recovery branch; do not merge PR #1 without approval.
