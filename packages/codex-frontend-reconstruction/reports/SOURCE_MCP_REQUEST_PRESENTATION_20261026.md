# 2026-10-26 — Source MCP approval card header and parameter fidelity

## Source verification

The uploaded original Windows Codex resource
`frontend/webview/assets/mcp-request-card-e83948fa712b.js`
(SHA256 `ac70eaa5da6e842cb0b12b3c74aeaf4b243f6785212f871933ed3d0b4d98c76b`,
20,459 bytes) contains original `ye`, `be`, `Ce`, `we`, `Ee`, `De`, `ke`, `Ae`, `je`, `Me`, `Se`, `Ne`, `Pe` and `Fe`.

Concrete discrepancies found after PR #34:
1. **High-risk header**: `ye` computes `riskLevel==="high"`. Its
   `headerContent` becomes only the warning icon and translated
   `Elevated Risk` text; it **replaces**, rather than appears beside,
   ordinary connector/branding content. The prior reconstruction displayed
   both the connector and risk label in the header.
2. **MCP tool title**: `Se(message, connectorName)` applies the exact
   regular expression `^Allow\\s+(.+?)\\s+to\\s+run\\s+tool\\s+"([^"]+)"\\?$`.
   For matching titles, it produces
   `Allow {matched connectorName} to run <tool>{toolName}</tool> tool?`,
   with emphasized tool name; it does not trust the raw connector display
   name in the message. The prior reconstruction used a plain title string.
3. **Generic elicitation message**: original `ke` plus `je`/
   `Ae`/`Me` reads only a nonempty string `metadata.reason`, removes
   a duplicate trailing `Reason: …`, and promotes the reason to title
   when the remainder is the generic `Tool call needs your approval`
   boilerplate. Non-object, array or non-string metadata is ignored.
4. **Parameter truncation**: source `we` begins with `Q=4` entries,
   `Ne`/ `Pe` recognize >120-character/>4-line text and >48-char
   compact JSON. Source `De` uses `line-clamp-4` for collapsed text
   and `line-clamp-12` for collapsed JSON. Expanded content is
   `whitespace-pre-wrap` without a fixed max-height. The earlier CSS
   applied a **15rem max-height even after Expand**, hiding long values.

## Implemented on existing mounted UI

- SourceMcpApprovalRequestModel now provides source message metadata and
  quoted tool-title parsing. Source condition boundaries and malformed
  input are covered by unit tests; no permission grant is derived.
- SourceMcpApprovalRequestCard now uses the original high-risk
  **replacement** header with a local warning glyph, and renders tool
  names emphasized when the exact `Se` message pattern matches.
  Nonmatching titles remain unchanged.
- Existing parameter `Param` rows retain source 4-entry paging and
  per-value Expand/Collapse; CSS now uses text/JSON line clamps only
  while collapsed, and removes the previous height restriction on
  expanded content. Readonly/transport/action safety is unchanged.
- Existing demo host emits source-shaped synthetic messages for the
  interactive tool request and generic metadata reason for the
  read-only request. Its long argument is now 18 explicit lines so
  actual overflow/clipping can be measured. No second card, transcript
  or Agent transport is introduced.
- Chromium Playwright and native Windows/Linux Electron integration
  tests inspect the *actual mounted* MCP request in the canonical
  conversation: exclusive high-risk header, emphasized tool title,
  preview line-clamp computed CSS, visibly larger 18-line expanded
  argument, and no approval reply sent by presentation changes.
  Screenshots include preview and expanded states when available.

## Explicit limits

- Original private `Nz` ApprovalCard, `V` parameter label grid,
  `R` text primitive, brand logo, exact icon asset and interaction
  motion are not fully reconstructed. The independent warning glyph
  follows the confirmed replacement semantics, not original pixels.
- This is **UI presentation fidelity**, not end-to-end MCP permission.
  The PR #34 Electron IPC remains fail-closed when Agent backend is
  unavailable. No fake approval success, backend changes, or file writes.
- No side-by-side original Windows executable pixel validation yet.
- Final CI must pass with native Windows/Linux Electron and Chromium;
  leave the stacked PR open until explicit user approval to merge.
