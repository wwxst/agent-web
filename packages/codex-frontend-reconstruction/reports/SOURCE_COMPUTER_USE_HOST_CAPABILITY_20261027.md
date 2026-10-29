# Computer Use approval: explicit host capability (2026-10-27)

## Original source and existing recovery

Original user-provided compiled JS:
`frontend/webview/assets/computer-use-app-approval-request-card-9bb692b1d9cc.js` (`E`).
This component shares Codex's *private* `replyWithMcpServerElicitationResponse` RPC with a
generic MCP request, but has a different title, risk state, first-use disclosure
and application authorization semantics. Existing main already has the distinct
source-grounded card and typed `SourceComputerUseReplyTransport`.

## Integration fix (supersedes stale conflicting PR #53)

The independent Agent desktop host does **not** expose a verified Computer Use
authorization request registry or reply capability. Routing its card through
generic `onMcpApprovalReply` made synthetic Computer Use request buttons appear
clickable even though only ordinary MCP failures were implemented.

`ConnectedConversationMessageRenderers` now accepts a separate optional
`onComputerUseApprovalReply` capability. Without that explicit transport, the
existing `SourceComputerUseApprovalRequestCard` is read-only; no IPC is sent,
no permission is fabricated and the first-use request stays pending.
Generic Browser/Chrome and MCP actions retain their existing guarded transports.

The original app icon is referenced by compiled resource but absent from the
supplied ZIP. The fabricated `CU` fallback and styles were removed; preserve
source-confirmed connector text instead.

The PR is stacked on the already CI-green demo picker fix (#54) because test
fixture selection must not intercept the mounted transcript.

## Verification

- Existing real virtualized transcript Chromium coverage checks first-use and
  high-risk permission shapes, readonly action states, and absent success.
- Existing native Electron test now checks both request kinds with *no* backend
  authorization transport, not just a generic MCP backend rejection.
- Node/TypeScript, Linux/Chromium, and Windows Electron CI must succeed on the
  final branch HEAD before merging.

## Known unimplemented areas

Native Computer Use host transport and authoritative settlement, private approval
preference, missing icon asset, exact translation and source comparison against a
running original Windows Codex app remain outside this change. No backend edits.
