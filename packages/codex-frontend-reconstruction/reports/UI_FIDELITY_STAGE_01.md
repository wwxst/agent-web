# Codex UI fidelity recovery — Stage 01 (light desktop shell)

**Status:** implementation and automated build/browser verification are separate checks. The changes in this stage are evidence-informed React/browser shell recovery, **not** the original Codex React tree, Composer engine, or Electron runtime.

## Primary sources checked

All paths below refer to the unmodified user-provided `frontend.zip`, **not** a web search or reconstructed mock UI:

- `frontend/webview/assets/app-shared-dc7535e633d7.css` (SHA-256 prefix `282dd3546bccfba4`): global semantic tokens `--color-surface`, `--color-text-secondary`, `--thread-content-max-width`, `--height-toolbar`, `--composer-radius`, and shell feature/layout selectors with `data-app-shell-*`.
- `frontend/webview/assets/app-initial-e7c27dd40beb.css` (SHA-256 prefix `6de949e9037e0038`): `._ComposerLayoutRoot_5est5_2` density/surface/radius variants, `. _MainContentFrame` layout selectors, `data-app-shell-page-header`, `data-app-shell-main-titlebar`, and sidebar layout styles. Exact hashed class names are implementation details and must not be treated as stable public APIs.
- `frontend/webview/assets/composer-controls-d0f9925fd25f.css` (SHA-256 prefix `767e016dac186b4e`): a separate composer controls stylesheet, not a complete rich editor.
- User-supplied **Codex Windows desktop reference screenshot** (1352 × 760): light surface, 290px sidebar at screenshot scale, 36px Windows menu area, 49px conversation header, centered transcript/composer, unobtrusive activity rows.

## What changed in the **actual demo application**

- The browser shell now has a light desktop-window layout reflecting the observed *structure* (menu-region **illustration**, sidebar, header, transcript, composer). It remains a web page, not an Electron window.
- Sidebar groups project and conversation rows; active conversation state and collapse are wired to the already existing React state, not duplicated static markup. Scheduled/Plugins are descriptive placeholders and intentionally **not actionable**.
- Demonstration-only banner/toolbar no longer take up transcript height; controls are available through an explicit **Demo tools** popover in the header.
- Composer shape, surface, padding, semantic controls, and message colors were aligned to the observed light reference, while retaining the existing synthetic send/stop behavior. The **real** Codex editor, attachments, model picker, and privilege control are **not** implemented; nonfunctional controls are visibly disabled or labeled mock.
- `demo/codexDesktopShell.css` is new, separately auditable, independently authored CSS. Neither the compiled vendor assets nor their huge CSS files are committed.
- Chromium tests now measure shell geometry/light theme, verify the demo tools are hidden by default, and preserve long-history scroll/follow assertions. A baseline shell screenshot is retained by CI before synthetic activity modifies the transcript.

## Scope limitations / next parity work

1. There is **no verified pixel-level parity**. Current UI is still populated from synthetic transcript records and does not match the screenshot's conversation content, font-loading environment, native window controls, or dynamic state. Visual comparisons must be conducted on the same window dimensions/content.
2. Use original bundle's sidebar/navigation JSX, tool renderer and Composer runtime to replace the remaining demo-only shell decisions, incrementally. Do not treat CSS approximations as proof of reverse-engineered behavior.
3. Restore original design token mapping and available asset fonts/icons with applicable license review; avoid distributing raw compiled proprietary Codex payloads in this public GitHub repository.
4. Replace demo-only `textarea` with a real typed Composer and Electron host adapter after reviewing actual compiled dependencies. Until then, keep simulate-only network/security boundaries intact.

## Verification checklist

```bash
cd packages/codex-frontend-reconstruction
npm install
npm run test:core
npm run demo:check-model
npm run demo:build
npx playwright install chromium
npm run demo:test:e2e
npm run demo:dev
```

Both Vite build and browser parity checks require a real npm environment; core tests alone do not establish UI fidelity. Source of truth for each validation is the GitHub Actions workflow of the pushed commit.
