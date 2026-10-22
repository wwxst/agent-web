# Next reconstruction batch — Composer clipboard host bridge and stop state

## Verified base

- Latest branch head: `d6240f005e382437c14dce1662bd73d332ea7889`; draft PR #1 remains open.
- `ComposerEditorBehaviorModel.ts` now ports the source-confirmed keyboard routing from `rUu`; the demo uses it for Enter routing but still uses a textarea.
- The exact `app-initial` asset audit passes 40/40 signatures for the editor/controller factory, keymap, plugin order, paste/drop and clipboard serialization. `app-primary` passes 9/9; the controller hook passes 4/4.
- Successful implementation CI at parent `154fbb6`: 309/309 core tests, 4/4 demo integration tests, strict React/TypeScript build, 13/13 Chromium tests. A follow-up commit corrected only one case-sensitive audit signature; its GitHub Actions status is still pending.

## Next implementation gate — controller clipboard events

The original `EUu` controller exposes these source-confirmed event methods:

- `addPastedImagesHandler` / `removePastedImagesHandler`
- `addPastedFilesHandler` / `removePastedFilesHandler`
- `addPastedTextHandler` / `removePastedTextHandler`
- `subscribePastedLink`, which returns an unsubscribe callback

The main host (`YMt` in `app-primary-fe8a450b3b04.js`) registers the image/file handlers and routes them to host file selection; it registers the large-paste handler only when its feature/policy gate is enabled. The outer form also owns `onPasteCapture`, `onDropCapture`, and `onSubmit`; the drop/paste overlay helper is a separate host concern. These event handlers belong at the main Composer host boundary, not in the layout-only `CodexComposerLayout`.

Implement next:

1. Extend the typed controller contract with payloads for pasted images, files plus their `DataTransfer`, large-paste text (`text`, optional `markdown` and `codeBlockLanguage`), and pasted-link text/HTML.
2. Add a small host event bridge that registers and removes the source controller handlers as the controller or callbacks change. Preserve the source distinction between paired add/remove methods and the unsubscribe-returning pasted-link subscription.
3. Add lifecycle tests using a fake controller port: handlers register once, current callbacks are used, all listeners are removed on controller replacement/unmount, and a large-paste handler's `false` result is preserved.
4. Trace the exact outer `pd/hd` paste/drop helpers and their source callback conditions before wiring any actual file selection. Keep uploads disabled in the demo until a real host callback exists; tests must not report mock file events as successful uploads.
5. Then recover the source stop/send control states (`Ti/wi/Ci`, `onStop`, streaming, pending uploads, disabled/loading states) and connect them to the current button only through an explicit host-neutral state model.

## Acceptance

- Run `scripts/audit-composer-evidence.mjs` against the user's exact private assets.
- Run core tests, demo integration tests, strict React/TypeScript build and the complete Chromium suite.
- No raw compiled assets are committed.
- No real upload, message send or stop action is claimed until an actual host callback is connected.
- Do not claim the ProseMirror editor or complete Composer has been restored until the original controller/schema/plugins are mounted and compared against the matching Codex build.
