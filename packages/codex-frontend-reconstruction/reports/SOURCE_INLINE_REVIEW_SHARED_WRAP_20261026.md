# 2026-10-26 — Original inline file review shared wrap preference

## Source evidence (user-supplied original Windows Codex compiled resources)

File: frontend/webview/assets/inline-file-diff-review-2b36b4184acf.js

- Original O chooses too-large, compact, and full modes. The full
  component k receives the existing source app preference C
  (imported as kvt from app-initial-5851df3f6cb1.js).
- k reads C via l(C), computes the real Pierre FileDiff
  overflow as wrap or scroll, and passes onToggleWrap and wrapLines to A.
- Original A's wrap control is available only when onToggleWrap exists;
  clicking it runs d.set(C,!wrapLines). There is no local per-card
  React.useState(false) preference in this original component.
- Too-large and compact variants do not expose the wrap button.
  Edit and Accept are disabled by explicit canEdit/canAccept permission;
  Reject remains available. Those constraints already existed in the
  reconstructed file-review model and are retained.
- The original shared preference is *not* the same as independent
  Markdown code snippet wrapping by assumption. This recovery keeps
  distinct store contracts and does not assert private alias identity.

## Integrated change

- SourceInlineReviewWrapPreference defines the original shared
  observable store contract with immutable boolean snapshots,
  subscriptions, deduplicated updates and unsubscribe.
- Existing InlineFileReview observes a caller-owned preference via
  React.useSyncExternalStore, uses it for the same Pierre overflow and
  the same full-mode toolbar, and exposes an aria-pressed accessible state.
- Existing ConnectedConversationMessageRenderers passes the preference
  from the host to its real mounted file review entries, preserving the
  current permissions / action handler and the real FileDiff engine.
- Demo host explicitly owns one session-scoped preference, used by
  distinct reviews in two real conversations. Navigating away unmounts
  virtual rows, but returning reuses the same setting. No fake new
  timeline or second Diff implementation.
- Core model tests verify multiple subscribers and remount reads;
  Chromium and native Windows/Linux Electron tests use actual file
  review items, click wrap, change conversations, verify retained
  preference and disabled Accept/Edit, and capture screenshots.

## Not recovered

- Original private app C persistence and device/account sync;
  this independent host supports only in-session shared state.
- Exact toolbar SVG/icon, private design-system button,
  full original Windows screenshot pixel comparison, private Agent
  backend approval transport or actual disk mutation.
- This does not grant any new permissions. Demo approval/diff data
  remain clearly labeled synthetic.

Acceptance requires final-head CI Linux and Windows green.
Keep the stacked PR open; do not merge main without approval.
