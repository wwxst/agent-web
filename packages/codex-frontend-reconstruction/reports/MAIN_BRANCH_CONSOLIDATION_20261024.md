# 2026-10-24 — Consolidation of Codex frontend recovery into main

## Status of original divergent reconstruction branches

The earlier `recovery/codex-mcp-disclosure-20261023` (PR #2) and
`recovery/codex-mcp-result-guard-20261023` (PR #3) were already integrated
through PR #4 and are part of main. PR #5 was subsequently merged to main.
Their old remote branches no longer exist. No second Electron implementation
was reintroduced during this consolidation.

## 2026-10-24 second stacked-PR consolidation

The following **eleven** source-backed PRs were integrated by normal GitHub
merge commits, using head-SHA expectations (no force pushes or rebases
overwriting old source), and preserving all prior commits:

- PR #6: mounted Find-in-Thread highlighting
- PR #7: source-Y historical-turn search hydration
- PR #8: original search result cap / regex-worker behavior
- PR #9: source/runtime audit and portal fix
- PR #10: source ProseMirror code-block clipboard text
- PR #11: full inline review/file diff in the mounted transcript
- PR #12: per-thread session and draft retention
- PR #13: per-thread Electron composer draft persistence/restart
- PR #14: per-thread virtualized scroll viewport restoration
- PR #15: Markdown code panel and desktop screenshot/clipboard
- PR #16: original command-actions visual in existing tool activity

After each merge, its stacked dependent PR was retargeted to main, ensuring
the cumulative changes were integrated into the main branch. The final
source consolidation merge is `9b707bee5bb03307dff21d5cc0fdc82d12d974b9`
(PR #16). All PRs #6–#16 are closed as merged.

Each source PR's latest head CI succeeded on its own branch. However,
**passing separate PR CI does not guarantee that the integrated main tree
passes all tests**, especially after joining sibling PR #10–#11 and
#12–#16. The previous CI workflow only ran push jobs on `recovery/**`,
so no main push CI was triggered. This follow-up changes the workflow to
verify `main` on every push, and runs the combined tree via a reviewable
validation PR before integrating that workflow change.

## Branch cleanup

At the start of the consolidation the remote held 11 source branches for
PR #6–#16 plus main. These are now *merged* and may be deleted after
verifying no work remains. The available GitHub connector supports PR
merges and reference updates but does not expose a branch-delete operation.
Therefore remote branch deletion must be performed using the GitHub UI
(Branches → delete the merged branch, or the merged PR's Delete branch
button), or a verified authorized CLI with delete permission. **Do not
force-push, erase refs, or claim deletion was done through unsupported
tool calls.** Keep main and any genuinely active feature branches.

## Acceptance requirements

Before treating the consolidation as verified:

1. CI on the combined main-derived tree must pass the complete core Node,
   demo-model, Chromium and real Electron Linux/Windows test gates.
2. The workflow change must merge and a `main` push CI must run.
3. Verify that all expected PRs are merged, not merely closed, and that no
   unexpected PR is still targeting a removed source branch.
4. Maintain clear separation between synthetic demo data, actual Electron
   shell and unavailable private Codex host/real Agent backend.

This consolidation does not modify the Agent backend or claim original
Codex pixel-level desktop parity.
