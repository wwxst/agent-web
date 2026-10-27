# 2026-10-27 — Recover original Computer Use application approval card in the connected conversation

## Compiled original resource (user-provided Windows bundle)

Main evidence:
`frontend/webview/assets/computer-use-app-approval-request-card-9bb692b1d9cc.js`
(original compiled module, 4,278 bytes). Original function `E`:
- Receives `ApprovalCard`, `conversationId`, `hostId`, `request`,
  `requestId` and `onRequestSettled` from the host. Uses
  `JSON.stringify([hostId,conversationId,requestId])` as the
  pending/in-flight request key.
- In contrast with the generic MCP `ye` approval, title is
  **Allow ChatGPT to use {appDisplayName}?** and primary button is
  **Allow this conversation**. Primary response is
  `accept` with `persist:"session"` only when allowed by
  `request.persistModes`; otherwise it is unscoped accept.
- Optional **Always allow** appears as a leading footer action
  only when `persistModes` includes `always`. **Deny** sends
  `decline` without persistence. No generic MCP parameter
  list, quoted tool-title decoration or split-button menu.
- First use app approval renders an explanation that Computer Use
  can use local apps and capture screenshots, that users choose apps
  and stop actions, and can control training use. This explanation
  precedes `request.subtitle` separated by a blank line.
  Original preference `has-approved-computer-use-app` is read from
  a host preference; its state is not inferred from the UI.
- `request.riskLevel==="high"` replaces the normal Computer Use
  icon + connector header with Elevated Risk warning; otherwise
  original uses `computer-use-plugin-icon-5eae5ff78888.png`.
- Original sends the response via
  `replyWithMcpServerElicitationResponse(conversationId,requestId,...)`
  from the selected host, locks duplicate clicks and resets its
  in-flight key on transport failure. It invokes host
  `onRequestSettled` on a successful IPC response.
- The compiled original marks its local first-use preference true
  eagerly on acceptance, even before IPC resolution. This independent
  frontend deliberately does **not** write such a preference until
  an authoritative Agent host confirms permission. This safer
  difference is explicit and is not claimed as behavioral parity.

The referenced Computer Use plugin PNG is **not present** in this
uploaded ZIP, so the independent card temporarily uses an explicitly
documented initials fallback and **does not claim icon pixel parity**.

## Integration in the running frontend

- New `SourceComputerUseApprovalModel` reconstructs the request,
  disclosure, scoped decision, title, and source tuple key.
- Existing `SourceApprovalCardSurface` supports a distinct
  `kind="computer-use"` with separate accessible label/status
  attributes, while preserving MCP-only selectors and all
  existing mounted MCP cards.
- New `SourceComputerUseApprovalRequestCard` shares the **actual**
  original-derived `qbd` UI and main component CSS from PR #37–39,
  not a disconnected mock view. It renders Computer Use E-specific
  content and actions and locks duplicate submissions. It labels
  successful transport responses only as **sent, awaiting host
  settlement**, not permission granted, and leaves preference unchanged
  on rejected replies.
- `ConnectedConversationMessageRenderers` mounts the card from
  explicit optional `getComputerUseApprovalRequest(item)`
  supplied by the real session host. It reuses the **same narrowly
  typed source MCP elicitation response transport** and fail-closed
  Electron preload/main IPC as previous PRs. No second Electron
  IPC channel, backend mutation, filesystem operation or other
  product architecture is introduced.
- Explicitly synthetic test entries use the **existing**
  LiveConversationSource activity timeline with first-use and
  high-risk cases. Actual independent Electron main rejects both
  accept and decline with `MCP_BACKEND_UNAVAILABLE`; browser
  fixture still rejects asynchronously. The UI never creates
  a fake grant or request settlement event.

## Tests and remaining gaps

- Core tests cover first-use/subsequent disclosure composition,
  primary-session and optional always scope, denied scope, disabled
  request and host/conversation/request key uniqueness.
- Browser tests use mounted conversation cards for first use,
  source title, screenshot disclosure, absence of a split-menu
  or Allow once, supported leading Always allow, high-risk header,
  no persistent scope for unsupported high-risk request,
  pending lock, failure/retry, screenshots and no false grant.
- Native Windows/Linux Electron regression mounts the **same
  conversation** in the real BrowserWindow, submits the primary
  reply through context-isolated preload and main IPC, observes
  explicit unavailable-backend error and verifies the disclaimer
  remains and decline also cannot grant permissions.
- Full core, browser and Windows/Linux native CI on the final
  commit is required before the PR is accepted.
- Still **not implemented**: real Agent Computer Use request
  registry and authoritative settlement, native screenshot control,
  permissions persistence, full app-specific icon (missing
  original asset), exact private Card/icon/animation parity and
  original Windows executable side-by-side pixel comparison.
- Do not merge main without explicit user authorization.
