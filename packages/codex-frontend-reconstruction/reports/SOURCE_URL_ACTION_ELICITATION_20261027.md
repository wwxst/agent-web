# 2026-10-27 — Source URL-action two-step compact request and native HTTPS opener

## Direct original Windows source evidence
- mcp-server-elicitation-request-panel-7318114289f7.js at selects kind urlAction and dispatches to dt.
- mcp-plugin-logo-807452fde2d3.js dt renders ct, a distinct compact request form (not qbd). It shows Action required, the message and URL row. Primary starts as Open link and becomes Continue after external opening; only Continue sends accept. Not now sends decline. Optional onOpenInThread replaces external opening and does not reply.
- Original ct wraps a 40px icon, description and right-aligned buttons in a flex form with 12px padding. Exact private icon, hotkeys and design system remain unrecovered.

## Actual integrated source-reconstruction changes
- Typed SourceUrlActionRequestModel and explicit urlAction host projection, never inferred from generic hyperlinks or markdown.
- SourceCompactElicitationCard and SourceUrlActionRequestCard mount through the existing ConnectedConversationMessageRenderers and canonical LiveConversationSource. No parallel transcript.
- The frontend treats the opener resolving as an OPEN result only, not an Agent grant or accepted response. Continue sends accept using the existing host-scoped fail-closed MCP reply transport; Not now sends decline. Failure is shown with retry.
- Independent Electron main/preload introduce a narrowly typed agent-web:open-external-url IPC. Only the trusted main frame can open external HTTPS URLs, with length, protocol, hostname, credential and control-character guards. No raw Electron shell, Node, general IPC or arbitrary file URLs are exposed.
- The same guard is used for normal window.open handler. The browser-only fixture truthfully disables Open link; the Electron fixture uses a real native opener, but automated tests never actually open a website.
- New core, Chromium and native IPC tests cover origin validation and mounted request. Updated Windows/Linux test command to include native URL opener tests.

## Safety correction inherited from PR #41
The Browser global approval response contains an additional field browser_use_persistent_approval_scope. Before this batch, the custom preload copied only known keys and silently discarded this field, potentially down-scoping global to a per-site grant. PR #41 now rejects unknown keys before forwarding; this branch merges that fix. Main process continues rejecting unknown reply extensions, and no real Agent approval transport is connected.

## Remaining limitations
The real backend pending request registry, original browser navigation bridge, event telemetry, native authorization settlement, exact private icons/motion and full Windows Codex pixel parity are NOT implemented. Synthetic URL action test data must not be presented as a live Agent authorization. Verify final head on Linux/Windows Electron and Chromium CI; do not merge main without approval.
