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


## Current checkpoint — 2026-10-22: history hydration and tool leaf contracts

Branch: `recovery/codex-frontend-through-connected-message-20261021`
HEAD: `c246bd04aebb7a45665c2457183de8576aadbfd8`

- Inspected the private original compiled `sites-end-resource-fa77a923096d.js` directly; its SHA-256 is pinned in the evidence audit.
- Added the LO/HO query contract and zO history projection for agentMessage, reasoning, plan, commandExecution, fileChange, imageGeneration, MCP and dynamic-tool records.
- Added typed xC/PT leaf component contracts and wired hydration before content projection in the existing connected React transcript.
- Source-only transforms remain injected. The demo command leaf is synthetic and does not run commands.
- Validation: 235/235 core tests, 4/4 demo model tests, production typecheck/build, 9/9 Chromium tests, and 34/34 source signatures passed.
- Next: recover each private transform (wo/Wa/zl/qr/Uf/Po/wl) from its owning original module and connect the real host history subscriptions; then implement/verify actual CC/RC/EC/NC/PT/IT visual leaves. Electron IPC and pixel parity remain open.


## Current checkpoint — source-derived history transforms (2026-10-22)

Validated code HEAD: `5d3efee457b4a24acc0d10e7620137449a51fbb4`
Branch: `recovery/codex-frontend-through-connected-message-20261021`

- Recovered and tested source-derived transforms for assistant content/heartbeat, reasoning summary, file-change mapping (including generated visualization-file filtering), image-generation failure payloads, Codex Apps send-action classification, MCP content/result normalization, visualization activity classification, and auto-review decline detection.
- `createSourceToolActivityHistoryDependencies(convertMcpToolCall)` supplies those recovered transforms to the zO hydration model. The special MCP-to-external-message conversion (`Uf`) still requires a host callback.
- Evidence audit: original `sites-end-resource` bundle 34/34 signatures; original `app-initial`, `app-primary`, and `app-shared` helper chunks 18/18 signatures. Their SHA-256 hashes are pinned by the audit scripts.
- CI: 253/253 core tests, 4/4 demo model tests, strict React/TypeScript build, and 9/9 Chromium tests passed.
- Next: recover `Uf` and `NO/mh` from their owning source modules, connect real `Mr(Au/Vd)` subscriptions, and implement/version-check the actual `CC/RC/EC/NC/PT/IT` leaves. Then proceed to Electron IPC, Agent backend integration, and version-matched UI comparison.
- No claim of a complete standalone Codex frontend, real command execution, real approval flow, or pixel parity.


## Current checkpoint — tool activity history subscription integration (2026-10-22)

Validated code HEAD: `5ecc8c1e4a8f7d612c3f72ace47513c49bd2c6a0`
Branch: `recovery/codex-frontend-through-connected-message-20261021`
PR: [#1](https://github.com/wwxst/agent-web/pull/1) (draft; not merged)

- Completed source-derived `Uf` external-delivery conversion for the observed Slack/Teams branches and `NO/mh` skill-definition read classifier.
- Added `ToolActivityHistorySource.ts` to connect LO's query plan and zO's hydration to host-supplied `subscribeHistoryEntity` / `subscribeAssistantMessageEntity` channels. Stale callbacks from a previous conversation/query are rejected and subscriptions are cleaned up on rebind/dispose.
- Added `ConnectedCodexToolActivityItem.tsx`, using `useSyncExternalStore` to pass the source's hydrated item into the existing activity leaf adapter.
- CI: 268/268 core tests, 4/4 demo model tests, strict React/TypeScript build, and 9/9 Chromium tests passed.
- Raw source audits: `sites-end-resource` 34/34 signatures; `app-initial`, `app-primary`, `app-shared`, and `skill-exploration-labels` 30/30 helper signatures with pinned hashes.
- Next: implement the host bridge that binds those subscription methods to the actual private Codex query provider, then restore/verify the original `CC/RC/EC/NC/PT/IT` visual leaves. After those contracts are verified, continue with Electron IPC, Agent backend integration, and matched screenshot/interaction comparisons.
- No claim of a complete standalone Codex frontend or pixel parity. The demo command leaf remains mock-only.
