import * as React from "react";
import { parsePatchFiles } from "@pierre/diffs";
import { FileDiff } from "@pierre/diffs/react";

const FILE_DIFF_OPTIONS = {
  diffStyle: "unified",
  overflow: "scroll",
  hunkSeparators: "simple",
  disableFileHeader: true,
  diffIndicators: "bars",
  lineDiffType: "word-alt",
  theme: { dark: "pierre-dark", light: "pierre-light" },
} as const;

/**
 * Source-aligned IT -> BT/VT leaf: the compiled Codex bundle parses each
 * unified patch into FileDiffMetadata, then renders a single @pierre/diffs
 * FileDiff with unified layout and simple hunk separators. It does not use a
 * multi-item CodeView for this tool-activity path. Registered Codex soft themes
 * and the private theme resolver remain host-owned.
 */
export function CodexSourcePatchDiffPreview(props: {
  patch: string;
  header?: React.ReactNode;
}) {
  const fileDiff = React.useMemo(() => {
    try {
      const parsed = parsePatchFiles(props.patch, undefined, true);
      if (parsed.length !== 1 || parsed[0]?.files.length !== 1) return null;
      const file = parsed[0].files[0];
      const isBinary = props.patch.split(/\r?\n/).some((line) => line.startsWith("Binary files "));
      return file != null && !isBinary ? file : null;
    } catch {
      // The original VT leaf falls back to raw change content when no
      // renderable single-file diff can be parsed.
      return null;
    }
  }, [props.patch]);

  return (
    <div data-codex-source-diff-engine="pierre">
      {props.header}
      <div className="codex-source-tool-patch-file__diff-viewport">
        {fileDiff != null
          ? <FileDiff
              fileDiff={fileDiff}
              options={FILE_DIFF_OPTIONS}
              className="codex-source-tool-patch-file__diff-engine"
              style={{ fontSize: "11px", lineHeight: 1.7 }}
            />
          : <pre className="codex-source-tool-patch-file__diff-engine codex-source-tool-patch-file__diff-fallback">
              {props.patch}
            </pre>}
      </div>
    </div>
  );
}
