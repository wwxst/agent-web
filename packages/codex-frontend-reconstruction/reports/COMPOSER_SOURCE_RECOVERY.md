# Main Composer source recovery — 2026-10-22

## Exact source assets

The audit below targets the user's supplied Windows Codex frontend bundle and intentionally does not copy the compiled source into this public repository.

| Bundle | SHA-256 | Source role |
|---|---|---|
| `app-primary-fe8a450b3b04.js` | `2a05e25229bd7a38c12c55d90f82fb07087e80b4e16070116b215484498478f2` | Main conversation Composer component `YMt`, host callbacks and submit/stop control |
| `app-initial-5851df3f6cb1.js` | `c70d95da34ba7e5962a559dbf68d0102d10b4b47b877f5d9933629bb5a1f3a10` | Rich-text editor `XWu` and controller-to-DOM lifecycle |

Run the read-only audit after extracting the two original files from `frontend.zip`:

```sh
cd packages/codex-frontend-reconstruction
node scripts/audit-composer-evidence.mjs --assets-dir /private/path/frontend/webview/assets
```

The audit pins full SHA-256 hashes and verifies the source signatures; it does not add or commit proprietary bundle assets.

## Main Composer: `YMt` in app-primary

Directly confirmed source facts:

- The component receives `composerController`, `onSubmit`, `onStop`, `onUserInput`, `onFilesSelected`, and `onPastedText` from its host.
- The editor contract passes the controller, placeholder, focus request, and `submitReady = xi && !nr && !Ka`; editor submit reads the controller's `getText()`.
- The outer form owns submit, paste-capture and drop-capture handlers. It forwards the event timestamp and whether a submitter was present.
- Dictation send is a distinct route: it requests the voice send action only when voice input is available and submission is not blocked.
- The normal submit route guards controller readiness, a non-idle voice runtime, disabled conversations, pending actions, and the work-home policy acceptance condition.
- The primary button can represent either send or stop. Its disabled/loading states are derived from host streaming, stopping, upload and submit state; the demo must not hard-code these as if they were the original private state machine.

## Rich text editor: `XWu` in app-initial

Directly confirmed source facts:

- The editor is controller-owned DOM (`composerController.view.dom`), not a React-controlled textarea.
- The component sets the placeholder and accessible label, mounts the controller DOM into its input frame, marks input active, clears initial focus state, and focuses only under source-owned conditions.
- It registers a controller submit handler that cancels pending submit before forwarding the event; it also propagates the computed `submitReady` value to the controller.
- It forwards input and composition-start/end events, marks the controller DOM for virtual keyboard handling, and uses `ResizeObserver` plus the document font-loading event to refresh overflow layout.
- Cleanup unregisters listeners/observers, deactivates the controller input, and detaches or defers detachment of the editor DOM.

## This batch's implementation

- Added `src/conversation/ComposerInteractionModel.ts`, a typed host-neutral model for the source-confirmed outer submission gates. The host's complete readiness calculation and private editor remain injected, not recreated.
- Wired the model into the current browser demo's send path. The demo maps its own pending mock action to a pending-action gate; it still does not send a real Agent request.
- Added explicit composition-state handling to the demo textarea so Enter cannot accidentally submit while an IME composition is active. This is a demo safety behavior; it is not a claim that the textarea matches ProseMirror keyboard behavior.
- Added unit tests for readiness, dictation routing, voice-session blocking, disabled conversations, pending actions, and work-home policy acceptance; added a browser test for composition-state behavior.

## Not yet recovered

- The original ProseMirror/editor implementation and plugin/keymap behavior.
- Full host controller creation, all submit metadata semantics, exact paste/drop/file-intake routing, and all stop/streaming branches.
- The original private theme/design system and complete Composer toolbar/attachment UI.
- Electron IPC and the real Agent backend connection.

