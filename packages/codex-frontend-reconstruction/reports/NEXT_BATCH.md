# Next reconstruction batch — Composer controller and host contract

## Current verified base

- `CodexComposerLayout.tsx` restores only the source-confirmed layout slots and attributes from `app-initial-5851df3f6cb1.js` (`kcr/Pcr/Hcr`) and the matching CSS layout selectors.
- The visible demo input still uses a synthetic textarea and mock send/stop behavior. It is **not** the original editor and does not connect to Electron or the Agent backend.
- The small `composer-1bf0334fecde.js` component is a generic compact/discussion composer with `onCancel/onChange/onSubmit`; do not mistake it for the full conversation composer without a verified call-site match.
- Latest source-derived tool-activity/diff commit: `f6f04330c5a910ca48823f9d88a05355ee5cb993`. CI verified 296/296 core tests, 4/4 demo model tests, strict React/TypeScript build and 12/12 Chromium tests.

## Source trace completed for the current gate

The exact main-composer call path is now traced from the supplied bundle:

- `app-primary-fe8a450b3b04.js` (`YMt`) owns the main host callbacks, source-side readiness/submit/stop state and outer form.
- `app-initial-5851df3f6cb1.js` (`XWu`) mounts `composerController.view.dom`, sets placeholder/submit readiness, registers controller submission, and forwards composition/input events.
- `reports/COMPOSER_SOURCE_RECOVERY.md` records the source facts, full asset hashes, remaining uncertainty and a reproducible audit command.
- `src/conversation/ComposerInteractionModel.ts` is integrated into the browser demo's send path; the current textarea remains clearly demo-only.

## Next implementation gate — original editor plugins and submission events

1. Recover the `rUu` ProseMirror construction path, schema, extension list, plugin/keymap setup and the event that emits the controller's `submit` event. The demo adapter currently implements only a native Enter handler for testing.
2. Port the source-confirmed Enter/IME, mention selection, rich-link click/edit, and plain-text/markdown behavior only after tracing their original plugin branches.
3. Trace the file paste/drop intake path through `_jt` and the composer toolbar to recover the exact upload-intake contract; keep file selection disabled in the demo until that boundary is implemented.
4. Trace `Ti/wi/Ci` and the host's `onStop` path to restore send-versus-stop button presentation and enabled/loading states.
5. Preserve the current DOM mount adapter as a boundary; do not claim ProseMirror parity until the original controller and plugin semantics are mounted and browser-tested.
6. Keep Electron IPC and Agent backend actions behind explicit host callbacks; do not report demo mock actions as real sends/stops/uploads.

## Acceptance

- Run `scripts/audit-composer-evidence.mjs` against the exact private source assets.
- Add focused model tests and Playwright tests for the actual React-mounted controller DOM.
- Keep core tests, strict React/TypeScript build, and browser smoke suite green.
- Do not claim Composer parity or a runnable Electron application until the controller/editor is genuinely mounted and compared with the matching installed Codex build.

## Acceptance

- Pin the source asset SHA-256 values and add focused signature audits for the exact call site and event branches.
- Add model tests for source-confirmed state transitions and Playwright tests for the actual rendered React Composer behavior.
- Keep the full browser suite green and label all mock-only controls honestly.
- Do not claim Composer parity or a runnable Electron application until it is launched and compared with the matching installed Codex build.
