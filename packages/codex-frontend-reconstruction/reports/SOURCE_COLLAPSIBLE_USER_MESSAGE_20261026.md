# Source long user message disclosure — 2026-10-26

## Original source verification

Uploaded read-only `frontend.zip`:

- `frontend/webview/assets/collapsible-user-message-content-53649d62c3a8.js`
  SHA-256 `ad18386999b9b852feb032576fa24ca6f65b85c01e63813658fbd906a09a3921`.
  - Compiled `C` defaults to **20 rendered lines** (`O=20`) and the
    fast truncation limit is `lines * 512` characters (`k=512`).
  - For user messages below that limit it calls a content measurement hook
    `DE` and clips based on rendered line height and markup overflow.
  - It shows an ellipsis for folded ellipsis mode, and a
    `Show more / Show less` disclosure button; the button carries
    `aria-expanded`, `data-thread-find-skip`,
    `data-markdown-copy="exclude"`.
  - Long text is passed to the host markdown renderer as the first
    `lines*512` characters only while collapsed; the complete string is
    passed after expanding.
  - `beforeprint` / `afterprint` force unfolded markup on print.
  - Folded interactive descendants below the clipping boundary are set
    `inert` and `aria-hidden=true`, then restored when visible.
- `frontend/webview/assets/user-message-74653d08e16f.js`
  SHA-256 `a794210f0968eb919c5e400e28341a41fc6915cded18a3345b17db63d1b40da8`.
  - Compiled `yt` supplies **actual message text** and a
    host-owned Markdown render callback to the imported collapsible `C`.
  - This disclosure is therefore a responsibility of the real user-message
    renderer, not a separate synthetic transcript.

## Actual integration (branch recovery/source-collapsible-user-message-20261026)

- Adds `SourceCollapsibleUserMessageModel.ts` and
  `CodexSourceCollapsibleUserMessage.tsx` within previously recovered code.
- The existing `ConnectedConversationMessageRenderers.UserMessage`
  receives the complete original string and passes a text render callback
  through the new disclosure to the **existing** Markdown host; no duplicate
  transcript or alternate list is introduced.
- Actual DOM `ResizeObserver` / `MutationObserver` measure the rendered
  markdown content, and `IntersectionObserver` plus direct geometry checks
  prevent keyboard traversal into clipped links and buttons.
- Restores print-expanded content, with original aria/Find/Markdown-copy
  exclusion props on the disclosure.
- Styles the real message bubble through `demo/codexDesktopShell.css`;
  user message content remains part of the canonical virtualized turn list.
- The real Electron acceptance **types and submits** a 35-paragraph Markdown
  message through the already-mounted ProseMirror composer. This exercises
  the same append-to-live-conversation path as ordinary mock sends rather
  than changing base review fixture rows or replacing the virtualized UI.
  The submitted message has a link beyond the fold for focus checks.
- Electron captures `conversation-long-user-collapsed.png` and
  `conversation-long-user-expanded.png`.

## Boundaries and remaining fidelity gaps

- Recovered clipping is based on the original observable DOM contract but
  uses an independent ResizeObserver-backed measurement, not private
  `DE` text-fitting internals. Original special-case code-block clipping
  (which can extend the measured height to include a full intersected code
  block), advanced search reveal handler `_u`, precise theme tokens, and
  localized button strings are not yet restored.
- This does not promise identical pixel measurements on all fonts, widths,
  or themes; a same-version original Codex screenshot comparison is required.
- The submitted message uses the explicitly mock-only send pipeline; it does
  not represent genuine Agent events or backend actions.
- Core tests and screenshots require a **successful final branch CI**, not
  just the creation of test files.
