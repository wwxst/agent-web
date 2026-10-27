# 2026-10-27 — Browser website access approval recovery

## Original Windows Codex source

Verified the user-provided compiled frontend modules:
- frontend/webview/assets/mcp-server-elicitation-request-panel-7318114289f7.js (ft / pt / mt / Z / Q / Ge / Ke / qe / Je).
- frontend/webview/assets/mcp-identifier-ea561b7d1c34.js (browser identifier normalization).

The original ft detects browser website access only for a recognized Browser/Chrome identity, an origin-bearing request and always persistence; mcpToolCall additionally needs the exact access_browser_origin tool. Ge presents a site URL/title, source header, optional reason, unscoped Allow once, scoped Allow for this site, and Deny. The leading Allow for all sites action is gated by loaded host policy. Je requires a separate elevated-risk confirmation: Cancel or Allow any website. Global response envelope adds persist:always and browser_use_persistent_approval_scope:all-sites.

## Integrated reconstruction

- SourceBrowserWebsiteApprovalModel: typed exact family classifier, scope projection and per-host request identity.
- SourceBrowserWebsiteApprovalCard: mounted via existing ConnectedConversationMessageRenderers; reuses SourceApprovalCardSurface and SourceApprovalDropdownPortal. Supports the site-scoped split menu, keyboard focus, pending/error/retry and explicit global confirmation dialog with Escape/Cancel.
- Origin links are restricted to HTTP(S). All app grants remain host-authoritative; delivered is not granted.
- Existing Electron preload/main IPC stays fail-closed. In particular, the strict main process currently rejects the global extra field; real site/global authorization requires a verified Agent backend protocol. No backend changes or fake grants.
- Synthetic policy-allowed Browser and policy-denied Chrome requests are inserted into the existing canonical LiveConversationSource, not an isolated page.
- Core model and mounted Chromium browser tests cover classifiers, scope guards, policy gate, menu, dialog, pending and error paths.

## Limits and follow-up

The private Ge/Je dialog component styling, icon family, animation and native Windows executable pixel parity have not been recovered. The real Agent request registry, Browser Use policies, global persistence protocol and authoritative settlement are also absent. The independently authored confirmation dialog is not claimed to be pixel identical.

Verify the final branch HEAD with core, demo model/typecheck/build, Chromium browser and native Windows/Linux Electron CI before merging. This branch stacks on open PR #40 and must remain unmerged until approved.
