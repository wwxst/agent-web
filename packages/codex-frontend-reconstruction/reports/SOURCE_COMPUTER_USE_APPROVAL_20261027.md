# 2026-10-27 — Computer Use application approval (original E) in actual conversation timeline

## Primary evidence

The user-uploaded original Windows Codex compilation includes:
`frontend/webview/assets/computer-use-app-approval-request-card-9bb692b1d9cc.js`
(4,278 bytes of compiled JavaScript).

Source function `E` receives an injected `ApprovalCard` plus
`conversationId`, `hostId`, `request`, `requestId` and
`onRequestSettled`. It is a **different request family** from generic
`mcp-request-card-e83948fa712b.js` `ye`; both call the private
`replyWithMcpServerElicitationResponse` but differ in their content.

Verified E behavior:
- Title `Allow ChatGPT to use {appDisplayName}?`.
- Original optional `computer-use-plugin-icon-5eae5ff78888.png` and
  connector name, or an **Elevated Risk** warning header for high risk.
  The PNG is referenced by the compiled JS but is **not present in the
  user-supplied ZIP**. The reconstruction does not invent or ship it.
- The global host preference `has-approved-computer-use-app` governs
  whether a first-use disclosure appears. The disclosure warns about
  app access, screenshots, permission controls and training options.
  The request subtitle follows the disclosure with a blank paragraph.
- Primary action **Allow this conversation** carries `persist:"session"`
  if and only if host request `persistModes` includes `session`.
  Optional leading **Always allow** requires `always` explicitly.
  **Deny** has no persist option.
- The pending guard is request-scoped:
  `JSON.stringify([hostId,conversationId,requestId])`. While replying,
  the card is loading; failed transport clears the guard. The original
  sets its private global preference on accept initiation. This
  reconstruction **does not claim permission approval from delivery**
  and does not mutate a private global preference without backend
  authority. Request settlement remains host-controlled.

## Integrated source-derived implementation

- `SourceComputerUseApprovalModel.ts`: typed request context, first-use
  disclosure, request key, policy-gated session/always/deny decisions,
  no filesystem/permission methods. Node model tests cover transitions.
- `SourceComputerUseApprovalRequestCard.tsx`: a distinct component
  reusing the real mounted `SourceApprovalCardSurface` (qbd) already
  recovered in PR #37; no new timeline. Uses existing KZu 24px surface,
  header/risk style, scroll body, left Always/right Deny + primary action,
  request-scoped pending/failed/submitted statuses, and host callback.
- Existing `ConnectedConversationMessageRenderers` now accepts
  `getComputerUseApprovalRequest(item)` and an **independent optional**
  `onComputerUseApprovalReply` permission capability.
  IMPORTANT: The generic MCP `onMcpApprovalReply` is **not reused
  automatically**. The original private backend RPC being shared does
  not establish that our independent Agent implementation authorizes
  app usage with the same API or request registry.
- Existing `demo/mockConversation.ts`, `demo/adapters.tsx`, and
  `demo/App.tsx` add two **clearly marked synthetic** pending Computer
  Use requests to the existing LiveConversationSource: initial use
  Visual Studio Code, and previously approved/high-risk Terminal.
  There is **no Computer Use authorization callback** in the demo host,
  therefore all approval buttons are disabled/readonly and no IPC is sent.
- New Chromium and actual Windows/Linux Electron tests inspect the
  real mounted timeline, both distinct header/disclosure states,
  primary/leading/deny buttons, policy scope omission, read-only guard,
  absence of generic MCP split menu, and screenshots.
- Preexisting MCP tool approval, shared qbd/KZu styles, virtualized
  timeline, real Electron IPC fail-closed guards remain intact.

## Honest limitations and next steps

- Private PNG icon is unavailable in the uploaded ZIP and was not
  copied or fabricated. Exact original app header asset, translated
  text, private animation, user preference storage and final
  onRequestSettled event wiring remain unverified/incomplete.
- No authenticated Computer Use backend request registry or RPC exists
  in this independent app; **no real approval succeeds**. The
  host callback remains an opt-in interface for future integration.
- The synthetic fixture is not a live Agent request or capability.
- Full original Windows executable pixel-by-pixel comparison and
  real backend request/settlement tests remain necessary.
- Validate final HEAD through core/Chromium/native Windows/Linux CI.
  Leave PR open and do not merge main without user authorization.
