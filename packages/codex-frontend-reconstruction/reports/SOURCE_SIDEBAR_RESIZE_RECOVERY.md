# Source left-panel resizing — 2026-10-23

## Original evidence
Pinned `frontend.zip` → `app-initial-5851df3f6cb1.js`:
- `uUa` mounts source `sbi` at the left panel edge, with `defaultSize:340`, an outside pointer hit area and `edge:'right'`.
- `tb(e,t=Infinity,n=240)` clamps finite widths to `max(240,min(e,520,t-240))`, leaving 240px for the main surface, and uses default 340 for an invalid/unset width.
- `sbi` combines `cbi` right-edge pointer deltas with `lbi` keyboard Home/End and 10px arrow steps; double-click resets to source default size. The original source also persists values through `BYt` with key `sidebar-width`, but the original cross-process preference service is not reconstructed.
- `JFu` writes a source preferred-width custom property on the root for layout. The existing shell has `--spacing-token-sidebar:clamp(240px,var(--codex-sidebar-preferred-width,275px),min(520px,calc(100vw - 320px)))`.

## Actual integration
- Added a scoped, accessible zero-width sidebar edge handle, independent from the 52px navigation rail. Keyboard arrows/Home/End, pointer capture/drag and double-click reset share a pure source-bounded clamp.
- The existing panel now receives the `--codex-sidebar-preferred-width` variable from active React UI state. Collapsing hides the handle and preserves its width across re-open. Main transcript and Composer remain the same components.
- Core tests cover clamp/keyboard rules. Chromium validates real panel width, rail width, keyboard, pointer and collapse/reopen. Existing Electron painted-window and sidebar interactions remain in regression.
- No service, filesystem, model, MCP server or Agent API is involved.

## Missing
- Original `BYt` persisted preference adapter, threshold-to-collapse behavior on resize, source drag indicator easing, responsive popover/sidebar peek variations, original theme and Windows visual parity.
- A successful browser test does not certify the source private persistence/host behavior.

## First browser regression and root-token fix

The first Chromium run failed after keyboard ArrowRight because `aria-valuenow` moved to 285 but the side panel CSS remained 275px. This was not a resizer input problem: `--spacing-token-sidebar` is computed on `:root`, so the App-scoped `--codex-sidebar-preferred-width` cannot retroactively affect its inherited value. The source `JFu/YFu` implementation writes/removes the variable directly on `document.documentElement`. We now follow that exact root-target lifecycle through `useLayoutEffect`, and the unchanged browser test still requires the actual panel width to track pointer/keyboard state.
