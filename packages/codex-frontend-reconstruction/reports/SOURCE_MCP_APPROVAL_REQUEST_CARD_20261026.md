# 2026-10-26 — MCP tool approval request: mounted card and host response boundary

## Original compiled evidence (uploaded Windows Codex resources, read-only)

- frontend/webview/assets/mcp-request-card-e83948fa712b.js
  SHA256 ac70eaa5da6e842cb0b12b3c74aeaf4b243f6785212f871933ed3d0b4d98c76b.
  - Source ye constructs Approve, Deny, and optional scoped actions.
    Scope labels are conditional: only host-provided persist options
    'session' and 'always' are rendered. approveDisabled gates Approve,
    and disabled gates the full approval card.
  - A response is created from 'accept' or 'decline', with optional persist
    on accept, and delivered through the host RPC
    replyWithMcpServerElicitationResponse or an explicit onReply callback.
    Private dispatch is NOT called from the reconstruction.
  - Source handler catches transport rejection and resets its sending
    guard, enabling another interaction. We explicitly render error and
    pending states (independent UX improvements; original private pending
    card composition is not claimed).
  - Ce uses host-projected toolParamsDisplay when supplied and otherwise
    builds entries from toolParams.
  - we shows at most Q=4 entries until Show more; optional
    collapseToolParams adds Show/Hide details.
  - Ne/Ee format text and JSON: JSON compact preview max length 48;
    text expansion after >120 characters or >4 newline-delimited
    lines; per-value Expand/Collapse controls.
- frontend/webview/assets/mcp-tool-call-approval-2041ceff5519.js
  SHA256 12e3c23c1b1d3ff29ca9613b68d6fa831a76b1edf989f1cc68b25572ad1013ba:
  separate *timeline activity* disclosure, not the pending response card.
  The two are not conflated.

## Integration

- SourceMcpApprovalRequestModel: exact host-provided scopes, never infer
  persistence; strict disabled/approveDisabled checks for reply eligibility;
  source parameter preview/expansion limits. No network, files, or permission
  code in this module.
- SourceMcpApprovalRequestCard: integrated React card with source-derived
  risk label, request data, parameter preview/detail toggles, buttons,
  a submit guard, disabled controls during pending response, and visible
  failure + retry. A successful host callback means **reply delivered**
  and waits for actual host request settlement; it does not claim
  permission approved. Unconfigured transport leaves it read-only.
- ConnectedConversationMessageRenderers: optional
  getMcpApprovalRequest(item) + onMcpApprovalReply(requestId,reply)
  supply the real request and transport. No changes to approval review
  summary, file diff, or tool history behavior.
- The demo host supplies **explicit synthetic** request data and an
  asynchronously rejecting callback. The visualized error is truthful
  (no Agent authorization bridge connected); no allow operation can
  succeed in the demo. A second explicitly disabled sample can verify
  host permission gating.
- Model tests cover scope validation, disabled decisions, host display
  projection and original numeric argument preview limits.
  Chromium / real Windows & Linux Electron run the actual conversation
  and test parameter expansion, pending state, double-click prevention,
  error, retry, no fake approval success and screenshots.

## Not implemented / next
- Original private design-system Nz ApprovalCard geometry, logo and
  exact localization, native electron replyWithMcpServerElicitationResponse
  transport, permission persistence and real host request settlement.
- This is a host-bound frontend capability, not yet end-to-end Agent backend
  integration. No fake permission grant, no filesystem mutation.
- Browser/Electron behavior must pass CI on the final PR head.
- PR stays stacked on #32 and unmerged until user explicitly approves.
