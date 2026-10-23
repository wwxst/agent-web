# Main Composer: real ProseMirror plain-mode integration

## Original implementation evidence

- User-supplied source: frontend/webview/assets/app-initial-5851df3f6cb1.js
- SHA-256: c70d95da34ba7e5962a559dbf68d0102d10b4b47b877f5d9933629bb5a1f3a10
- Source chain: rUu creates EditorState and EditorView, SUu constructs EUu, XWu mounts the controller DOM in React.
- Compiled plain schema kja: doc (block+), paragraph (inline*), code_block (text*), text (inline), plus the private Dja mention nodes and KCa extended link attributes.
- Eight additional exact source signatures are pinned in scripts/audit-composer-evidence.mjs for kja, EditorView creation, transaction dispatch, keyboard/IME and paste/drop.

## Implemented in the existing conversation UI

- SourcePlainProseMirrorController.ts constructs real upstream ProseMirror EditorState + EditorView with the verified plain-mode base node specifications. It is not a DOM contenteditable clone.
- DemoProseMirrorComposerEditor.tsx now mounts that real editor through the existing CodexSourceComposerEditorMount and CodexSourceComposerHostEvents. demo/App.tsx no longer mounts DemoTextareaComposerEditor.
- Reuses ComposerEditorBehaviorModel for Enter, Shift-Enter, Alt-Enter, Mod-Enter and IME decision routing. The plain-mode fallback uses ProseMirror splitBlock; undo/redo uses upstream history and keymap.
- Preserves the existing controlled text state, form submit, synthetic send/stop actions, callback subscriptions and component lifecycle.
- React type-check/build and 16 Chromium browser tests passed for the implementation after correcting an invalid readiness expectation in the newly added undo test. GitHub Actions run 39885831086.

## Explicitly NOT recovered

- rUu rich Markdown schema from jja, inline file/app/plugin/skill mention atoms from Dja, literal link provenance (KCa), slash-command suggestion plugins, rich HTML paste normalization, and code-block extension commands.
- Private history isolation and input rules, deferred submit state requestSubmitWhenReady, exact serializer, attachment creation/upload, dictation, integrated voice and Electron/Agent host operations.
- This stage retains only a source-shaped plain ProseMirror subset. The browser still produces explicit synthetic Agent responses; no live backend connection or pixel-level Codex parity is claimed.

## Next evidence/implementation gate

Trace the source rich-schema plugin dependency graph and choose verifiable upstream components before enabling Markdown or mentions. Extend clipboard/editing tests and add the source-exact deferred-submit contract without bypassing the already recovered controller mount.
