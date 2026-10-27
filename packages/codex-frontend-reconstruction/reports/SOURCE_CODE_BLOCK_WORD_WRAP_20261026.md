# 2026-10-26 — Mounted Markdown code-block word-wrap and action bar

## Original user-provided compiled Codex evidence (read-only)

- `frontend/webview/assets/chatgpt-code-block-d92f3a4029b6.js`
  SHA-256 `4e9522c34ee74936140e83bb8c722c25ec8600206782c8086946456675a5cf4e`.
  In `Fn`, the original `onToggleWrapCode` is present only in code
  mode with no forced wrap/alternate content, and toggles a **shared**
  preference: `()=>T.set(Ce,!A)`. It passes
  `shouldWrapCode:f||A` into its code snippet UI.
  The nested `Ht` switches its source scrollport:
  `overflow-x-hidden` vs `overflow-x-auto`, and switches its
  `pre` from `min-w-max whitespace-pre` to
  `min-w-0 whitespace-pre-wrap wrap-anywhere`.
- `frontend/webview/assets/app-initial-5851df3f6cb1.js`
  (original `Jrd`): the code snippet contract has
  `codeBlockWordWrap:"always"|"user-controlled"|...`. The
  `"user-controlled"` branch makes the toggle available and writes
  the shared `ord` preference; the `"always"` branch enforces wrap.
- `frontend/webview/assets/app-shared-bbfeca5e5737.js`
  (original `zzn` and `Vzn`):
  - action bar has normal-mode
    `min-h-12 gap-2 py-1.5 ps-4 pe-1.5`, i.e. >= 48px
    minimum header height at original 4px spacing.
  - real wrap button uses `aria-pressed`, named
    `codeSnippet.wrap.enable` / `codeSnippet.wrap.disable`, with
    default labels "Enable word wrap" / "Disable word wrap".
  - code snippet content is under `data-code-block-source`;
    header `data-markdown-copy=exclude` and enclosing block
    `data-markdown-copy=code-block`, distinct from copy action text.
- `frontend/webview/assets/chatgpt-code-block-highlighting-72144295f264.js`
  is the private highlighting theme/controller dependency. No claims
  are made that our static react-markdown code DOM implements its
  highlighter, incremental tokenizer, editable CodeMirror, preview,
  code execution or native host persistence.

## Recovery in the *running* standalone frontend

1. Added `SourceCodeBlockWordWrapPreference`: host-agnostic
   shared observable preference and source-style explicit
   always/never/user-controlled gating.
   This is **session-scoped** and cannot be advertised as
   Codex account-backed persistence.
2. `demo/adapters.tsx` now uses `useSyncExternalStore` against one
   host-level store, so changing either rendered code block also
   updates every other mounted Markdown code block. It leaves the
   existing `react-markdown`, original message timeline and
   clipboard action in place. The source-style button exposes
   `aria-pressed` and the original English accessibility labels,
   and marks the header as excluded from Markdown copy.
3. `demo/codexDesktopShell.css` recovers the 48px action bar
   contract, dual horizontal-scroll/wrap presentation and
   source scrollport / `pre` behavior in the real Markdown host.
4. Core test covers shared subscriptions and wrap-policy decisions.
   Chromium and **real Windows/Linux Electron** browser tests send a
   message with two long code fences through the mounted composer,
   assert both share wrap state, computed overflow/white-space and
   real scroll geometry, verify code text is not changed by toggles,
   and capture a screenshot.
5. No review fixture, backend RPC, or separate fake transcript is
   introduced.

## Not yet implemented, must not claim original parity

- Original private preference `Ce/ord` persistence and account/device
  synchronization. This fallback has no durable storage.
- Private incremental syntax highlighting, CodeMirror editable state,
  streaming scroll-to-bottom, syntax-language selection,
  auto-preview/visualization/HTML sandbox, source SVG handling,
  actions not backed by the independent Agent backend.
- Same-version running original Codex Windows desktop application
  pixel-level screenshot comparison and exact private theme tokens.

Final acceptance requires Linux and Windows CI success on **final
commit**; PR remains stacked and unmerged unless the user approves.
