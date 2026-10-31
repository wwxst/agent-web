# Codex navigation rail visual calibration — 2026-10-31

## Evidence

The user-supplied original Codex Windows full-window screenshot
(`reports/visual-acceptance/20261031-A-shell-empty/original-shell-empty.png`) is 1352×760, light theme, 96 DPI.

Its measured coordinates in the **A-shell-empty** scene are approximately:

| Region | Reference |
| --- | --- |
| Application menu bottom | y = 36 |
| Rail width | x = 0–52 |
| Home tile | x = 8–44, y = 52–88 (36px square) |
| More tile | y = 272–308 |
| Separator | y ≈ 315–317 |
| First pinned destination | y ≈ 325 |
| Bottom account avatar | 24px circle centered x ≈ 26, y ≈ 734 |

The provided original bundle
(`frontend/webview/assets/app-shared-dc7535e633d7.css`)
sets `--height-toolbar-sm:36px` and `--height-titlebar:calc(var(--spacing)*11)`.
The application menu is explicitly `height:var(--height-toolbar-sm)`
in `frontend/webview/assets/app-initial-e7c27dd40beb.css`.
Therefore **do not change the menu bar globally to 44px** simply because
rounded white panel corners in the screenshot appear to begin lower.

## Implementation

- Keep the actual application menu at its source 36px and the navigation rail 52px.
- Shift the **shared browser and Electron** navigation destination stack down by 12px to its screenshot-measured first-tile y≈52 position. The normal host benefits from the same source-backed geometry; this is not merely a screenshot fixture.
- Retain the verified 36px tile size, 8px gap, destination ordering, More tile, divider and pinned area. Keep all unavailable destinations disabled.
- Improve authored Home (filled) and Orbit icon outlines based on the visible captured glyphs. These are still independent SVG approximations, **not** copied proprietary icon assets.
- Replace the visual fixture's normal disconnected Account/Settings pair with a 24px static red avatar circle at the bottom of the rail. The fixture avatar is `aria-hidden` and contains **no account initials, identity or login state**.
- Outside the screenshot fixture, preserve the existing disabled Account and Settings controls. The new navigation destination spacing applies in both host and visual routes.
- Add browser assertions for home/more/divider/pinned destination placement and fixture-avatar coordinates; also assert the normal host's first tile y≈52 and its disconnected Account/Settings controls.

## Limitations

This is a single captured Windows scene; the screenshot-only rail padding and
placeholder avatar are **not** certified as original source contracts for
other themes, accounts, DPI values or window sizes. Navigation destination
selection, account settings, search and notification services still require
real host actions. A browser E2E geometry pass is not a replacement for
a new same-state native Windows Electron capture and overlay review.

No Agent CIL backend, main branch, or Electron host API changes are made.
