# 2026-10-27 — Mount host-originated generic and mcpToolCall approvals (original be/ye)

## Verified original source
- Uploaded `frontend/webview/assets/mcp-server-elicitation-request-panel-7318114289f7.js`: `_t` selects pending request by host/scene requestId; `ft` first tries special Browser site access; `at` dispatches `generic` and `mcpToolCall` to `Me` instead of rendering a generic activity placeholder.
- Uploaded `frontend/webview/assets/mcp-request-card-e83948fa712b.js`: `be` selects generic fields (`message`, `serverName`, `metadata`, `persist`, `toolParams`, `toolParamsDisplay`, `riskLevel`, `subtitle`) and MCP tool-call fields (`approval.connector_id`, `approval.connector_name`, `approval.tool_params`, `approval.persist`); `ye` displays the shared approval surface, risk state, persisted approval choices and parameter presentation; `ke` removes duplicate reason and handles boilerplate; `Se` formats the source tool-name title; `Ce` FALLS BACK from absent `toolParamsDisplay` to `toolParams` instead of hiding parameters.

## Implemented integration
- `SourceHostMcpApprovalProjection` is a strict source-envelope mapper from host-provided `generic`/`mcpToolCall` pending records to already reconstructed `SourceMcpApprovalRequest`. The caller must supply the verified `[hostId,threadId,requestId]` identity through the existing event bridge.
- `demo/adapters.tsx`: when the existing canonical conversation item is backed by a live pending host record, `getMcpApprovalRequest` now projects the record. The existing `ConnectedConversationMessageRenderers`, `SourceMcpApprovalRequestCard`, `SourceApprovalCardSurface`, virtualized timeline and Electron fail-closed reply transport are reused: no new approval UI tree.
- The MCP card React key now includes hostId, conversationId and requestId; reusing a requestId in another session cannot reuse local approval form state.
- Strictly source-fed persistence scopes, elevated risk, tool argument values and display overrides. Invalid/unknown scope or unsupported `browserEmailOtp`/custom `approvalPresentation` stays a read-only pending host item. No private connector metadata is guessed; connector display name falls back to the source connector name.
- Host reply transport still rejects with `MCP_BACKEND_UNAVAILABLE` and cannot delete/settle a pending item. Only the existing authoritative `elicitation-settled` event does.

## Tests added
- `tests/source-host-mcp-approval-projection.test.mjs`: exact source presentation, metadata reason, source fallback parameter mapping, header source connector, persistence restrictions, no guessed approval for special schemas.
- `desktop/electron-host-mcp-approval.test.mjs`: native Electron main-process host event => preload => existing React transcript => original card; verifies details, risk, `Always allow`, no scope escalation, actual main-process Deny IPC backend-unavailable and request retention until host settlement, plus specialized readonly downgrade.
- Added real native suite to existing `desktop:test:smoke` on Windows and Linux. GitHub Actions needs final-head success before declaring regression green.

## Remaining gaps
True authenticated Agent protocol, source host connector lookup, private browser OTP flow and custom presentations, backend reply settlement, original text/icon translation and pixel-level Windows Codex comparison remain unimplemented. The Electron native test injects host-originated **test** payloads; there is not yet a live Agent producer. Keep stacked PR in draft and do not merge `main`.
