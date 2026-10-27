# 2026-10-26 — Find in Thread reveal of a collapsed user-message match

## Original evidence (uploaded original Codex Windows `frontend.zip`)

Unmodified `frontend/webview/assets/collapsible-user-message-content-53649d62c3a8.js`,
SHA-256 `ad18386999b9b852feb032576fa24ca6f65b85c01e63813658fbd906a09a3921`.

The original `C`:
- supplies full original `text` to a source `_u` registration on the user
  message's viewport DOM ref: `re({highlight:"text",text:u,
  isTruncated:S&&g,reveal:S?b:void 0})`.
- Only passes a reveal callback while the message is **collapsed**.
  `b` is the same expansion action as the `Show more` button.
- Its `g` indicates the separate 20×512-character prefix-clip branch;
  even shorter Markdown may be collapsed by actual rendered line count.
- Registers the full text even if rendering only a prefix. It is therefore
  incorrect to search only currently visible DOM text.

The existing standalone demo Find provider uses a bounded literal source row
index and CSS Highlight API, **not** the original private `_u` registry and
native worker. This PR restores the source-observed reveal callback *at the
existing renderer boundary* without claiming private worker parity.

## Integrated reconstruction

- `SourceCollapsibleUserMessageModel.ts` validates exact source offsets
  against the full user-message text before a reveal, guarding unrelated
  activity/assistant matches.
- `CodexSourceCollapsibleUserMessage.tsx` registers a DOM event listener on
  its already-mounted message root, and synchronously unfolds via the SAME
  `setExpanded(true)` action as `Show more` when a valid selected Find result
  targets this source message. No fake transcript, detached modal, or alternate
  source renderer is created.
- `demo/threadFindRenderedHighlight.ts` delegates the selected hit only
  into a canonical, already-mounted user message **inside the selected
  virtualized turn**. It returns unhandled for absent/unrelated rows.
- `demo/App.tsx` retains the existing original-source scroll-to-key Find
  navigation. Once the row is mounted, it invokes this component-owned reveal
  action before the existing CSS-highlight range lookup and scroll-to-range.
- One model test rejects invalid/out-of-row offsets. One real Electron
  integration test types and sends a 39-paragraph message through the mounted
  ProseMirror editor, then opens Find through the actual native View menu,
  searches a unique text occurrence hidden below the collapsed viewport,
  asserts expansion + CSS highlight, captures an Electron screenshot, closes
  Find, and verifies explicit Show less still works. No baseline review
  fixture changes or backend calls.

## Remaining boundaries

- Private `_u` registry/worker, full text-normalized offsets, Markdown
  source-vs-rendered offset divergences (e.g., hidden link URLs), multi-block
  user turns and direct file/diff Find domains are NOT reconstructed here.
- Text clipping in code blocks and pixel parity still need source-specific
  renderer work.
- Screenshot artifacts are from independent Electron, not a side-by-side
  original Windows Codex pixel comparison.
- The new behavior is not accepted until the **final branch-head** Linux and
  Windows Electron CI jobs pass, including existing regression suites.
