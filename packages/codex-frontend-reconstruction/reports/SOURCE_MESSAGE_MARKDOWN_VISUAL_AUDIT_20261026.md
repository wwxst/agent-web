# First source-backed mounted desktop message-layout audit — 2026-10-26

## Purpose / audit boundary

This round focuses on **actual running user-message and Markdown layout**,
not another standalone model or a substitute screenshot. The user-provided
original compiled Codex Windows files are inspected read-only. No source
bundles or proprietary assets are committed.

A same-version original Codex **running Windows screenshot is NOT available**
for true pixel-diff comparison, so the only precise acceptance claims here
are the recovered original CSS/JS geometry and mounted Electron computed
styles. Do not label this completed cross-app pixel parity.

## Original evidence

- `frontend/webview/assets/user-message-5f3d424c6182.css`
  - `._bubble_168sz_1`: `--user-chat-width:70%`,
    `--radius-2xl:calc(var(--spacing)*5.5)`,
    `--thread-content-margin:calc(var(--spacing)*4)`.
  - `._compactMessageBubble_168sz_15` is a distinct conditional variant:
    width `min(456px,100%)`, radius `var(--spacing)*4`, padding margin
    `var(--spacing)*3`. **Not enabled without an actual upstream mode flag**.
- `frontend/webview/assets/user-message-74653d08e16f.js`
  - Original `Rt` bubble class includes
    `max-w-(--user-chat-width) px-(--thread-content-margin)`
    and conditional `py-2.5` or `py-2` depending on `I`.
    The normal bubble uses `rounded-2xl`, compact adds its own surface.
  - The existing demo lacked these exact limits, with an unrelated
    `max-width:84%` and `padding:10px 14px; border-radius:15px`.
- `frontend/webview/assets/markdown-de681c624464.css`
  - `._MarkdownContent_yl0of_2`: heading scale
    1.75 / 1.5 / 1.25em for H1/H2/H3; H2 top margin 2rem;
    lists 1.625em indentation; list item margins .5em and bullet/number
    markers; GFM checklist explicit input spacing.
  - Blockquotes have a 24px inset and a 4px pseudo-element left rule,
    rather than a default browser border.
  - Tables are border-separated, full width, 0.875em type, with
    8px header and 10px cell block padding, deliberate separator
    borders and no bottom rule on the last tbody row.
  - Inline code is 0.875em, 1px / .3rem inset and thin inner ring;
    code-block scroll surfaces are a **separate** source component
    that this round intentionally does not replace.

## Integrated change

- Updated the canonical mounted `demo/codexDesktopShell.css` bubble to
  the normal variant's 70% max width and 16px / 10px padding, 22px
  curvature; no new second user-message renderer.
- Added semantic, stable-scoped Markdown CSS targeting `.demo-markdown`
  within existing ReactMarkdown/remark-gfm host, using source geometry
  and explicit light-theme fallbacks rather than hard-coded approximate
  typography. Keeps already recovered chatgpt-code-block copy surface.
- Playwright browser test **sends** a user Markdown message using the
  original integrated ProseMirror composer and measures computed DOM
  widths, radius, headings, list indent/marker, pseudo-element
  blockquote line, table and inline code. Captures screenshot.
- Real **Windows and Linux Electron** smoke additionally sends the
  message through the mounted UI, measures the same source contracts
  and captures screenshot. Existing tool/approval/Find tests must
  remain green.

## Deferrals, not implemented

- Current upstream user-message `isAeonFormatted` host capability
  selection for the source *compact* style is not yet mapped. Do not
  infer the compact branch solely from a Codex screenshot.
- Precise source theme variables, fonts and anti-aliasing, complex
  syntax highlighting, code-block CodeMirror, rich math and larger
  Markdown widgets remain separate.
- Original Windows running app cannot be launched from static compiled
  resources alone here. Visual screenshots captured from reconstructed
  Electron are **not** a quantitative original-app screenshot diff.
- No Agent backend or protocol/permission work in this PR.

## Checkpoint

Verify the final branch-head Linux/Windows GitHub CI before merging or
claiming passed tests. PRs remain stacked and unmerged pending approval.
