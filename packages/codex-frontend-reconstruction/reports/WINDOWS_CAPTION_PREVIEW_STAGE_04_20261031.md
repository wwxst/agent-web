# Windows titlebar caption preview — screenshot pass (2026-10-31)

## Evidence and scope

The supplied original Windows `A-shell-empty` screenshot (1352×760, light, 96 DPI) shows a **36px** top menu and three native caption areas at the right edge, each approximately 46px wide. The first area is lightly grey in the captured reference.

The original compiled Electron main from the user's `frontend.zip` uses `titleBarStyle:"hidden"` and `titleBarOverlay` on Windows. The reconstruction already restores those real native window controls in `desktop/main.cjs` using `desktop/windowChrome.cjs`. Its Electron CSS hides any browser-only caption illustration. Therefore this pass intentionally **does not** replace the real Windows caption overlay or add renderer IPC commands for minimize/maximize/close.

## Change

- Replace the browser preview's ambiguous textual `─　□　×` with three precisely dimensioned **decorative** SVG slots (46px × 36px each) aligned to the right edge.
- The opt-in `?visualScenario=shell-empty` route uses the observed grey minimize-slot surface as a reference-only captured state.
- All illustration slots remain inside an `aria-hidden="true"` container with `pointer-events:none`. No interactive controls are faked.
- Native Electron keeps its real `titleBarOverlay`; CSS continues to hide the entire decorative group.
- Browser Playwright verifies all three slots, right-edge geometry, caption height and captured grey surface.
- Native Electron smoke verifies the hidden group is structurally decorative and contains no clickable fake action.

## Limitations

This screenshot-specific hover/highlight color is not a universal Windows native caption-state guarantee, and browser preview cannot reproduce native hover/press/accessibility behavior. Only a new same-state real Windows capture can validate the native frame visually. No backend, main-process or agent-cil changes.

This change is stacked on PR #93 rather than creating an incompatible alternate navigation rail.
