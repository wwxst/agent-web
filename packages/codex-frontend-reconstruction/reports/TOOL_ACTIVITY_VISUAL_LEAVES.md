# Source-derived tool-detail visual leaves

## Source evidence

The visual leaf routing was inspected in the user-provided Codex Windows frontend archive, without committing the archive or any proprietary compiled assets to this repository.

- Archive: `frontend.zip`
- Archive SHA-256: `764a550ab17d5ec3a27d4ef3c7f76487d23083e7ddee6c14ae75210aa474f5be`
- Main source chunk: `frontend/webview/assets/sites-end-resource-fa77a923096d.js`
- Main source chunk SHA-256: `a84b2e2181125a3e4d2bc9be458bad4fb36df615243c7f3cc23e076bd4094708`

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
- `CodexSourcePatchLeaf` and its file row restore the source status precedence, visualization activity label, per-file status, compact diff disclosure, basename/full-path presentation, unified-diff line coloring and source-observed empty/oversized-preview fallback.
- `src/conversation/ToolPatchDiffPresentationModel.ts` ports the observed patch-stat fallback: excludes unified-diff headers, counts additions/deletions, and derives the file-open line from the first added line or first deletion, falling back to line 1. The row passes that line through the explicit host `onOpenFile` callback.
- Optional `onOpenFile` is an explicit host callback. Without a host callback, paths are display-only. No file mutation or approval write-back is implemented in the leaf components.

Integration uses the existing `CodexToolActivityLeafRenderer` and `ConnectedConversationMessageRenderers`; it does not create a second transcript or bypass history hydration. The browser preview uses explicitly synthetic fixtures for command, patch, read, search and list-files rows.

## Audit and verification boundary

`scripts/audit-tool-detail-evidence.mjs` now checks the original bundle hash and 55 source signatures, including the CC/RC/EC/NC/SC/WC/PT/IT branches and their key summary/fallback markers. The 21 added visual-leaf signatures were independently checked against the provided bundle and passed 21/21.

Source signature checks prove the target compiled branches are present; they do not prove pixel parity. The authored CSS in `demo/styles.css` is a local compatibility layer, not copied Codex CSS. The current browser preview is still a demo host, not a complete Electron app.

Remaining work:
- keep the new diff-presentation model and React leaf coverage in the CI suite; latest core tests and TypeScript/Vite build have passed, while the browser smoke run is checked separately;
- replace remaining host-injected visual leaves with source-shaped equivalents where source evidence supports it;
- bind file opening, approval requests and tool updates to a confirmed Agent/Electron event contract;
- compare the reconstructed leaf screenshots and interactions against the same Codex build and viewport.
