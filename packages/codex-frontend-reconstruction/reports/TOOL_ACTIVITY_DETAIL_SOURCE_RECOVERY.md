# fk / LO / HO / zO / SO / xC / PT tool-detail recovery

## Original compiled source evidence

- Main tool-dispatch chunk: `frontend/webview/assets/sites-end-resource-fa77a923096d.js`
  - SHA-256: `a84b2e2181125a3e4d2bc9be458bad4fb36df615243c7f3cc23e076bd4094708`
- Helper chunks used to recover source transforms:
  - `app-initial-5851df3f6cb1.js`: `c70d95da34ba7e5962a559dbf68d0102d10b4b47b877f5d9933629bb5a1f3a10`
  - `app-primary-fe8a450b3b04.js`: `2a05e25229bd7a38c12c55d90f82fb07087e80b4e16070116b215484498478f2`
  - `app-shared-bbfeca5e5737.js`: `a6579611db8acf9c9908e2a29e70a88687eaa1d8f8dbcdc258de58f286051e9d`

These are translations of the user-provided compiled bundles, not the original authored React/TypeScript source.

## Recovered in this stage

- `LO/HO`: query-bypass rules and canonical item-ID priority.
- `zO`: history entity projection for agentMessage, reasoning, plan, commandExecution, fileChange, imageGeneration, mcpToolCall and dynamicToolCall.
- `Lpn/Cpn/Spn` (`wo`): assistant body normalization, skip-completion marker, padded CDATA, memory citation trimming, external-tool wrappers, heartbeat output, placeholder state and artifact-scan text.
- `O0n` (`Wa`): reasoning-summary formatting.
- `umn` + `WMe` (`zl`): add/delete/update change mapping, move path and exclusion of generated Codex visualization HTML.
- `O$n/j$n` (`qr`): validated image-generation usage-limit failure extraction.
- `rhn` (`Po`): exact Codex Apps send-message/send-voice-memo classification.
- `nS/amn/mmn` (`wl`): MCP protocol/tool error and result formatting, content variant normalization.
- `rmn` (`cc`) and `oit` (`Gf`): visualization activity kind and auto-review-declined predicate.
- `xC/PT`: typed host contracts for read/search/list-files/command and patch leaf props. Real visual components remain host-supplied.

## Remaining host-owned source dependencies

- `Uf` / `ihn` / `Ihn` / `Fhn`: the observed external-delivery conversion branches are reconstructed in `ToolActivityExternalMessageConversion.ts`. Only accepted Slack receipts and schema-valid outgoing Slack/Teams records are surfaced; unknown variants are not fabricated.
- `NO/mh`: skill-definition read detection is reconstructed from `skill-exploration-labels` plus the app-initial path parser.
- Live `Mr(Au/Vd)` query providers and resolved host entities remain host-owned. `ToolActivityHistorySource.ts` defines the subscription contract and lifecycle, but it is not yet bound to Codex's private query runtime.
- Original visual components `RC/EC/NC/CC/PT/IT`, complete FileDiff, MCP/approval leaves and the design-system runtime.
- Electron IPC, real command execution, approval write-back and pixel-level comparison against a version-matched Codex installation.

## Verification

At validated code HEAD `d088fdb2387272c0a2de722e0b7075b9c37abc1e`:

- Core tests: 268/268 passed.
- Demo model integration: 4/4 passed.
- React/TypeScript production build: passed.
- Chromium browser tests: 9/9 passed.
- Main compiled bundle audit: 34/34 signatures and SHA-256 passed.
- Helper and skill parser audit: 30/30 signatures and SHA-256 passed across app-initial, app-primary, app-shared, and skill-exploration-labels.

Run the source audits using the original raw assets extracted from the user-provided `frontend.zip`:

```bash
node scripts/audit-tool-detail-evidence.mjs /path/to/sites-end-resource-fa77a923096d.js
node scripts/audit-tool-history-transforms-evidence.mjs /path/to/app-initial-5851df3f6cb1.js /path/to/app-primary-fe8a450b3b04.js /path/to/app-shared-bbfeca5e5737.js /path/to/skill-exploration-labels-dbc7ec897dab.js
```

These checks validate source signatures and reconstructed model behavior, not full Codex UI fidelity. The history subscription store and connected item renderer are integration contracts; actual Codex query providers, proprietary leaf components and Electron IPC are still not connected.
