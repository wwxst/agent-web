# 2026-10-25 — Floating Scroll to bottom in the mounted Codex conversation

## Original bundle evidence (uploaded `frontend.zip`, read-only)

- `frontend/webview/assets/thread-scroll-layout-96ebbe17c836.js`
  - SHA-256 `b37ac8cd50639d20d4fc9f631e2e26cc528e338c993e86fb8dd448a3cdf15159`.
  - The source `Ae` (scroll-to-bottom control) uses the canonical thread scroll
    controller. With no response spacer, its visibility is
    `controller.isScrolledFromBottom`, whose underlying `dt` update checks
    `distanceFromBottomPx > 24`. If a response spacer exists, the source uses
    `distance > spacer.getHeightPx() + 24`.
  - The button action calls `getResponseSpacer()?.scrollToBottom()` if present,
    else the controller's `scrollToBottom()`. The accessible label is
    `Scroll to bottom`.
  - `Ae` mounts the button inside a `relative h-0` anchor
    with `bottom-[calc(100%+6*var(--spacing))]`. It is rendered in the
    existing default bottom footer, not in a second transcript/scroll host.
- `frontend/webview/assets/app-initial-5851df3f6cb1.js`
  - SHA-256 `c70d95da34ba7e5962a559dbf68d0102d10b4b47b877f5d9933629bb5a1f3a10`.
  - `UYl` renders a circular 32px-wide/high button with the source states:
    `opacity-100` vs `pointer-events-none opacity-0`,
    `aria-hidden`, `tabIndex=-1` while hidden, and transition-opacity.
  - The private implementation supports optional working dots, which this
    standalone demo does **not** enable or pretend to derive from an Agent.

## Mounted code integration

- `src/components/CodexSourceScrollToBottomButton.tsx` holds only the
  source-confirmed view/interaction/accessibility behavior.
- `demo/App.tsx` mounts it in the existing `demo-composer-zone` directly
  above `CodexSourceComposerHostForm`. Visibility comes from the **existing**
  `BrowserScrollController` with a >24px no-response-spacer threshold.
- Actual transcript `onScroll`, virtualizer content `ResizeObserver`,
  conversation navigation/restoration, footer follow and reset update the same
  visibility state. A click cancels an obsolete pending viewport restoration and
  scrolls the same scroll region to bottom with the source's 260ms cubic frame animation (instant for reduced-motion).
- `demo/codexDesktopShell.css` carries source-confirmed size, absolute footer
  positioning, center alignment, border and hidden pointer/tab behavior.

No extra virtualizer, transcript copy, external data layer, or backend call
was introduced. The old explicitly mock-only jump in demo tools remains for
test convenience and is **not** used as the new public interaction.

## Real runtime acceptance

The existing `desktop/electron-smoke.test.mjs` now opens actual Electron,
navigates through the **native View menu** between source-projected threads,
returns to an earlier away-from-bottom virtual viewport, and verifies:

1. Button visibly appears at restored distance >300px and is keyboard accessible.
2. It measures exactly 32x32px, horizontally centered above Composer with
   24px spacing.
3. It is clickable and moves the real scroll container to within 24px of bottom.
4. It becomes visually hidden, `aria-hidden=true`, `tabIndex=-1`.
5. It captures actual Electron window images:
   `desktop/test-results/conversation-scroll-to-bottom-visible.png` and
   `conversation-scroll-to-bottom-hidden.png`.

Run the complete CI suite on the final branch head:
`npm run test:core`, `demo:check-model`, `demo:build`,
`demo:test:e2e`, Linux/Windows `desktop:test:smoke`.

## Explicit limitations

- No private response spacer exists in this standalone preview. That source
  branch and its working-dots decoration are not integrated; do not synthesize
  their states.
- An initial CI run showed native Chromium smooth scrolling could fail to
  reach the latest message under Linux/Xvfb despite Windows passing. We
  replaced it with the **original source's** 260ms ease-out cubic rAF behavior,
  recomputing from current virtualized scrollHeight each frame and cancelling
  on wheel/route changes. A subsequent final-head CI run must still confirm
  the fix; neither OS is assumed passing without that evidence.
- Screenshots are from the reconstructed Electron renderer; comparison against
  an identical-version original Codex Windows runtime remains outstanding.
- No real Agent model calls, security permission handling, or backend integration.
