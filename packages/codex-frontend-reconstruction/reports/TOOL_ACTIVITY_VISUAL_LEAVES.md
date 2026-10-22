# Source-derived tool-detail visual leaves

## Source evidence

The visual leaf routing was inspected in the user-provided Codex Windows frontend archive, without committing the archive or any proprietary compiled assets to this repository.

- Archive: `frontend.zip`
- Archive SHA-256: `764a550ab17d5ec3a27d4ef3c7f76487d23083e7ddee6c14ae75210aa474f5be`
- Main source chunk: `frontend/webview/assets/sites-end-resource-fa77a923096d.js`
- Main source chunk SHA-256: `a84b2e2181125a3e4d2bc9be458bad4fb36df615243c7f3cc23e076bd4094708`
- Patch preview source chunk: `frontend/webview/assets/app-initial-5851df3f6cb1.js`
- Patch preview source chunk SHA-256: `c70d95da34ba7e5962a559dbf68d0102d10b4b47b877f5d9933629bb5a1f3a10`

The pinned bundle contains the dispatch and leaf definitions below. The patch preview/statistics behavior was cross-checked against the sibling chunks `patch-diff-stats-48343cc4a635.js` (SHA-256 `3664f03c29a0d9e3f62ce1972ddc87e71f48432402799dbcf18c5734e35b6025`) and `code-diff-628be5db9fe9.js` (SHA-256 `f402c9dcef03dd1a6d238b0ce1709ec366ef8814ae7e7ee10a41274dab8e7d9b`).

| Compiled identifier | Observed responsibility |
| --- | --- |
| `xC` | Dispatch parsed exec summaries to `RC`, `EC`, `NC`, or `CC` |
| `RC` | Read summary, completed-read visibility, skill-definition branch, path display |
| `EC` | Search summary text for query/path and in-progress/completed state |
| `NC` | File-list summary text for path and in-progress/completed state |
| `CC` | Collapsible command shell, elapsed label, output, exit code, interruption and denied-review state |
| `SC` | Shared tool-summary wrapper and automatic-review marker/detail entry |
| `WC` | Command summary variants including background terminal and interrupted command |
| `PT` | Patch status precedence, visualization activity visibility, file-change iteration |
| `IT` | Per-file add/delete/update labels, diff disclosure, line counts, file-open callback and empty/oversized preview fallback |
| `BT` / `VT` | Diff header and unified-diff / fallback preview presentation |

These are translations of compiled implementation evidence, not the original authored React/TypeScript source. The proprietary Codex design-system runtime, localization runtime and private file-open/approval handlers are not included here.

## Independent React implementation

New source module: `src/components/CodexSourceToolActivityLeaves.tsx`

- `CodexSourceExecReadLeaf` restores read visibility and summary/path presentation.
- `CodexSourceExecSearchLeaf` restores query/path summary variants.
- `CodexSourceExecListFilesLeaf` restores file-list summary variants.
- `CodexSourceExecCommandLeaf` restores collapsed-by-default command details, hydrated output/exit status, elapsed time and interruption/automatic-review-decline presentation. It never starts a command.
- `CodexSourcePatchLeaf` and its file row restore the source status precedence, visualization activity label, per-file status, compact diff disclosure, basename/full-path presentation, old/new line-number gutters, omission of Git/file metadata from the visible hunk, and source-observed empty/oversized-preview fallback. The current line renderer remains a compatibility implementation, not the original virtualized `@pierre/diffs` FileDiff engine.
- `src/conversation/ToolPatchDiffPresentationModel.ts` ports `patch-diff-stats` behavior: parse unified-diff counts, exclude file headers, fall back to raw `+`/`-` lines when parsing yields no changes, and use line 1 for that fallback. The file-open request carries the source path, `grantRoot ?? cwd`, and parsed open line.
- `src/conversation/ToolCommandSummaryModel.ts` ports the observable `WC` summary branches and `JC` elapsed-time precedence. In-progress commands use the live clock; completed commands use `durationMs` rather than continuing to count from `startedAtMs`. Hidden-raw-command mode omits the command disclosure and elapsed label.
- Optional `onOpenFile` is an explicit host callback. Without a host callback, paths are display-only. No file mutation or approval write-back is implemented in the leaf components.

Integration uses the existing `CodexToolActivityLeafRenderer` and `ConnectedConversationMessageRenderers`; it does not create a second transcript or bypass history hydration. The browser preview uses explicitly synthetic fixtures for command, patch, read, search and list-files rows.

## Audit and verification boundary

`scripts/audit-tool-detail-evidence.mjs` checks both original bundle hashes, 55 activity-leaf signatures, and four `s0n/f0n` patch-preview signatures, including the 1 MiB limit and move-path handling. The 21 added visual-leaf signatures were independently checked against the provided bundle and passed 21/21. The command summary model deliberately leaves the private `executionStatus` create/update classifier and skill-script background summary as documented follow-up work.

Source signature checks prove the target compiled branches are present; they do not prove pixel parity. The authored CSS in `demo/styles.css` is a local compatibility layer, not copied Codex CSS. The current browser preview is still a demo host, not a complete Electron app.

Remaining work:
- keep the new diff-presentation model and React leaf coverage in the CI suite; latest core tests and TypeScript/Vite build have passed, while the browser smoke run is checked separately;
- replace remaining host-injected visual leaves with source-shaped equivalents where source evidence supports it;
- bind file opening, approval requests and tool updates to a confirmed Agent/Electron event contract;
- compare the reconstructed leaf screenshots and interactions against the same Codex build and viewport.
