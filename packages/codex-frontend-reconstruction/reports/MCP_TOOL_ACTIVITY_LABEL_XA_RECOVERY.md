# 2026-10-23 — source xa common MCP tool activity label precedence

Source: `frontend/webview/assets/mcp-tool-activity-label-220d2d98d4ad.js`, SHA-256 `448fe0573dd26310387c8c59b7f5245a1fef69dc95b7207c8b0d3f8a0f74971c`, `xa` exported as `t`, imported by `KO` as `bm` in `sites-end-resource-fa77a923096d.js`.

## Source branch order recovered

1. `Pt` specialized Codex Apps tool identity → `Mt` message when a specialized action is available.
2. `wa` JavaScript `js` tool title, normalized whitespace; title cutoff is 80 UTF-16 code units, longer titles use the first 79 units plus ellipsis.
3. `mt` connector matching → `gt` action message.
4. Select `toolDisplay.invoking/invoked` or validated definition `_meta['openai/toolInvocation/invoking|invoked']` by completion state. This dynamic label is allowed only when `ct` says not failed and (in progress or explicitly successful).
5. Otherwise `toolDisplay.title`, then host `et(toolDefinition)`; blank selected values do *not* trigger the next lower priority label in that same nullish chain.
6. Last fallback is browser-use / matching App / generic tool identity and optional connector-specific renderer `Ea/Ta`.

## Implementation and boundaries

`SourceMcpToolActivityLabel.ts` restores source-supported ordering, JS title handling, phase selection, metadata guard and result gate. Private `Pt/Mt/mt/gt/ct/et/Ea/Ta` callbacks stay explicitly host-owned. Missing host metadata returns no fabricated title. It is not a full port of those private parsers.

`demo/adapters.tsx` now uses the same resolver within the **already mounted** generic `XO` repeated group header. The simulated fixture supplies matching `toolDisplay.invoked` for a pair of completed MCP calls. The recognized Codex operation still takes `XO`'s separate `_m` branch. No Agent calls or host permissions are implied.

Tests cover the source precedence and phase/failure/metadata/truncation behavior, plus Chromium verification of the actual repeated MCP header. The final screenshot and CI belong to this commit separately; do not count earlier test runs as verification of this change.

## Next

- Trace and separately restore the imported `ct` failure predicate and `et` tool-definition title resolver before replacing host callbacks.
- Trace `Mt` and selected real connector action descriptors with their original schema and metadata.
- Connect the same label model to individual MCP leaves, then validate with real host events and same-build visual comparison; Electron IPC and real Agent integration remain out of scope.
