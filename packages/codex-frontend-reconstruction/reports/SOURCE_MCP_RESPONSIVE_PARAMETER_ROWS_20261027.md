# 2026-10-27 — Original MCP approval parameter rows: responsive definition list and durable disclosure state

## Source evidence — user-supplied original compiled Windows Codex

Original compiled resource: `frontend/webview/assets/mcp-request-card-e83948fa712b.js`.
- `we` owns three independent state values: overall collapse `a`,
  show all entries `s`, and **a per-entry state dictionary** `u`.
  It supplies each `Ee` entry with `isExpanded: u[entry.name + ":" + index] === true`
  and a toggle that updates this dictionary. Clicking Show fewer items
  removes the extra `Ee` children but **does not delete the dictionary**.
  Clicking Show more restores the extra rows with the old disclosure state.
- `Ee` wraps every parameter in `V`, which is imported as `mn`
  from `app-initial-5851df3f6cb1.js`.
- That imported `mn` resolves to `Ibd`. It renders a
  `<dl class="@container"><Mbd label=...>...</Mbd></dl>`.
  `Mbd` itself creates a row with a `<dt>` and `<dd>`, using an
  initial single-column grid and a `@container (min-width:24rem)`
  **120px label column + minmax(0,1fr) value column**. The label
  uses secondary/codex-description text and row line height 20px.
- The earlier reconstruction used a fixed `grid-template-columns:
  minmax(95px,24%) minmax(0,1fr)`, with no container query,
  and placed name/value in `span/div` instead of `dl/dt/dd`.
  `Param` also owned a local `useState(false)`, which lost expansion
  whenever extra rows were hidden or the group was collapsed.

## Integrated implementation
- Existing `SourceMcpApprovalRequestCard` now owns one expansion
  dictionary keyed exactly by `name:index`, reset only when the
  request ID changes. `Param` is controlled and no longer owns
  the disclosure state.
- The existing row is now a semantic `<dl>` containing the original
  grid row with `<dt>` (label) and `<dd>` (value and expand button).
  CSS uses a container query at 24rem, switching from one stacked
  column to the source 120px label + flexible value layout. Existing
  exact 4-line text/12-line JSON clamps and unrestricted expansion
  remain unchanged.
- No new activity timeline, backend request, approval handler,
  Electron IPC channel or separate parameter renderer.
- Existing demo fixture's 5th parameter has 18 lines, making
  expansion persistence observable. Browser and native Windows/Linux
  Electron tests drive the **same mounted** real conversation card:
  widths 320px and 520px, computed grid and dt/dd coordinates;
  then Show 2 more -> Expand description -> Show fewer -> Show 2
  more. They require `aria-expanded=true` and full line 18 after
  remount, and ensure the request remains `idle`.

## Explicit limitations
- Only the original `Ibd/Mbd` element hierarchy, responsive breakpoint,
  key and disclosure lifecycle are restored. Private design-system
  class/timing and original Windows binary pixel comparison are not
  claimed. The original `Ibd` also has a special URL-linkifier for
  **direct string children**; source MCP `Ee` supplies a `De` React
  element, not a string, so this linkifier is not transplanted to
  MCP tool argument values without evidence.
- The independent Electron MCP approval response remains fail-closed
  until the actual Agent backend protocol/authority is verified.
- Final-head Chromium, Windows and Linux CI must all be green before
  acceptance. Keep PR stacked and open; do not merge main.
