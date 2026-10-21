# Conversation Markdown, activity status and inline file-review primitives

**Date:** 2026-10-21

## Compiled reference inspected

This batch uses the user's extracted, formatted Codex frontend JS, in particular:

- `frontend/webview/assets/conversation-markdown-315af0a2573a.js` — leaf helpers `z`, `G`, `K`, `q`, `W`, `Q`, `Ke`, `qe`, `Ze`, `Qe`, etc.
- `frontend/webview/assets/activity-state-label-54eb9cc1c5d9.js` — status heading/state/fallback branches.
- `frontend/webview/assets/automatic-approval-review-details-d0acb2472248.js` — review row/expansion, decline message, high-risk warning.
- `frontend/webview/assets/mcp-tool-call-approval-2041ceff5519.js` — denial from `approval policy is never`.
- `frontend/webview/assets/inline-file-diff-review-2b36b4184acf.js` — 262,144-character / 5,000-line guard, compact `<del>/<ins>`, toolbar actions, wrap toggle and full diff adapter.

All new TypeScript/TSX module names are descriptive reconstruction names, not claims about original upstream source.

## Implemented

- `ConversationMarkdownPresentation.ts`: newline/HTML/details escaping, safe backtick/code fence selection, headings, exploration and activity summary, command execution status, unified-diff statistics, and file-change verbs.
- `ActivityStatusPresentation.ts`: heading/state/Thinking precedence, ICU state normalization, high-risk denied approval detection and explicit-authorization message selection, MCP `never` policy error recognition.
- `InlineFileReviewModel.ts`: exact preview limits, content mode selection and explicit action permission checks.
- `InlineFileReview.tsx`: compact file difference view using the observed Codex class names and `<del>`/`<ins>` markup; explicit host callbacks for Accept/Reject/Edit, optional host Diff implementation for full mode, and too-large fallback.
- `ActivityStatusViews.tsx`: activity heading/state/Thinking translation slot and review details/disclosure adapter with the observed CSS class structure.

## Safety and fidelity boundaries

- The actual Codex Markdown parser, custom syntax highlighting, markdown links, image previews, rich content and web components are **not** reconstructed by the leaf utility module. It is NOT a standalone renderer for arbitrary Markdown.
- The full-screen diff engine is private and requires the host `Diff` adapter. When `Diff` is unavailable, the full view renders no fake diff instead of silently presenting an inaccurate visual. The compact and too-large views remain functional.
- Actions NEVER grant permissions or mutate files themselves. The caller must pass a real `onAction`; `edit` and `accept` are disabled according to the exact file-review permission flags.
- The full review risk formatter and original icon, animation, design-system button and localization providers remain explicit dependencies. Native HTML fallbacks are accessible, but no pixel-parity claim is made.
- The approval notice is informational; it never automatically approves or denies any tool request.

## Validation scope

- Strict TypeScript core build plus the complete Node regression suite.
- Unit tests for Markdown escaping and summary behaviors, exact review size boundaries, action permission gating, activity-state normalization and authorization warnings.
- Separate TSX static check with a temporary minimal React declaration shim for the two new components; not actual React package type checking or Electron rendering.

## Next needed integration

Map the actual Codex Markdown view and FileDiff engines (`conversation-markdown-*`, `chatgpt-markdown-view-*`, `file-diff-*`) to verified host implementations, inject them into the existing `ConversationMessageRenderers`, then run a mounted React/Electron comparison. Next also restore composer and IPC bridges. Avoid rebuilding the original UI from guesses.
