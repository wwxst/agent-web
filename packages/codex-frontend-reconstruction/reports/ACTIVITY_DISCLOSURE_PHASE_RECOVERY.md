# 2026-10-23 — Source A_ disclosure phases in XO/V_ repeated activity rows

## Source and version boundary

Read the exact original private `frontend.zip` (the user-supplied Windows Codex compiled assets), not screenshots or an independently designed component:

- `frontend/webview/assets/sites-end-resource-fa77a923096d.js`: SHA-256 `a84b2e2181125a3e4d2bc9be458bad4fb36df615243c7f3cc23e076bd4094708`.
  - `A_` starts at source byte/decoded offset 14,178; `V_` at 18,356; `XO` at 337,888; `nk` at 344,150.
- `frontend/webview/assets/inline-followup-markdown-4751fe20f26d.js`: SHA-256 `b2a356e8c59b592f16514e9c160cacbbeebfedf0c18b87699564f8c20705fa0b`; `Je` exports the contiguous repeated-call partition used by `nk`.

Hashes identify *this supplied bundle*, not necessarily the newer screenshots' running Codex build. The private original assets remain outside Git.

## Exact observable A_ state branches

The source chooses `collapsed`, `opening`, `expanded`, or `closing`. A toggle from expanded/opening switches to closing. A toggle while closing restores expanded without invoking `onExpand`. A toggle from collapsed calls `onExpand`, sets opening, and uses `requestAnimationFrame` to advance to expanded. When the motion completes, closing becomes collapsed.

The disclosure arrow considers opening/expanded open; interaction inside the body is enabled only when fully expanded. Children remain mounted through closing; fully collapsed children are not mounted. An initially collapsed instance may animate only if requested and its children are **not** a lazy function. `XO` and `V_` both pass function children and `shouldAnimateInitialCollapse:false`.

The original body is an `Rt.div` that animates `height:0/auto` and `opacity:0/1` with `transition:ar`, `overflow:hidden`, and pointer-event gating. The original summary accepts `summaryKey` / `summaryTransition`, and can optionally receive an icon. This batch restores the observable four-phase/lazy-body logic, not that exact private animation library nor the timed summary replacement.

## XO / V_ / nk composition

- `XO` supplies `mv` MCP icon, a Codex Apps action label from `_m` **or** a tool name from `KO`, and a separately localized repeated-call count.
- `V_` receives the `bv` connector icon and renders the incoming-events count with `sourceLabel`.
- Both wrap a *lazy function* mapping existing source `fk` item rows into their own `A_` disclosures.
- `nk` first applies `mk`, then `bg/Je`, retaining the 224px scrolling detail region and regular singleton rows. The parent and subgroup use different disclosure instances.

## Reconstruction changes

- `SourceActivityDisclosureModel.ts` exposes the four-state transition contract; four targeted Node tests cover lazy mount, initial state, interrupted closing and host expansion restrictions.
- `SourceActivityDisclosure.tsx` mounts this contract directly inside `CodexActivityGroupRow` instead of native HTML `<details>`. It provides separate icon, heading, button, aria-expanded, pointer-event gating and lazily mounted group children.
- `codexActivityGroupRow.css` now uses a host-independent grid height/opacity approximation while preserving the existing `nk` 224px scroller. The exact proprietary motion easing/duration is not known.
- `ConnectedConversationMessageRenderers` forwards `renderRepeatedIcon` as an explicit host contract; the DEMO adapter provides a conspicuously synthetic icon, never a fabricated Codex product asset.
- Chromium regression opens the real React subgroup within the existing historical activity turn, verifies its phases and icon slot, then closes and reopens the same row. No MCP command is run.

## Still not equivalent to original

Private `mv/bv` icons, `_m/KO` rich labels, `Rt.div` animation timing, `A_` summaryKey transition scheduler, real host-resolved Apps data, full `Wa/hn` live-turn partition, Electron bridge and Agent event source are **not** restored. The demo remains synthetic, not a standalone Codex-compatible desktop build; no same-version pixel parity claim is made.

## Reproduce source audit

After extracting only the source files needed from the private `frontend.zip` locally, run:

```sh
node scripts/audit-repeated-disclosure-evidence.mjs /path/to/frontend/webview/assets
```

The script verifies pinned hashes and signatures; do not commit or republish compiled assets.
