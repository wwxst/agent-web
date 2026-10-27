# 2026-10-26 — Original per-block streaming Lezer controller in mounted Markdown

## Evidence: uploaded original Codex Windows compiled bundle, read-only

File: frontend/webview/assets/chatgpt-code-block-d92f3a4029b6.js, original Bt and Ht:

- Bt retains code, languageSupport, parsedCode, renderState (processed code,
  highlightedSegments, pending), languageRequestId, timeout and listeners
  **per mounted code block**; React Ht creates Bt via useState and observes it
  via useSyncExternalStore.
- Lt=500 milliseconds. Bt.setInput(code, language, isStreaming) branches:
  language change or non-append input -> highlightAllCode immediately;
  append-only streaming input starting with an already processed nonempty
  prefix -> a single 500ms timeout, batching subsequent appends.
- Ht displays styled segments for a matching processed prefix and an
  **unstyled remainder** of the latest code while the parser is behind.
  A replacement that does not start with the processed code hides stale
  spans and displays only the latest raw source.
- flushStreamingHighlights reparses full latest code, then joins the
  freshly classified suffix onto the previous styled prefix when valid;
  adjacent matching classes are coalesced. If parsing fails, cap is
  exceeded, or a non-append edit occurs, fall back to a full fresh parse.
- The last subscriber cancels the timeout and invalidates the current
  language request. Stale language loads cannot overwrite newer content.
- Previous PR #28 preserved parser language aliases, Lezer class names,
  65,536-code-unit ceiling, and 10,000 token-run ceiling. This PR
  **reuses** that implementation; it does not fork another parser.

## Real integration (existing React/Electron application)

- New SourceStreamingCodeHighlight controller wraps PR #28's async
  Lezer parser with a source-grounded 500ms scheduling interface,
  prefix+raw-tail projection, stale async result guards,
  same-language append checks, language-switch/full-reparse logic
  and unmount/unsubscribe cancellation.
- Existing ConnectedConversationMessageRenderers passes
  isStreaming from the actual assistant item's completed===false state,
  not a guessed global app flag. No change to user-message collapse,
  tool activities, approvals, or backend.
- Actual demo/adapters.tsx MarkdownSourceCodeBlock now owns one controller
  with useState, subscribes through useSyncExternalStore, updates inputs
  via React useEffect and keeps the renderer type stable while streaming.
  Syntax spans remain within the SAME react-markdown <code> element;
  global shared Wrap lines, copy content and original virtual row are
  not replaced.
- A **clearly labeled local demonstration** command emits three immutable
  updates for one canonical assistant message item through the existing
  LiveConversationSource. This is test-only mock host data, not a
  fabricated claim of streaming Agent transport or backend integration.
- Deterministic core tests drive a fake clock/parser to verify coalesced
  500ms append updates, prefix+raw-tail visibility, final completion
  flush, language-change replacement, stale promises and teardown.
- Browser and real Linux/Windows Electron tests use the actual mounted
  demo tool entry to update a single assistant turn with a TS code fence,
  verify the final Lezer syntax span DOM/source text, wrap, no duplicate
  rows, and capture screenshots.

## Known limits

- The demo's streaming trigger is *explicitly synthetic*. Actual Agent
  host streaming event transport, token/chunk protocol and context are
  not yet wired.
- Lezer reparses full current code before trimming and merging the
  newly styled suffix. Private optimized incremental parser reuse,
  original lazy languageSupport cache, worker scheduling and exact
  private request IDs are not claimed.
- No original private CodeMirror rich editing, preview, full language
  catalogue, dark-mode theme sync or Windows original-vs-restoration
  pixel comparison.
- No proprietary compiled bundles committed to the repository.

CI status must be checked on final branch head and the PR left open;
do not merge into main without explicit approval.
