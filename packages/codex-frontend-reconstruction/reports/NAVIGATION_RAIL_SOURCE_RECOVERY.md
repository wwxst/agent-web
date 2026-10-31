# Navigation Rail / Secondary Sidebar: source-first recovery checkpoint

> Scope: source-verified structure and an independently authored React/TypeScript integration. **Not** an extraction of original TSX. The actual installed Codex version associated with the user's screenshot is not fingerprinted against the archive, so pixel fidelity is not yet certified.

## Evidence (unchanged user-supplied Windows `frontend.zip`)

| Original file | Verified bundle evidence | Reconstructed contract |
| --- | --- | --- |
| `frontend/webview/assets/app-initial-5851df3f6cb1.js` (`dWc`) | Separate `<nav data-app-navigation-rail>` landmark named `App navigation`; `group/sidebar-rail`; `browser:w-13` (13 × 4px); header / scrollable direct destinations / footer; `data-sidebar-destination`; settings action; source measures rail `clientWidth` | `CodexNavigationRail.tsx` independent from the secondary project/conversation panel; source-backed landmark and row IDs; an independent non-interactive divider (rather than a border that would shrink `clientWidth`); ResizeObserver width adapter; distinct top/content/footer slots |
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


## Follow-up: source rail stack geometry and destination grouping — 2026-10-31

A second pass inspected the complete `dWc` / `gV` / `fUc` / `TUc` call chain in the supplied `app-initial-5851df3f6cb1.js` and the spacing utilities in `app-shared-dc7535e633d7.css`.

Verified source details:

- `dWc` root rail uses `browser:w-13` (52px), `browser:gap-0`, `browser:px-0`, `browser:pt-0`, and `pb-2`.
- Its scroll stack uses `browser:mt-2`, `browser:px-row-x`, `browser:pt-0`, and retains the base 2px bottom padding.
- `gV(itemSpacing="rail")` resolves to `gap-2 browser:gap-px`; browser gap is exactly 1px.
- The source `dWc` child order is Home, primary destinations, the `customize` destination, the `renderExploreMenu` slot and its horizontal divider, direct destinations, then the footer/settings action. When no custom Explore renderer is supplied, `TUc` is the fallback Explore menu item.
- The source destination control is a uniform `size="xl"` ghost button. The reconstruction retains its existing 36px control size; exact icon asset/size fingerprinting remains separate.

Implementation in this follow-up:

- Remove the reconstruction's extra 2px top rail padding.
- Move the scroll stack down by the source 8px margin.
- Match 8px horizontal inset, 1px browser row gap and 2px stack bottom padding.
- Split the rail API into Home, primary destinations, customize, Explore, direct destinations and footer slots.
- Match the source order: Home → Images / Scheduled / Library → Plugins → Explore → divider → Activity / Skills → Settings.
- Keep unsupported destination actions disabled; only Home uses the existing real demo/home handler.
- Add Playwright assertions for stack offset, row gap, 36px item width, 8px rail inset, the complete destination group order, divider placement and footer bottom inset.

The Images/Plugins/Activity/Skills icon glyphs are independently authored approximations, not extracted original Codex assets. Explore, Plugins, Settings and all non-Home destination actions remain disabled because this independent host does not yet implement the corresponding account-backed routes and commands. This is a structural/geometry reconstruction, not a claim of full navigation feature parity.

Verification is pending the updated PR's browser and Windows Electron CI.


### Native Electron spacing variant

The earlier geometry pass had applied the browser-specific `gap-px` / zero-top-padding values to both hosts. That was not correct for the Windows acceptance target: the compiled class list uses base utilities for Electron and `browser:` overrides only for the browser window type.

The rail stylesheet now preserves both source variants:

- **Native Electron base:** rail `gap-2`, `px-2 pt-2 pb-2`; scroll stack `m-0.5`, `pt-0.5`, `px-row-x`, `pb-2`, and `gap-2`; divider has no extra margin beyond the parent stack gap.
- **Browser preview override:** rail `gap-0 px-0 pt-0`; scroll stack `m-0 mt-2 pt-0`, `gap-px`, and the browser divider margin.

The Windows Electron default-home test now measures the native computed styles and geometry directly (52px rail, 8px native row rhythm, native top/side/bottom insets, divider placement and Settings footer inset). The browser Playwright test continues to assert its separate 1px / 8px browser variant.

This distinction matters because the reference acceptance image is a native Windows Codex window; a browser-only 1px rhythm is not an acceptable substitute for the native rail.
