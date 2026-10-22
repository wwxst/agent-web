# Next reconstruction batch — Composer controller and host contract

## Current verified base

- `CodexComposerLayout.tsx` restores only the source-confirmed layout slots and attributes from `app-initial-5851df3f6cb1.js` (`kcr/Pcr/Hcr`) and the matching CSS layout selectors.
- The visible demo input still uses a synthetic textarea and mock send/stop behavior. It is **not** the original editor and does not connect to Electron or the Agent backend.
- The small `composer-1bf0334fecde.js` component is a generic compact/discussion composer with `onCancel/onChange/onSubmit`; do not mistake it for the full conversation composer without a verified call-site match.
- Latest source-derived tool-activity/diff commit: `f6f04330c5a910ca48823f9d88a05355ee5cb993`. CI verified 296/296 core tests, 4/4 demo model tests, strict React/TypeScript build and 12/12 Chromium tests.

## Source files to trace before implementation

Use the local, user-supplied `frontend.zip`; do not commit its proprietary compiled assets.

1. `frontend/webview/assets/app-initial-5851df3f6cb1.js` — identify the actual conversation composer call site and its injected controller/host callbacks, not just the generic layout wrapper.
2. `frontend/webview/assets/composer-controls-26fb26618ba3.js` — trace the exact toolbar/input action variants and enabled/disabled conditions.
3. `frontend/webview/assets/composer-provider-c4735dd21754.js`, `composer-scope-provider-cb17532fb9ac.js`, `composer-entry-3b36ec52926c.js`, `composer-state-fb90173904c6.js` — verify which provider/state contracts belong to the main composer and which belong to specialized browser-skill flows.
4. Matching `app-initial-e7c27dd40beb.css`, `composer-controls-d0f9925fd25f.css`, and composer/editor CSS chunks — restore only source-confirmed styling and slot behavior.

## Implementation gate

- First document the actual main-composer component tree, controlled editor state, submit/stop lifecycle, keyboard/composition handling, attachment/paste/drop behavior and source-owned disabled states.
- Then implement a typed host-neutral controller contract and wire a React Composer component through the existing `CodexComposerLayout`; preserve all verified layout work.
- Host callbacks must be explicit. No real message send, file upload, permission change or command execution may be faked as an integrated backend action.
- Only after the original host boundary is established should the Electron bridge be connected to the existing Agent backend.

## Acceptance

- Pin the source asset SHA-256 values and add focused signature audits for the exact call site and event branches.
- Add model tests for source-confirmed state transitions and Playwright tests for the actual rendered React Composer behavior.
- Keep the full browser suite green and label all mock-only controls honestly.
- Do not claim Composer parity or a runnable Electron application until it is launched and compared with the matching installed Codex build.
