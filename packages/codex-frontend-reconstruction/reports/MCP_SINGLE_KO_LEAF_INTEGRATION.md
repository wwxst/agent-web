# Single MCP KO/xa title integration — 2026-10-23

Original `sites-end-resource-fa77a923096d.js` KO passes an individual MCP invocation's completed status, result, toolDisplay and asynchronously resolved toolDefinition to `bm` (source `xa` in `mcp-tool-activity-label-220d2d98d4ad.js`). Source `SO` keeps MCP activity on the host-leaf path, separate from xC commands and PT patches.

Existing `renderCodexToolActivityLeaf` now optionally delegates `host-leaf:mcp-tool-call` to `McpToolCall`, preserving the existing host fallback for integrations with no adapter. `CodexSourceMcpToolCallLeaf` shares the already-tested `SourceMcpToolActivityLabel` resolver with repeated XO generic titles, and exposes completion/provenance for tests. Approval/result content remains an explicit host slot. The demo injects mock callbacks, and the Chromium test asserts an unfinished single MCP call uses the invoking label between two completed multi-call groups.

**Not restored:** Ph/Nc tool-definition fetch, matchingApp, original mv icons, private approvals/results layout, real ct/et implementation, Electron IPC or Agent tool execution. This is not pixel parity.
