# 2026-10-25 — original cFt selected-text Find in Thread integration

## Source evidence

Unmodified user-uploaded `frontend.zip`:
`frontend/webview/assets/app-primary-fe8a450b3b04.js`
SHA-256: `2a05e25229bd7a38c12c55d90f82fb07087e80b4e16070116b215484498478f2`.

Within source `iFt` the Find-in-Thread handler calls `cFt()`. The original
`cFt` selects text from an active HTML input/textarea using
`selectionStart/selectionEnd` (and returns without using the page selection if
the text control has no usable selection); otherwise it uses
`window.getSelection()?.toString()`. It trims the selection. No selection
returns undefined; a nonempty selection containing a CR or LF returns an empty
string, explicitly clearing the query; otherwise the selected text is used.

## Actual runtime change

The *mounted* `demo/App.tsx` Find action now uses
`sourceThreadFindSelectedQuery` for both focused text controls and page
selection. This replaces a double-escaped character class that inadvertently
rejected selections containing the ordinary letters `r` and `n` and restores
source CR/LF behavior. This is routed through the existing native View menu →
Electron preload → renderer command → real Find portal; no additional search
overlay or transcript renderer was introduced.

## Verification

- `tests/source-thread-find-selection.test.mjs`: input precedence,
  no-selection semantics, ordinary `r/n` text and CR/LF reset behavior.
- `desktop/electron-smoke.test.mjs`: selects actual visible sidebar text
  containing `n`, invokes the native `findInThread` item, checks the mounted
  Find input prefill, and captures a real Electron screenshot into
  `desktop/test-results/electron-find-selection-prefill.png`.
- Required CI gates: core/model/build, Chromium browser tests, and real
  Linux/Windows Electron smoke on the final PR head. Report their actual
  results from Actions; tests committed here are not proof of passing CI.

Scope: This repairs Find selection behavior in the standalone demo host only.
It does not reconstruct private focus-pane routing, original regex workers,
real Agent data, or pixel-level original Codex parity. No backend changes.
