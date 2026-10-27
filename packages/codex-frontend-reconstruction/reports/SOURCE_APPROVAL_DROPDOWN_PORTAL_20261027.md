# 2026-10-27 — KZu clipping and independently portaled scoped approval dropdown

## Original compiled evidence

User-uploaded `frontend.zip`:
- `frontend/webview/assets/app-initial-5851df3f6cb1.js`:
  original `function KZu` builds the approval surface classes
  `flex flex-col overflow-hidden text-default focus:outline-none` and
  `rounded-3xl border border-default bg-surface-elevated-secondary`.
- The same compiled module's `function qbd` composes
  `eQu` → `KZu` with body and footer children; its scoped approve
  uses `Mae` split button and two `wa.Item` choices via
  `dropdownContent` and `dropdownAlign:"end"`.
- The exact private `Mae/wa` positioning, portal and focus-scope
  implementation has **not** been fully recovered. In the independent
  renderer, an out-of-card React portal is a safe implementation
  to preserve both confirmed KZu clipping and visible dropdown.

## Actual repaired UI

- Prior PR #38 retained `overflow:visible` to avoid clipping the
  in-card, absolutely positioned approval scope dropdown. This differs
  from original KZu.
- Added `SourceApprovalDropdownPortal`, used **within the existing**
  `SourceMcpApprovalRequestCard` on `Approval options`, not a
  screenshot-only surface or alternate approval renderer.
- The menu is rendered through React's `createPortal` to
  `document.body`; it is outside the card's CSS overflow clipping.
  The anchor remains the existing split-button trigger, with a
  DOM id and `aria-controls` while open. The overlay is positioned
  within the viewport near the trigger, right-aligned when possible,
  choosing below or above according to available room.
- Layout reads the actual trigger and menu rectangles and updates
  in response to **captured nested scroll** and window resize.
  Menu height is constrained to available viewport space; if a
  virtualized row scrolls completely outside the viewport, dismiss
  the potentially detached approval menu.
- Existing click-outside logic accounts for both the split trigger
  and the portal node; inside menu clicks and keyboard navigation
  still work. Escape returns trigger focus, Home/End and arrow-key
  navigation from #38 remain intact; the visible dropdown's
  animation/width/color are not claimed private-design identical.
- Restore `overflow:hidden` on the existing 24px KZu-like card.
  Existing React/Electron fail-closed MCP reply path and host guards
  from PR #34 remain untouched.

## Validation

- Existing browser/Windows/Linux Electron approval tests are updated
  to query the portaled menu at document scope (not as a descendant
  of the clipped approval card).
- Dedicated browser test validates real mounted KZu computed clipping,
  portal outside the card but inside document.body, viewport-bounded
  geometry and placement relative to the split-button trigger;
  additionally checks reposition after viewport resize, Escape
  focus restoration, click-outside dismissal and absence of
  unauthorized reply submissions.
- Dedicated native Windows/Linux Electron test runs the built
  frontend with sandboxed preload in an actual BrowserWindow,
  measures the same geometry, keyboard focus and captures screenshot.
- CI required on the final PR head. Do not claim success for
  platforms that have not completed their final-head job.

## Known limits / next
- Exact private Mae popover portal, focus trap, animations,
  collision strategy and theme variables still need original
  private design-system source tracing and same-version Windows
  pixel-level screenshot comparison. Independent viewport placement
  is not claimed to be identical to private implementation.
- The user Agent backend authorization protocol is still
  inaccessible/unverified; Electron main rejects approvals
  with `MCP_BACKEND_UNAVAILABLE`. No fake permission grant.
- Do not merge the stacked PR into main without user authorization.
