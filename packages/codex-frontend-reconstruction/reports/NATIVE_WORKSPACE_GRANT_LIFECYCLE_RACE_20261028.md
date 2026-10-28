# Independent Electron workspace permission lifetime race — 2026-10-28

## Security review of the integrated host

Starting point is the source-grounded user-attachment → `hn/Qe` route
from PRs #58–#64. The permission boundary itself is **ours**, in
`desktop/trustedWorkspacePreview.cjs`, not Codex's private file manager.
Original Codex's `Qe/HJ/IX` routing does not authorize us to infer a
trusted local directory. The only independent authority here is the
native folder chooser and sender-validated Electron main process.

### Verified race before this batch

The old `selectDirectory` captured `webContents.id`, awaited the native
dialog, canonicalized its selected path through `realpath/stat`, and
unconditionally called `grants.set(id,root)`. Meanwhile:

1. A thread switch sends `revokeWorkspaceDirectory`;
2. navigation / window close calls `clearSender(id)`;
3. the still-pending folder chooser returns an accepted path;
4. its continuation restores the old grant in the main process.

React's request epoch prevents an old preview being rendered and may
issue an additional revoke, but it is **not a security replacement**
for enforcing the lifetime at the main-process grant owner. A race
between `realpath/stat` and navigation has the same problem. Separately,
an in-flight read can finish after its grant was revoked, returning
sensitive text to a stale caller.

### Implemented main-process boundary

- `epochs: Map<webContents.id,number>` records revocation generations.
  `revoke(event)` and `clearSender(id)` both increment a generation
  and delete the grant; it is not reset when the same ID is encountered
  later.
- A picker captures its generation on entry. After the awaited native
  chooser, after `filesystem.realpath`, and after `filesystem.stat`,
  it verifies **both** generation and the current trusted sender.
  Revoked/destroyed/navigated continuations return
  `{selected:false}` and **never** create a grant.
- One pending native chooser per sender ID is permitted.
  A concurrent request is rejected with
  `WORKSPACE_PICKER_IN_PROGRESS`, rather than racing to replace the
  same sender's grant. Other senders remain independent.
- `readTextFile` captures the grant generation and root, then verifies
  its generation, trusted sender and root equality after asynchronous
  file IO before returning any contents. A revoked read fails with
  `WORKSPACE_GRANT_REVOKED`. This also applies to the existing native
  `copyFileContents` operation, which invokes the same reader before
  writing to the OS clipboard.
- No new renderer APIs, file write operations, shell-open capability,
  Agent backend commands, or directory-path access were introduced.

### Reproducible regression verification

`desktop/trusted-workspace-preview.test.mjs` adds deferred-promise
tests that suspend an actual `selectDirectory` at the native dialog,
`realpath`, or `stat` await points before revoke/clearSender. They
also exercise duplicate picker rejection, renewed explicit authorization,
window-close and changed-trust cases, and an in-flight read/copy
blocked from returning or copying bytes after closure.

Existing real Windows/Linux Electron tests verify the actual isolated
preload, sender rejection, clipboard and menu behavior. They do **not**
manipulate a real native folder chooser after it has been opened;
this race is tested at the actual grant owner with a controlled
deferred chooser, not called an OS-level end-to-end dialog test.

### Remaining scope

This fixes lifecycle/async authority invalidation; it **does not**
prove a full filesystem race-free sandbox against adversarial
symlink replacement between `realpath/stat/readFile`. The current
security report already calls out that caveat. Race-resistant file
descriptor handling and full manual Windows OS chooser verification
remain follow-up work.

The original user-uploaded Codex compiled ZIP stays out of Git.
Changes are stacked on the tested PR #64 branch. No `main` merge
or Agent backend change.
