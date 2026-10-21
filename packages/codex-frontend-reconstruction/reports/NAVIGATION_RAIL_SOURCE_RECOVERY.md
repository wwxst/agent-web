# Navigation Rail / Secondary Sidebar: source-first recovery checkpoint

> Scope: source-verified structure and an independently authored React/TypeScript integration. **Not** an extraction of original TSX. The actual installed Codex version associated with the user's screenshot is not fingerprinted against the archive, so pixel fidelity is not yet certified.

## Evidence (unchanged user-supplied Windows `frontend.zip`)

| Original file | Verified bundle evidence | Reconstructed contract |
| --- | --- | --- |
| `frontend/webview/assets/app-initial-5851df3f6cb1.js` (`dWc`) | Separate `<nav data-app-navigation-rail>` landmark named `App navigation`; `group/sidebar-rail`; `browser:w-13` (13 × 4px); header / scrollable direct destinations / footer; `data-sidebar-destination`; settings action; source measures rail `clientWidth` | `CodexNavigationRail.tsx` independent from the secondary project/conversation panel; source-backed landmark and row IDs; ResizeObserver width adapter; distinct top/content/footer slots |
| Same bundle (`GZc`, `QZc`) | `navigationRailEnabled` controls whether `directDestinationIds` and `moreDestinationIds` are rendered in sidebar navigation. The rail already owns the direct destinations. | `NavigationRailModel.ts` explicitly projects the provided IDs to rail **or** sidebar, de-duplicates and drops unknown IDs. Project/thread sections are preserved. |
| Same bundle (app-shell JSX) | Shell writes `--app-shell-navigation-rail-width` from current measured width; `data-app-shell-feature-navigation`, `data-app-shell-sidebar-open` | Demo shell keeps its measured CSS variable and state attributes, retaining Rail when content panel is closed. |
| `frontend/webview/assets/app-shared-dc7535e633d7.css` | `--spacing-token-sidebar:clamp(240px, var(--codex-sidebar-preferred-width,275px), min(520px, calc(100vw - 320px)))` | The secondary panel width remains independent of browser Rail's ~52px; previous 56px mini-panel is removed from the rail-enabled branch. |

The SHA-256 hashes are pinned in `scripts/audit-navigation-rail-evidence.mjs`, which verifies **19** signatures from the two source files. This is a reproducible text-and-hash evidence check, **not** an API/UX parity check.

```sh
node scripts/audit-navigation-rail-evidence.mjs /private/frontend/webview/assets/app-initial-5851df3f6cb1.js /private/frontend/webview/assets/app-shared-dc7535e633d7.css
```

Do not commit either private compiled file to the public repository.

## Actual code changes

- Added `src/conversation/NavigationRailModel.ts` and 4 Node tests. `navigationRailEnabled=true` moves source-resolved direct destination IDs to the rail, without duplicating them in the navigation part of the content panel; the disabled branch renders them in the sidebar navigation instead.
- Added reusable `src/components/CodexNavigationRail.tsx` and isolated CSS with a real `<nav>`, destination data IDs, accessible names, current-state markers, scrolling area and bottom slot. Mounting and width reporting are wired in the existing browser preview.
- The sidebar's **conversation list remains real demo state**. Closing it leaves the rail visible and expands the transcript; opening restores it. Rail "Home" returns to the sample home conversation. Inert destinations are disabled (not fake route transitions); the exact Codex icons and product-specific routes are not recovered.
- Added Chromium regression tests: 52px rail from the browser-specific CSS rule; independent panel width; no duplicate nav section; preserved rail across panel collapse; active state; disabled unavailable destinations; existing sending, row virtualization, and switching.

## Remaining work / explicit boundary

- `dWc`'s real account-dependent navigation, reordering with drag-and-drop, customize/pin actions, unread states, onReselect / contextual sidebar peek and original icon assets remain unimplemented host interfaces.
- The original Shell uses several conditional branches for window type, responsive page surface, rail width and preview state. This checkpoint verifies **one browser rail-enabled variant**, not the full native Electron/window-state matrix.
- The sidebar's project tree, search and conversation organization still come from `demo/App.tsx` and synthetic data. They are not original private sidebar components, nor are `Scheduled`, `Library` or `Skills` working application routes.
- Color/theme, exact toolbar, Composer controller, activity timeline and Electron bridge are separate unresolved fidelity work. No screenshot-only dimensions are marked as source recovered.

## Verification

- `npm run test:core` → 144/144 local core tests pass (baseline 140 + 4 rail projection tests).
- `npm run demo:check-model` → 4/4 local synthetic host tests pass.
- Chromium / Vite / TypeScript type checks must pass in npm-enabled GitHub Actions before describing browser integration as verified.
