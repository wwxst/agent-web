# fk / LO / SO tool-detail recovery

Source: `frontend/webview/assets/sites-end-resource-fa77a923096d.js`
SHA-256: `a84b2e2181125a3e4d2bc9be458bad4fb36df615243c7f3cc23e076bd4094708`.

Recovered:
- `HO` history item identity priority.
- `SO` command visibility, work-mode gating and tool family dispatch.
- `xC` exec variants (read/search/list_files/command), running and background-terminal states.
- `PT` patch status precedence and empty-change / visualization visibility.
- `fk` special subagent/image content override before normal tool dispatch.
- React adapter wired into existing `ConnectedConversationMessageRenderers` and Chromium coverage.

NOT recovered:
- `zO` history-state hydration/subscriptions.
- Visual `CC`, `RC`, `EC`, `NC`, `IT`, `Fh`, `xS` components.
- Source-only `NO`, `Gf`, `cc` private predicates; injected as host callbacks.
- Electron IPC and real tool execution/approvals. Browser demo leaves remain mock-only.
- Pixel comparison against the exact same version of Codex.

Evidence audit: `node scripts/audit-tool-detail-evidence.mjs <original-sites-end-resource.js>`
Tests: `npm run test:core && npm run demo:check-model && npm run demo:build && npm run demo:test:e2e`.
