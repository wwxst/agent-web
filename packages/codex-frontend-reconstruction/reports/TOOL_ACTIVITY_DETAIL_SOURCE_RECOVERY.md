# fk / LO / SO / zO tool-detail recovery

## Source evidence

Original compiled asset: `frontend/webview/assets/sites-end-resource-fa77a923096d.js`

SHA-256: `a84b2e2181125a3e4d2bc9be458bad4fb36df615243c7f3cc23e076bd4094708`.

This is analysis of the user-provided compiled bundle, not recovered author TypeScript/TSX. The original binary is kept outside the public repository.

## This increment

- `LO` query bypass contract and `HO` item-ID priority are represented by `buildToolActivityHistoryQueryPlan`.
- `zO` canonical history reconciliation covers agentMessage, reasoning, plan, commandExecution, fileChange, imageGeneration, mcpToolCall and dynamicToolCall.
- Assistant content preparation, reasoning text conversion, file-change mapping, image failure extraction, MCP conversion, MCP app classification and MCP result formatting remain explicit host adapters (`wo/Wa/zl/qr/Uf/Po/wl`); they are not guessed.
- The existing connected transcript can obtain resolved history entities from a host adapter and hydrates before selecting Markdown/review/activity content.
- `xC` read/search/list_files/command leaf contracts and `PT` patch leaf props are typed in `CodexToolActivityLeafRenderer.tsx`. Real Codex visual components remain host-owned.
- The browser demo supplies a clearly synthetic command leaf adapter and asserts the connected activity row reaches it.

## Still incomplete

- The real live subscription implementation behind `Mr(Au/Vd)` and a production host resolver are not connected. The query-plan model describes source query keys only.
- Real implementations of `wo`, `Wa`, `zl`, `qr`, `Uf`, `Po`, `wl` must be recovered from their own source modules.
- Visual leaf components `RC/EC/NC/CC/PT/IT`, the complete FileDiff engine, MCP/approval leaves and original design system are not restored; the demo renderer remains mock-only.
- Electron IPC, real command execution, real approvals and pixel-level comparison against a version-matched Codex installation remain unverified.

## Reproducible source audit and tests

```bash
node scripts/audit-tool-detail-evidence.mjs /path/to/sites-end-resource-fa77a923096d.js
npm run test:core
npm run demo:check-model
npm run demo:build
npm run demo:test:e2e
```

Passing these checks validates selected model branches and demo wiring, not full Codex UI fidelity.


## Verification at HEAD c246bd0

- Core: 235/235 passed.
- Demo data-model integration: 4/4 passed.
- React/TypeScript production build: passed.
- Chromium: 9/9 passed.
- Original compiled bundle audit: 34/34 signatures and pinned SHA-256 passed.
