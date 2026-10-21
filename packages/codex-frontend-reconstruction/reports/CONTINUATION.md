# Continuation — 2026-10-21

Current batch: `LiveConversationSource.ts` and `ConnectedLiveConversationTranscript.tsx`. A host-agnostic immutable source uses getSnapshot/subscribe and React useSyncExternalStore. Includes cross-conversation revision guard, cleanup, loading/disconnected views, and subscription tests. All 92 core tests pass. This contract is designed for adaptation: it does not assert recovery of private Codex `Df` or subscription implementation.

Next: trace and implement the actual live host event adapter and source-turn normalization; recover separate message/activity row renderers; wire real composer/bridge; test actual React mounting/Electron screenshots against Codex. No full UI or pixel-parity claim. No GitHub push performed.

## Next handoff checkpoint — message renderer dispatch

- Source evidence: compiled `local-conversation-turn-69783815d57d.js`, especially `rs` / `ls`, plus `agent-activity-item-1be092f0c744.js`.
- Added `ConversationMessageRenderPlan.ts`, `ConversationMessageBlocks.tsx`, 18 focused tests, exports and module report.
- `createConversationLiveRow(adapters)` plugs into `LiveConversationTranscript.RowComponent`; the supplied adapters must connect the actual message/tool/activity/renderers. Single-block fallback is `getDirectTranscriptBlock`.
- Latest strict core: 110 tests pass. New React TSX passes local shim typecheck. No full React/Electron integration or GitHub push by this batch.
- Next: recover actual assistant Markdown and tool/activity/diff visual primitives, with runtime integration/visual regression, then composer and Electron bridge.

## Next handoff checkpoint — rich message primitives

- Added `ConversationMarkdownPresentation.ts`, `InlineFileReviewModel.ts`, `ActivityStatusPresentation.ts`, `InlineFileReview.tsx`, `ActivityStatusViews.tsx`, tests and exports.
- Source chunks: `conversation-markdown-315af0a2573a.js`, `inline-file-diff-review-2b36b4184acf.js`, `activity-state-label-54eb9cc1c5d9.js`, `automatic-approval-review-details-d0acb2472248.js`, `mcp-tool-call-approval-2041ceff5519.js`.
- This batch reconstructs verifiable leaves and practical review UI, not the private Codex Markdown parser or full FileDiff renderer. Pending: inject real Markdown, Diff, icons, design system and tool/approval callbacks into `ConversationMessageRenderers`, then Electron-mounted parity tests.
