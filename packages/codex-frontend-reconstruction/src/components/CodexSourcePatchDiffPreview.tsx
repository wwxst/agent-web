import * as React from "react";
import { PatchDiff, Virtualizer } from "@pierre/diffs/react";

const PATCH_DIFF_OPTIONS = {
  diffStyle: "unified",
  overflow: "wrap",
  disableFileHeader: true,
  diffIndicators: "bars",
  lineDiffType: "word-alt",
  theme: { dark: "pierre-dark", light: "pierre-light" },
} as const;

/**
 * Real @pierre/diffs patch renderer, matching the source's unified/wrapped,
 * bar-indicator and word-diff configuration. The original Codex build embeds
 * this engine inside a CodeView multi-item surface; this single-patch adapter
 * uses the same PatchDiff renderer under its own Virtualizer scroll root.
 */
export function CodexSourcePatchDiffPreview(props: {
  patch: string;
  header?: React.ReactNode;
}) {
  return (
    <div data-codex-source-diff-engine="pierre">
      <Virtualizer
        className="codex-source-tool-patch-file__diff-viewport"
        contentClassName="codex-source-tool-patch-file__diff-content"
      >
      {props.header}
      <PatchDiff
        patch={props.patch}
        options={PATCH_DIFF_OPTIONS}
        className="codex-source-tool-patch-file__diff-engine"
        style={{ fontSize: "11px", lineHeight: 1.7 }}
      />
      </Virtualizer>
    </div>
  );
}