Do not claim main Composer parity until the actual controller/editor is mounted, all source-confirmed callbacks are wired to an explicit host contract, and browser interaction/screenshot comparisons run against the matching original build.


## Controller factory and mounted editor DOM — follow-up checkpoint

The factory path has now been traced beyond the component props:

- `use-chatgpt-composer-controller-2d447301fbc7.js` creates or accepts a controller and disposes an owned instance on unmount.
- The exported factory `SUu` in `app-initial-5851df3f6cb1.js` calls `rUu` to build the ProseMirror view/event emitter, then constructs the `EUu` controller.
- The controller's concrete source surface includes `view`, `initialInputFocused`, `getText`, `setText`, `setPlaceholder`, `setInputActive`, `clearInitialInputFocus`, `focus`, `addSubmitHandler`, `cancelPendingSubmit`, `setSubmitReady`, and `destroy`. Its submit event listener receives an optional numeric timestamp, not a DOM `SubmitEvent`.
- Added `ComposerControllerContract.ts` and `CodexSourceComposerEditorMount.tsx` around this observed interface. The mount adapter handles DOM mounting/detaching, label/placeholder, readiness and submit registration, composition/input callbacks, overflow observation, font-load updates and focus requests.
- The demo now uses `DemoTextareaComposerEditor` to exercise this mounted-controller boundary. Its native textarea is deliberately a demo-only controller implementation; the actual ProseMirror factory and plugins have not been copied into the demo.

The exact factory bundle SHA-256 is `e39ff89c1c226141bc5f0af4f6ca70cc09e98b26561ff28fd4ab4b17a9becbef`. The audit script now checks the factory and controller-class signatures in addition to the main Composer and RichTextInput assets.


## ProseMirror factory and event routing — source trace (2026-10-22)

The source factory is `rUu` in the pinned `app-initial-5851df3f6cb1.js` asset. Its options include `defaultTextKind`, `enableCodeBlocks`, `enableFileMentions`, `enableRichText`, `enableSelectedTextLinks`, `enableSkillMentions`, `enableSlashCommands`, `enterBehavior`, `initialDocument`, `literalMarkdownLinkSources`, `onDocumentChange`, `plainTextMode`, the Markdown-link restoration flags, and suggestion options.

### Schema and plugin construction

- Rich-text mode creates the Markdown editor helper (`jja()`) and uses its `pmu.schema()`; otherwise the factory falls back to the shared `kja` schema.
- The base plugin sequence is source-ordered: placeholder/plugin-state infrastructure; optional literal-Markdown-link tracking; common selection/suggestion plugins; the rich-text plugin set (selection decoration, list input, code-block fence exit, input rules and history isolation); the suggestion plugin set from `HSe`; rich-text editing commands (typed table, blockquote backspace, backspace, tab indent, code-block deletion); the wrapped keymap; optional code-block plugins; rich-text arrow-exit/extension keymaps; link tracking; shared editor plugins; placeholder decoration; link plugins; and the final composer plugin.
- The `S` fields are properties of the private Markdown-editor plugin bundle, not public package names. Their exact internal implementations remain embedded in the original bundle; this report records the observable order rather than claiming to have recreated them.
- `EditorView` is configured with `role=textbox`, `aria-multiline=true`, `dir=auto`, `spellcheck=true`, and `tabindex=0`. It also supplies pasted-text/HTML transforms, Markdown node views and selected-inline-atom decorations.

### Keyboard submission semantics

