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
