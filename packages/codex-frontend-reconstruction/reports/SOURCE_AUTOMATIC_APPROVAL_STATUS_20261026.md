# 2026-10-26 — Automatic approval review status in mounted conversation

## Original compiled source evidence
Source: frontend/webview/assets/automatic-approval-review-details-d0acb2472248.js
SHA256: 0a42ff019ee2e9f9ccfa33b91475fb11a3e073d2b6eee163fe1c7926bf50bea6

- Original D (an expandable automatic-review row) reads
  review.status === "inProgress", and passes active status to
  original qk/S dynamic summary text component.
- Expanding the row uses aria-expanded and transitions details
  height/opacity; no permission-granting action occurs there.
- Original A branches on isDeclined: when true, it replaces review
  rows with explicit authorization notice. The notice is high-risk
  if ANY review has status denied and riskLevel high; otherwise
  it uses the generic authorization message.
- If review is not expandable, source D returns a static summary
  div, without toggle/shimmer. Warning styling remains reserved
  for status denied + riskLevel high.
- The private qk component implementation and motion engine are
  unavailable in the independent frontend; the running text effect
  uses a bounded host CSS approximation with reduced-motion support.
  This is NOT a pixel-parity claim.

## Real integration
- Existing ActivityStatusPresentation supplies the explicit source
  status predicate; ActivityStatusViews applies running-only
  summary styling to its EXISTING automatic-review disclosure,
  preserves details and the original high-risk declined branch.
- A DEMO-ONLY host event drives the same mounted canonical review
  activity through inProgress and denied high-risk states by
  updating the same LiveConversationSource entry. It is not a
  backend permission API and does not grant/deny real access.
- The demo host's getApprovalReviews receives explicit fixture
  status metadata and projects the original review data, rather
  than creating an alternate timeline or new fake approval renderer.
- Source unit tests prove inProgress only and generic vs
  high-risk denied logic; Chromium and native Windows/Linux Electron
  tests verify the ACTUAL mounted row's dynamic display,
  expandable details, state replacement, one row identity and
  screenshot for running/denied states.

## Limits and next
- No real host authorization request/reply transport, permission
  persistence, acceptance, denial execution or Agent backend changes.
- Exact source qk shimmer and Framer motion animation are not
  reverse-engineered. Colors/spacing and original executable
  Windows side-by-side screenshots are not pixel-validated.
- Other approval request card families (MCP/Computer Use/etc.)
  are outside this narrow automatic-review status module.
- Final acceptance requires latest Linux & Windows CI full green;
  keep PR stacked on #31, do not merge main without user direction.
