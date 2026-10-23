# 2026-10-23 — source Ke/fr and qe latest-turn integration

## Confirmed source functions (compiled Windows frontend.zip)

- `inline-followup-markdown-4751fe20f26d.js`, SHA-256 `b2a356e8c59b592f16514e9c160cacbbeebfedf0c18b87699564f8c20705fa0b`, exports `Ke` as `a` (imported `Wa` in the local turn renderer) and `qe` as `c` (imported `Ga`).
- `agent-activity-item-1be092f0c744.js`, SHA-256 `e64adbffa15ebaa08ffd854743e1409325303481313656bf6749407b4c53d1ca`, exports `fr` as `r`. `Ke` calls it as `w(item,next)` **before** `_e` classification, preserving the source item index for keys. `fr` suppresses a successful recognized visualization exec immediately followed by a patch with nonempty `visualizationActivities`, or a read recognized by the private tool-loader `qt(Zt(...))`.
- `qe` finds the last relevant unit index (standalone assistant without meaningful content is skipped), then keeps **every standalone unit**, any group with source `Q` active members, and a final group only if the turn-host `Gi` flag is true.
- `app-initial-5851df3f6cb1.js`, SHA-256 `c70d95da34ba7e5962a559dbf68d0102d10b4b47b877f5d9933629bb5a1f3a10`, exports `F$n` as `Trr`, imported `f` by the helper. Its meaningful assistant predicate checks nonblank content, completion, or structured output.
- In `local-conversation-turn-69783815d57d.js` the latest-turn path applies `Ga(Ri,Gi)`; the historical path leaves the full unit array. The grouped activity JSX receives the result rather than a guessed second timeline.

## Implemented in the current connected frontend

- `SourcePreGroupExecFilter.ts` expresses the source `fr` branch. The unobserved private `Jt`, `Kt`, `qt` and `Zt` conditions remain host-injected. A false/missing host predicate never discards a real command.
- Existing `AgentActivityUnitGrouping` now calls optional `shouldSkipBeforeGrouping(item,next,index)` before the previous N/P algorithm. The original input index, explicit group boundaries and stable identities remain intact.
- `SourceLatestActivityVisibility.ts` restores `qe` and `F$n`, reusing the already source-recovered `isActiveGroupMember` for `Q`.
- Existing `ConnectedConversationMessageRenderers` uses `filterSourceLatestActivityUnits` only on its real `renderMode === "latest"` path. The private `Gi` selector is an explicit optional host callback; without a definitive boolean the renderer retains its already-verified UI rather than removing groups speculatively. The latest visible unit used by header projection is now computed **after** filtering.
- The DEMO explicitly injects synthetic `fr` predicates and an opt-in `qe` test flag. The synthetic `review-source-ke-qe` row goes through the actual existing connected React activity timeline; it does not run terminal commands, invoke Agents or mutate files.
- New Node tests cover normal/active/finished groups, interrupted exec, trailing blank assistant messages, structured output, adjacent visualization patches, loaded reads, original array/index preservation. Browser test verifies actual mounted group and child counts.

## Still missing and source fidelity boundary

The real `Gi` state resolver and private `Jt/Kt/qt/Zt` predicates need their own source recovery and proper host adaptation; explicit fixtures are not a production implementation. The full `_mn` Aeon parser, result component `cs`, exact icons/transitions/design-system tokens, Electron IPC, real Agent stream and same-build screenshot parity are also unimplemented.

Do not treat passing core/Chromium fixture tests as full desktop acceptance. Next focus: source-confirmed private `Gi` / `Jt/Kt` input contracts and real-time state changes in an independently running preview, using the existing recovered grouping and activity components.

## Read-only source audit

```bash
node scripts/audit-latest-activity-evidence.mjs /path/to/frontend/webview/assets
```

The script verifies complete SHA-256 hashes and **nine** local source signatures. The original proprietary bundles remain private and are not checked into the repo.
