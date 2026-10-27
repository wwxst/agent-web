# 2026-10-27 — Recover original qbd shared approval card shell and action layout

## Evidence from original user-supplied Codex Windows bundle

Re-read the original compiled `frontend/webview/assets/app-initial-5851df3f6cb1.js`,
specifically `qbd` (shared approval card), `iQu` (header), `eQu` (surface),
`Ibd` (definition-list reason row), and the original MCP request
`mcp-request-card-e83948fa712b.js` `ye`.

Original `qbd`:
- `<eQu data-codex-approval-surface class="@container/approval-card">`
  encloses an independently scrollable body `px-4 pt-4 pb-3`.
- Header is wrapped in `<div role="alert" aria-atomic="true">`, and
  `iQu` composes small secondary header, medium title and optional
  subordinate subtitle with original vertical gaps.
- Reason uses the existing source `Ibd` labeled **Reason**, above
  the request-specific details; this is a definition list, not an
  unlabelled paragraph.
- Footer is a form `px-4 pt-2 pb-4`; at ordinary container sizes
  **leadingAction** (Always allow) is on the left, **Deny** and
  primary **Allow once** on the right. Under
  `@max-md/approval-card` it stacks actions vertically.
- With `scopedApproveAction`, the primary becomes a **split button**:
  the primary half submits Allow once and the secondary
  `Approval options` trigger opens a menu for Allow once and
  **Allow this conversation**. The prior reconstructed MCP card
  erroneously rendered Allow for session and Always allow inline
  alongside Deny/Allow once.
- Source `ye` supplies scoped session and leading always actions
  only when `approveDisabled` is not true and the host policy
  explicitly includes the scope.

## Actual implementation

- New reusable presentation-only `SourceApprovalCardSurface` is
  mounted by the **existing** `SourceMcpApprovalRequestCard`.
  No alternate message renderer, fake host or duplicate approval model
  is created.
- The wrapper restores the semantic heading and Reason row, scroll
  body and footer form. It can be reused by future approval families;
  permission dispatch, request ID and authoritative settlement remain
  outside it.
- MCP actions now use the original normal/leading/trailing split
  and guarded scope menu with accessible `aria-haspopup="menu"`,
  Escape-close and focus restoration. Existing
  `SourceMcpApprovalReplyTransport`/Electron main fail-closed
  behavior is retained; opening a menu does not send a reply.
- Existing Chromium and Windows/Linux native MCP transport regression
  tests are updated to select **Allow this conversation** from the
  dropdown before verifying the original backend-unavailable or
  synthetic transport-rejection cases.
- New browser/native tests measure footer CSS layout at 600px and
  410px in the actual mounted review conversation; check atomic
  heading, label/description, menu options, keyboard focus, and
  screenshots. Host permissions are never granted in the fixture.

## Boundaries

- Private `KZu` approval surface styles, `s` Button primitives,
  `Mae` split-button animation/menu implementation, badge/icon
  assets, original hotkey labels and actual Codex Windows pixel
  comparison are still not recovered. Layout and semantic behavior
  are source-backed; colors/radii are an independent CSS approximation.
- No unverified Agent transport or authority is introduced; Electron
  IPC from PR #34 still rejects without an authenticated Agent backend.
- Final-head CI must pass on Chromium, Windows and Linux Electron.
  Keep stacked PR open, do not merge main without user instruction.
