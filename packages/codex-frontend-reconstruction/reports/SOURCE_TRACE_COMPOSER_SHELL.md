# Source-first UI recovery checkpoint: Composer layout + shell geometry

**Scope:** recovered layout contract integrated into the actual Vite demo, not an imitation of the original entire app. The original Electron frontend was examined locally and is intentionally excluded from the public repository.

## First-hand source evidence, 2026-10-21

| Original user-supplied bundle | SHA-256 prefix | Confirmed source element | What was implemented |
|---|---|---|---|
| `frontend/webview/assets/app-initial-5851df3f6cb1.js` | `c70d95da34ba7e59` | `kcr` assigns `ComposerLayoutRoot`, `ComposerLayoutBody`, `ComposerLayoutInput`, `ComposerLayoutFooter`, `ComposerLayoutAttachments`; JSX emits `data-composer-layout`, `data-composer-density`, `data-composer-radius-variant`, `data-composer-surface-variant`; `Hcr` emits `data-composer-rows` | `src/components/CodexComposerLayout.tsx` models these **verified** layout slots and properties, leaving all editor/host behavior injected |
| Same JS bundle | Same | `Pcr` sets `stacked` for multiline/dictation and `inline` for single-line without responsive stacking; `Hcr` emits `data-composer-layout`, `data-composer-rows`, `data-composer-spacing` | Typed footer row selection; the demo uses multiline/stacked. Responsive dictation branch is not yet recovered |
| `frontend/webview/assets/app-initial-e7c27dd40beb.css` | `6de949e9037e0038` | `._ComposerLayoutRoot_5est5_2`, `._ComposerLayoutBody_5est5_2`, `._ComposerLayoutInput_5est5_2`, `._ComposerLayoutFooter_5est5_2`, radius and density attribute variants | `src/components/codexComposerLayout.css` ports a **limited** semantic layout style boundary, not full proprietary styles |
| `frontend/webview/assets/app-shared-dc7535e633d7.css` | `282dd3546bccfba4` | `--height-toolbar:46px`, `--height-toolbar-sm:36px`, `--thread-content-max-width:48rem`, `--spacing-token-sidebar:clamp(240px, var(--codex-sidebar-preferred-width,275px), min(520px, calc(100vw - 320px)))` | Demo shell consumes source-confirmed CSS variables rather than screenshot-fixed 49px/290px values |
| `app-initial-5851df3f6cb1.js` | same | App shell JSX includes `data-app-shell-frame`, `data-app-shell-sidebar-open`, `data-app-shell-application-menu-bar`; titlebar JSX includes `data-app-shell-main-titlebar` | Set corresponding semantic attributes on the existing **demo** shell for further reimplementation |

## Reproducible audit

Extract only the three named source bundles above from the user's `frontend.zip` into a private directory, **without committing them**. Then run:

```sh
cd packages/codex-frontend-reconstruction
node scripts/audit-layout-evidence.mjs --assets-dir /private/path/frontend/webview/assets
```

An audit exits nonzero if any source file/signature is absent; it prints SHA-256 hashes of the actual bytes. This was run locally on the files extracted directly from the user's migration bundle: **25 of 25 source signatures found**, with the three SHA prefixes shown above. Do not interpret this as proof of full recovered behavior.

## Evidence categories / limitations

**Directly confirmed:** component layout slot names, data attributes, source CSS tokens, basic multiline footer row selection, source shell-state marker names.

**Semantically reconstructed:** typed React `CodexComposerLayout` adapter and a small independent CSS port. The `data-composer-surface-variant` mapping is limited to `default`/`opaque`, and utility-bar variant to the verified `home` mode; unknown values have NOT been manufactured.

**Still mock or screenshot-derived:** actual textarea and submission adapter, attachment / privilege / model selector, original Windows titlebar controls, sidebar navigation JSX, icons, typography, exact background and border styling, shadow, responsive effects, and native Electron window integration. A source CSS token does not prove the screenshot's physical pixel measurements under unknown window zoom/preferences.

**Required next work:** recover genuine Composer controller/editor event flow from `app-initial-5851df3f6cb1.js`, identify exact JSX and CSS behavior for sidebar/header, port actual icon/font assets subject to license review, connect a real host adapter, then compare screenshots with matching content and runtime environment. **Do not call this UI parity complete.**
