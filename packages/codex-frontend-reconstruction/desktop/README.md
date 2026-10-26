# Independent Electron shell — source boundaries

The user-supplied Codex Windows `frontend.zip` contains a genuine Electron
`frontend/.vite/build/preload.js` (SHA-256
`a3e622f8d80a83e58fb3cfcc640fa7e14e6461cccdae9ef7d7b0c821dde256b7`).
Its original `electronBridge` uses `codex_desktop:message-from-view`,
`codex_desktop:message-for-view`, worker channel IDs, theme, drag/drop and more.
**This independent shell does not claim compatibility with that private IPC.**

## Development (Node.js 22+)

From `packages/codex-frontend-reconstruction`:

```sh
npm install
npm run desktop:dev
```

`desktop:dev` starts Vite at 127.0.0.1 and Electron with `AGENT_WEB_DEV_URL`
set. For a standalone built UI (without Vite development server):

```sh
npm run demo:build
npm run desktop:start
```

On an installed desktop environment the latter opens `demo-dist/index.html`
via `file://`, with relative Vite asset paths. This is an **independently
running desktop renderer** using synthetic demo data, not a Codex connection.

The preload exposes only `window.agentWebDesktopHost.getHostInfo()` and
`subscribeHostEvents(listener)`; the adapter bridges incoming frontend
`SourceConversationHostEvent` values into the *same* connected React stores
used by browser demo tests. There is no arbitrary renderer-to-main IPC, no
command execution, and no read/write backend.

## Security / verification

- `nodeIntegration:false`, `contextIsolation:true`, `sandbox:true`
- navigation limited to the loaded local file or explicit localhost dev origin
- no automatic opening of new windows; HTTPS links open externally
- no insecure content
- live Electron smoke uses Playwright's Electron driver with Xvfb on Linux,
  verifying local file startup, preload isolation, React conversation UI,
  and a host event delivered from main process to the actual renderer

```sh
npm run desktop:test:smoke
```

Linux CI wraps this in `xvfb-run -a`. This smoke is not pixel-parity validation
against the private original binary, nor a working Agent transport. Before
production packaging the host event **schema**, Electron app identity,
permissions, persistence, update/security policy, offline handling and real
Agent binding all need independent decisions and validation.


## MCP reply IPC boundary (2026-10-26)

The original compiled `mcp-request-card-e83948fa712b.js` calls
`replyWithMcpServerElicitationResponse(conversationId, requestId, response)`
on the host selected by `hostId`. **That private channel is not reused.**

The independent shell now exposes exactly one bounded renderer API:
`agentWebDesktopHost.replyToMcpApproval({hostId,conversationId,requestId,response})`.
It travels over one fixed `agent-web:mcp-approval-reply` channel; Electron
main checks the trusted primary main frame and a strict request/decision
allowlist. Neither preload nor renderer exposes generic IPC, credentials,
shell execution, arbitrary tool calls or persistent grants.

**The Agent backend is not connected**, so main always rejects valid MCP
responses with `MCP_BACKEND_UNAVAILABLE`, including Deny. The mounted card
shows the failure and can retry; it never claims approval or emits a
fabricated resolved event. Browser-only fixture behavior remains explicitly
simulated and separate from native Electron IPC.

Unit tests validate malformed envelopes, scopes and frame trust.
`electron-mcp-approval-ipc.test.mjs` invokes the real context-isolated
preload from an actual Electron window to confirm the native rejection.
This is frontend/Electron transport preparation, **not end-to-end approval
integration**. Before connecting to the user's Agent backend, verify its
actual request IDs, authority and authorization protocol and require a
backend-maintained outstanding-request registry; never bridge arbitrary
renderer-provided request IDs directly into permission execution.
