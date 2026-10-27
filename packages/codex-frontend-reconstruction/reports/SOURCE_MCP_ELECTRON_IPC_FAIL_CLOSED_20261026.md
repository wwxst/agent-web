# 2026-10-26 — Real Electron IPC boundary for source MCP approval replies

## Starting point
Prior PR #33 restored original-source-inspired pending MCP card and a typed
host callback, with an in-memory demo callback that rejected after 380ms.
There was **no real renderer-to-Electron-main request route**.

The uploaded original frontend/WebView asset
`mcp-request-card-e83948fa712b.js` (SHA256
`ac70eaa5da6e842cb0b12b3c74aeaf4b243f6785212f871933ed3d0b4d98c76b`)
shows source `ye` carrying `conversationId`, `hostId`, `requestId`, and
a response into `replyWithMcpServerElicitationResponse`. Original private
Electron preload `frontend/.vite/build/preload.js` exports `electronBridge`;
it is **not** a compatible interface with our independent preload.

## Integrated implementation
- The existing `SourceMcpApprovalRequest` now includes the original
  host-scoped conversation/request identity. The same React card passes
  it through the existing injected callback. No new approval renderer.
- The real independent Electron preload exposes a single
  `replyToMcpApproval({hostId,conversationId,requestId,response})` method.
  It validates fields, projects only required keys, and invokes
  `agent-web:mcp-approval-reply`; there is no generic `send/invoke`.
- The Electron main process independently validates the **trusted renderer
  main frame**, bounded nonempty IDs, exact response decision
  `accept|decline`, and `session|always` persistence only with accept.
  Unknown fields / invalid values are rejected.
- **No verified Agent reply service is present.** Both accept and decline
  throw `MCP_BACKEND_UNAVAILABLE`, deliberately failing closed.
  The main process has no file writes, permission store, automatic grant,
  synthetic success event or backend call.
- The existing connected demo host uses this **real Electron IPC** when the
  Electron preload exists. Plain Chromium continues its explicitly
  synthetic in-memory failure test. The actual conversation card receives
  the native rejection and displays `MCP backend unavailable`, keeps the
  request and allows a retry.
- The main-process validation helper supports injecting a *verified*
  transport only in unit tests; the production main window does not inject
  one. A future real backend must independently authenticate session,
  origin and outstanding request before it can execute any decision.

## Verifications
- New direct Node tests cover host ID validation, main-frame trust checks,
  unrecognized keys, persisted decline prohibition, explicit backend
  absent failure, and an injected test-only callback.
- New native Electron test launches the built UI with sandbox,
  contextIsolation:true and nodeIntegration:false; it invokes the
  preload for invalid requests, valid scoped accept and deny and requires
  `MCP_BACKEND_UNAVAILABLE` from **real main IPC**.
- Existing native MCP conversation UI test now expects fast real
  backend-unavailable responses instead of assuming fake 380ms latency.
  Existing browser fixture still asserts visible submitting/pending,
  failure/retry and disabled actions.
- Both Windows and Linux Electron plus Chromium and core must pass on
  final PR head before claiming CI green.

## Unresolved blockers and nonclaims
- GitHub connector access to `wwxst/agent` returned 404; no real backend
  MCP authorization endpoint/protocol could be verified here. Do not
  infer API compatibility, treat the synthetic fixture as real Agent data,
  or alter the backend on this basis.
- The main process intentionally has no outstanding-request registry yet.
  Never connect this frontend-only protocol to an actual permission
  executor before adding backend-verified authoritative request identity,
  expiration, one-time settlement, policy checks, caller isolation,
  idempotency and backend event synchronization.
- Original private Codex IPC is not used. No permission success, account
  persistence, backend integration or original Windows pixel parity.

PR remains stacked on #33 and must not be merged to main without approval.
