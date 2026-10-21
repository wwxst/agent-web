# Next reconstruction batch — rich message primitives

## Added

- `ConversationMarkdownPresentation.ts`: verified leaf helpers from the compiled Markdown chunk (does not implement the full Markdown parser).
- `InlineFileReviewModel.ts` and `InlineFileReview.tsx`: exact size guard/action semantics, compact review markup and host Diff adapter.
- `ActivityStatusPresentation.ts` and `ActivityStatusViews.tsx`: status heading fallback, risk-sensitive automatic approval notice and expanding review rows.

## Validation

- Strict TypeScript core tests and separate targeted TSX static check; see validation log.
- Native React/Electron runtime, original design system, FileDiff worker and visual regression not yet available.

## Next

1. Trace/reconstruct the Markdown presentation and real FileDiff renderer adapter contracts, then wire `ConversationMessageRenderers` into the actual running host.
2. Recover composer/editor state, attachments, send/stop; map Electron bridge and backend protocol.
3. Run a real desktop UI with screenshots and interaction regression against installed Codex; don't claim fidelity prematurely.
