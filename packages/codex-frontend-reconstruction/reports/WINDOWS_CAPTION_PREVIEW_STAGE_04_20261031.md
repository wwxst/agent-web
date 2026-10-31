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


## Native-versus-browser rail correction (same screenshot scene)

The latest PR #93 browser artifact showed a meaningful visual regression despite
its correct source separation: the **browser-specific** `gap-px` rail variant
rendered Home/Images/... at approximately 37px cadence, while the supplied
**Windows Electron** screenshot shows approximately 44px between centers.

The screenshot fixture is still running in Chromium, so its selector must
emulate the Windows scene instead of the ordinary browser variant. This pass
scopes a `gap:8px`, first-tile y≈52 and divider y≈316 override **only** to
`?visualScenario=shell-empty` when no Electron host exists. The real Windows
Electron rail retains the PR #93 base CSS and its native smoke assertions;
ordinary browser preview retains the source `browser:gap-px` utilities.

The screenshot-only footer replaces the normally disconnected Settings button
with an inert red 24px circle at y≈722, matching the reference geometry without
copying initials or exposing a fake user account. Separate Playwright assertions
cover destination coordinates, the 8px cadence and fixture-only footer.

This is an intentional cross-host **test fixture** normalization for same-scene
pixel comparison, not a claim that Codex uses the same rail CSS in browser and
Electron.