- The wrapped keydown handler first defers to the editor/browser while composing or when `keyCode === 229`.
- A host shortcut override returning `true` emits the controller's `submit` event with the key event timestamp. Returning `false` suppresses submission and routes Enter to editor commands.
- Enter is first offered to an active suggestion UI. Otherwise `newline` and `cmdAlways` modes run editor commands; `cmdIfMultiline` does so for a multiline document or code block; the default `enter` mode emits `submit`.
- Shift-Enter and Alt-Enter route to editor commands. Mod-Enter normally emits `submit`, with explicit source branches for a false host override, the non-Windows coarse-pointer case, and an editor-specific command that can consume the shortcut.
- `ComposerEditorBehaviorModel.ts` ports this observable submit-versus-editor-command routing and is now used by the demo textarea adapter. The demo deliberately supplies no suggestion, code-block, document-structure or host-shortcut state; it does not emulate ProseMirror list commands or claim editor parity. During IME composition the original keymap returns `false`; the demo textarea adapter separately prevents its native submit/newline behavior for safety.

### Paste, drop, and clipboard serialization

- `handlePaste` lets the app-specific clipboard consumer run first, then classifies pasted files/images and emits `pasted-files` or `pasted-images` to the controller. Large paste content can emit `pasted-text` with text plus optional Markdown and code-block language; a plain URL in an empty inline selection can emit `pasted-link` with both text and HTML.
- Normal text/HTML paste has distinct branches for plain-text mode, large HTML, browser autocomplete, selected-text link conversion, Markdown parsing, and the Markdown editor's preferred HTML/literal-text handlers. These are editor-owned transformations, not a generic textarea paste operation.
- File drops are consumed by the editor so the outer Composer host can route them. Plain-text mode inserts dropped text at the drop position; rich-text mode has an additional HTML fallback before leaving other drops to the default editor handling.
- Clipboard serialization preserves code-block text for a single copied code block and otherwise uses the source's text/Markdown serializer.
- The controller exposes paired add/remove methods for pasted images, files and large text, plus an unsubscribe-returning pasted-link subscription. The host registers these in the main Composer layer; they do not belong to the layout-only component.

### Validation boundary

The read-only audit now checks the `rUu` schema/plugin/keymap/paste/drop signatures against the exact bundle hash. This proves that the local source file still matches the analyzed build; it does not make the private ProseMirror schema, plugins or file-upload host actions available in the reconstructed demo.


## Controller clipboard host bridge — implementation checkpoint (2026-10-22)

- Extended `ComposerControllerPort` with the source-observed pasted-image, pasted-file, large-paste-text and pasted-link subscriptions from `EUu`. Payload types preserve the original distinction between `File[]`, `DataTransfer`, large-paste `text/markdown/codeBlockLanguage`, and link `text/html`.
- Added `connectComposerControllerClipboardEvents` plus `CodexSourceComposerHostEvents`. The bridge lives at the host boundary, not inside the layout component; paired subscriptions are removed on cleanup and the pasted-link subscription uses its returned unsubscribe function.
- The visible textarea demo controller implements the contract only so React mount/cleanup is testable. It does not synthesize paste events or perform uploads. Demo callbacks explicitly report that image/file upload is not integrated; large pasted text returns `false` so the editor's normal paste path is not consumed.
- Added source audit signatures for all four controller event APIs. This adapter alone is not a claim that ProseMirror paste/drop behavior is restored.

## Main Composer primary action state — YMt / Ti / wi / Ci (2026-10-23)

- The original main host computes the primary button mode as `Ti`, its stop pending/loading state as `wi`, and its send loading state as `Ci`. The exact expressions are now included in `audit-composer-evidence.mjs` for the pinned `app-primary` asset.
- `src/conversation/ComposerPrimaryActionModel.ts` ports the source's boolean precedence, including upload-wait, submission-in-progress, streaming, host stop signal, steering/native queue eligibility and host disable states.
- The existing demo React send/stop button consumes the model instead of directly branching on `playing`. The mock host explicitly maps `playing` to a synthetic streaming state; it still cannot send or stop a real Agent request.
- Unit tests and a rendered browser test guard the source-derived stop/send distinction and prevent a regression in demo action availability.
- The real host selectors `cj`, `Yg`, `p0`, `mSe`, disabled policies, and full file-upload/status changes are intentionally injected rather than guessed. No Electron IPC or real submission/stop handler is connected.
