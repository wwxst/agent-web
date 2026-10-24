# Composer clipboard: original rUu code-block text serialization (2026-10-24)

## Original evidence and limits

- Authoritative user-provided compiled asset: `frontend/webview/assets/app-initial-5851df3f6cb1.js`, SHA-256 `c70d95da34ba7e5962a559dbf68d0102d10b4b47b877f5d9933629bb5a1f3a10`.
- The original `rUu` ProseMirror `clipboardTextSerializer(e)` descends through a single-child open slice (depth `1..min(openStart,openEnd)`), resets to original content unless the slice has exactly one textblock, and returns `firstChild.textContent` when `openStart>0` and the single node is `code_block`.
- Its **other** branch uses the private `uG(slice, {forClipboard:true}).content` Markdown serializer. That serializer and the complete private `jja` rich editor are not yet ported; do not claim full rich clipboard parity.

## Integrated change

- Reused the existing mounted `SourcePlainProseMirrorController` (the real `EditorView` in the existing `CodexSourceComposerEditorMount` / `DemoProseMirrorComposerEditor` chain). No new editor, Composer shell or parallel clipboard adapter.
- Added a `clipboardTextSerializer` EditorView prop matching the source-confirmed single `code_block` path. Ordinary selections retain ProseMirror's upstream plain-text `textBetween(...,"\\n\\n")` fallback; no invented Markdown serialization or clipboard postprocessing.
- Added a browser regression `demo/e2e/composer-clipboard-source.spec.ts` that types a code fence into the actual editor, selects code, copies via keyboard, reads the browser clipboard, and checks ordinary text copying as a regression.
- No original private compiled code is committed. This is a UI-only source-backed recovery; it does not connect send, stop, attachments or Agent backend.

## Verification

Run `npm run test:core && npm run demo:check-model && npm run demo:build && npm run demo:test:e2e`; the GitHub PR's final-head Linux / Windows CI is the acceptance result. Clipboard tests must pass the mounted Chromium run before this change is marked verified. Windows Electron remains covered by existing CI smoke, but it does not yet perform a Windows-specific clipboard test.

## Open work

Original `uG` Markdown serializer for general/mixed rich document slices, link provenance, mention atoms, node views, copy/paste across applications, and native Windows clipboard parity are still missing. Continue source-first on the original rich editor; do not infer the private schema.
