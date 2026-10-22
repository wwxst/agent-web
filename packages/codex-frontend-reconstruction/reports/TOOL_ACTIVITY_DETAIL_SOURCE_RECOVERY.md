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

- `Uf`: specialized MCP-to-external-message conversion, including external-delivery parsing. It remains a required callback to `createSourceToolActivityHistoryDependencies`.
- `NO/mh`: meaningful-read predicate used to decide whether an exploratory command row should be shown.
- Live `Mr(Au/Vd)` history subscriptions and their resolved host entities.
- Original visual components `RC/EC/NC/CC/PT/IT`, complete FileDiff, MCP/approval leaves and the design-system runtime.
- Electron IPC, real command execution, approval write-back and pixel-level comparison against a version-matched Codex installation.

## Verification

At validated code HEAD `5d3efee457b4a24acc0d10e7620137449a51fbb4`:

- Core tests: 253/253 passed.
- Demo model integration: 4/4 passed.
- React/TypeScript production build: passed.
- Chromium browser tests: 9/9 passed.
- Main compiled bundle audit: 34/34 signatures and SHA-256 passed.
- Helper chunk audit: 18/18 signatures and SHA-256 passed.

Run the source audits using the original raw assets extracted from the user-provided `frontend.zip`:

```bash
node scripts/audit-tool-detail-evidence.mjs /path/to/sites-end-resource-fa77a923096d.js
node scripts/audit-tool-history-transforms-evidence.mjs /path/to/app-initial-5851df3f6cb1.js /path/to/app-primary-fe8a450b3b04.js /path/to/app-shared-bbfeca5e5737.js
```

These checks validate source signatures and reconstructed model behavior, not full Codex UI fidelity.
