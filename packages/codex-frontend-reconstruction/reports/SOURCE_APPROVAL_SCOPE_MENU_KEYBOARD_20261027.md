# 2026-10-27 — Original approval surface palette and scoped-menu keyboard navigation

## Original compiled evidence (user-supplied Windows Codex frontend.zip)

- `frontend/webview/assets/app-initial-5851df3f6cb1.js`
  contains `KZu` as the real core material used by `eQu` in its
  normal independent approval case. For variant=approval and not
  embedded, its computed class list includes
  `flex flex-col overflow-hidden text-default focus:outline-none`,
  `rounded-3xl border border-default bg-surface-elevated-secondary`.
- The shared `qbd` (also in this module) renders a source `Mae`
  scoped split button and two `wa.Item` menu entries: Allow once
  and Allow this conversation. The previous React approximation
  supported clicking, initial keyboard focus and Escape, but lacked
  menu-style ArrowUp/ArrowDown/Home/End roving focus and wrap-around.
- `qbd` wraps hotkeys through `Wbd`, but actual bindings come from
  private keyboard-map `approval.approve` and `approval.decline`.
  This reconstruction deliberately **does not invent those keybinds**
  or register unverified global approval shortcuts.
- The original `KZu` material is `overflow-hidden`; our dropdown
  remains rendered within the card and positioned above the footer.
  We **do not apply overflow-hidden yet**, since doing so without
  faithfully portaling the original dropdown would clip/hide the menu.
  Rounded corner and elevated-secondary variant classes are reflected
  through token-backed CSS; exact private theme values are not claimed.

## Integrated change

- Updated the **existing** mounted `SourceMcpApprovalRequestCard`
  with a narrow `nextSourceApprovalMenuIndex` keyboard helper.
  ArrowDown and ArrowUp on the split dropdown trigger open the menu
  with first/last item focused, respectively. Inside the menu:
  ArrowDown/ArrowUp wrap, Home/End go to first/last, Escape closes
  and restores focus. Tab dismisses the popover without trapping
  keyboard users. Opening/dismissing and navigating never send an
  approval response. Starting a reply also closes the popover.
- Updated `sourceMcpApprovalRequestCard.css` to original `KZu`
  `rounded-3xl` (24px) with border-default / elevated-secondary
  theme variables and local independent fallbacks. Kept existing
  scrollable body and original qbd split footer from PR #37.
- Core model tests cover navigation, wrap, invalid/empty counts.
  Browser and native Windows/Linux Electron tests mount the same
  canonical conversation approval request, operate the real menu
  by keyboard, verify DOM activeElement, Escape restoration, phase
  remaining idle/no permission submission, card radius, screenshots.
- Existing fail-closed Electron MCP IPC and Agent backend boundaries
  remain unchanged.

## Remaining limits

- This is **source-informed semantic and style-token recovery**, not
  exact private Mae/wa dropdown component or pixel parity with an
  original executable. The Radix-like original dropdown has additional
  internals (focus scope, motion, portal, tooltips, typeahead), which
  require deeper source tracing before they can be claimed.
- No backend approval transport, durable permission grant, or actual
  Codex Windows executable comparison. All prior UI and native
  regressions must stay green at final-head CI.
- Leave this branch/PR stacked and open; no main merge without user
  direction.
