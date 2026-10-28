# Bounded native file-handle read and symlink-swap checks — 2026-10-28

## Verified starting point

This is an independent Electron **security boundary**, not a recovered
private Codex `Qe/HJ` file manager. It is reached from the already connected
original-source user-file attachment and its local read-only panel.

Before this batch, `desktop/trustedWorkspacePreview.cjs` checked
`realpath(request.path)` and `stat(real)`, then invoked
`filesystem.readFile(real)` on a path string. The file or a parent
symlink can change after the initial checks, causing a different file
to be opened. `readFile` also allocated bytes before checking the
1 MiB cap a second time, permitting excessive allocation if a file grew.

## Implementation

1. The typed sender/epoch/native-grant checks from PR #65 are preserved.
   Path resolution and an initial `stat` still enforce canonical
   containment, regular file, extension and size.
2. The host `open(real, O_RDONLY | O_NOFOLLOW)` pins **one** file handle;
   `O_NOFOLLOW` is used on non-Windows platforms where available to
   reject a late leaf symlink. The opened descriptor is `fstat`-checked
   for a regular file and `MAX_PREVIEW_BYTES`.
3. It compares the descriptor's `dev/ino` with fresh path stats and
   rechecks the canonical path. Unknown/zero inode identity **fails
   closed**, not accepted as proof. The handle is always closed using
   `finally`, including rejection paths.
4. **Linux** additionally asks `realpath(/proc/self/fd/<fd>)` for the
   *actual opened file*, requiring it to equal the allowed canonical
   file path inside the selected root. This detects even a parent
   symlink redirected to a different file between the initial
   realpath/stat and open, without trusting the now-replaceable path.
   If the descriptor-path check is unavailable it denies the read.
5. The descriptor read allocates exactly `MAX_PREVIEW_BYTES+1` bytes
   and reads at most that amount. Growth after `fstat` rejects with
   `WORKSPACE_FILE_TOO_LARGE` without reading or allocating an
   unbounded `readFile(path)` result.
6. Existing strict UTF-8, NUL rejection, authorization epoch and
   sender-grant checks run before content can be returned. The same
   reader backs the source `Copy file contents` action.

## Cross-platform limitations

Windows does **not** expose a handle-resolved final pathname through the
Node.js APIs used here; it gets revalidated canonical pathname and
descriptor `dev/ino` identity comparisons, but these cannot prove that
an extremely fast adversarial parent-directory redirection could never
happen and be restored between checks. Do not call this a complete
Windows filesystem sandbox or assume `O_NOFOLLOW` works on Windows.
A native `GetFinalPathNameByHandle` bridge or Windows directory-handle
walk would need a separately verified, narrow implementation.

Linux's descriptor-path verification addresses path swaps for an already
opened handle, but does not claim to prevent all namespace changes,
changes to file contents through the same inode while it is being
read, hardlink access, or root-directory replacement semantics.
The user's OS-level rights and an actual native-folder selection are
still prerequisites.

## Tests / acceptance

Native host regression exercises a replacement between `stat` and
`open`, file growth that must not allocate/read beyond 1 MiB+1,
and an actual Linux parent-directory symlink swap to an out-of-root
file. It keeps all PR #65 tests for late native chooser, revoke,
navigation/closure, and stale OS clipboard operations.
The native Windows/Linux Electron CI must pass on the final head.

No original Codex compiled assets or separate Agent backend files
were changed. This remains a stacked recovery branch, not merged
into `main`.
