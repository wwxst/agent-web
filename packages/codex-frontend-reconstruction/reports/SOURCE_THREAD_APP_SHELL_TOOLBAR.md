# Main titlebar toolbar and native desktop interaction — 2026-10-23

## Source evidence
- Supplied `frontend/webview/assets/thread-app-shell-chrome-404b941243dd.js`, source functions `Ps/Fs`. `Ps` resolves `threadWorkspace.chatTitlebar.label` with default English `Chat toolbar` and renders a distinct `div` with `role:'toolbar'`, `data-app-shell-focus-area:'main'`, localized `aria-label` and the header toolbar inside.
- `Fs` wraps title context in a `span` carrying `data-app-shell-titlebar-content:true`. Other route-dependent chips, app controls and shortcut declarations remain host-dependent, and are not invented.
- Existing browser-preview app already rendered the main `header`, title and buttons. The reconstruction now restores the inner toolbar semantics without replacing or duplicating the visible header, and exposes title context as a distinct flex item. The Chinese aria-label “聊天工具栏” is a locally authored translation of the original label for this zh-CN host, not a byte-identical locale extraction.

## Verification
- Chromium navigation-rail test checks the named toolbar, main focus area and the same sidebar toggle remains inside it.
- Electron/Xvfb smoke is extended beyond mounting: click the actual titlebar '收起侧边栏' button, observe shell layout state change, click '展开侧边栏', and verify the transcript remains mounted. It still requires an actually painted nonblank Electron screenshot, real isolation settings and successful Vite build.
- These are renderer-only UI interactions. The desktop bridge remains sandboxed, with no preload, Agent API, filesystem action, or MCP server.

## Unfinished
- Original Codex window route variants, tab-strip integration, keyboard navigation/shortcut focus manager, theme/icons and same-build Windows pixel parity are not restored.
- Synthetic navigation and conversation data remain fixture-only.
