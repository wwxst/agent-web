# 2026-10-26 — Original user-message Rt compact bubble wiring

## Evidence (user-provided original Codex Windows compiled bundle, read-only)

- `frontend/webview/assets/user-message-74653d08e16f.js`
  SHA256 `a794210f0968eb919c5e400e28341a41fc6915cded18a3345b17db63d1b40da8`
  - Original `Rt` destructures the public component prop
    `isAeonFormatted: le`.
  - It computes `I = le ?? ze` where `ze` depends on private
    capability `O(le==null && tt, Re)`; we **do not** recreate or
    guess this original private fallback.
  - `I` selects `Q.compactMessageBubble` and `py-2` rather than
    normal `py-2.5`. `I` is also passed to the real `yt` message
    content and source `collapsible-user-message-content C`.
- `frontend/webview/assets/user-message-5f3d424c6182.css`
  SHA256 `673790a44e1915b97072c9b080da8cdaafca9d5ba7c614c481924225cef2be93`
  - `_bubble_168sz_1`: standard user-chat width 70%, radius
    `5.5*spacing`, horizontal padding `4*spacing`.
  - `_compactMessageBubble_168sz_15`: intrinsic `width:fit-content`,
    `--user-chat-width:min(456px,100%)`, radius `4*spacing`,
    horizontal margin `3*spacing`, `corner-shape:superellipse(1)`,
    separate compact surface color and foreground.
  - compact `[data-markdown-text-tone=user-message]` switches
    line height to `markdown-font-size + 4px` and
    `letter-spacing:-.01em`.
- `frontend/webview/assets/collapsible-user-message-content-53649d62c3a8.js`
  SHA256 `ad18386999b9b852feb032576fa24ca6f65b85c01e63813658fbd906a09a3921`
  - `isAeonFormatted` modifies disclosure-button appearance,
    but the 20-line/512-char clipping logic is otherwise shared.

## Real integrated change

- `ConnectedConversationMessageRenderers.UserMessage` resolves compact
  **only when the actual per-message source item explicitly contains
  `isAeonFormatted===true`**. Unknown flags/default values keep
  standard appearance; a private feature flag is NOT invented.
- The flag is forwarded to the **same**
  `CodexSourceCollapsibleUserMessage` previously integrated with
  native Find, while a stable `data-source-user-message-format`
  marker lets the existing demo stylesheet apply correct conditional
  appearance and expose state to accessibility/integration tests.
- The existing normal 70% user message, 22px corner and 16px padding
  remain unchanged. The explicit compact item renders with a 456px
  max width, intrinsic width, 16px corner, 12px horizontal / 8px vertical
  padding and a tighter Markdown text tone.
- A single review message fixture has an **explicitly synthetic**
  `isAeonFormatted:true` item property so normal and compact
  branches are exercised inside the actual mounted virtualized
  conversation. This fixture is NOT real Agent data, an app setting,
  an assumed review-thread rule, or a claim of complete product support.
- Chromium browser and Windows/Linux real Electron smoke visit the
  existing two conversations and measure both messages' **computed DOM
  styles**, with Electron/browser screenshots, no substitute renderer.

## Not yet recovered

- The original private `tt/Re/O` compact formatting capability and
  its host/account state source are not available; no inference from
  thread title, window size, role or screenshot is implemented.
- Actual Agent backend message metadata transport is still missing.
- Exact original desktop theme tokens (including the compact
  background), dynamic color overrides, advanced superellipse support
  and pixel-level comparison to the same-version running Codex Windows
  executable remain to be verified.
- Must pass both final-commit Linux and Windows CI before declaring
  this tranche complete. Keep stacked PR open; do not merge main.
