import * as React from "react";
import { parsePatchFiles } from "@pierre/diffs";
import { FileDiff } from "@pierre/diffs/react";

const FILE_DIFF_OPTIONS = {
  diffStyle: "unified",
  hunkSeparators: "simple",
  // The source leaf has an outer BT file header, so this inner surface does
  // not repeat it. The original theme resolver remains host-owned.
  disableFileHeader: true,
  theme: { dark: "pierre-dark", light: "pierre-light" },
} as const;

type PatchFallback =
  | { kind: "code"; content: string; language: string }
  | { kind: "deleted" }
  | null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function getPatchFallback(path: string, change: unknown): PatchFallback {
  if (!isRecord(change)) return null;
  if (change.type === "delete") return { kind: "deleted" };
  if (change.type === "add" && typeof change.content === "string") {
    const extension = path.split(".").at(-1)?.toLowerCase() ?? "text";
    return { kind: "code", content: change.content, language: extension };
  }
  if (change.type === "update" && typeof change.unified_diff === "string") {
    return { kind: "code", content: change.unified_diff, language: "diff" };
  }
  return null;
}

/**
 * Source-aligned IT -> VT leaf. The compiled Codex branch passes a unified
 * patch to its per-file FileDiff, using the host class
 * "composer-diff-simple-line overflow-y-auto max-h-25/max-h-60". When the
 * parser cannot produce a non-binary single-file diff, VT falls back to the
 * original change content (or the deleted-content label), not the synthesized
 * patch wrapper. Codex's registered soft themes and private theme resolver
 * remain host-owned.
 */
export function CodexSourcePatchDiffPreview(props: {
  patch: string;
  path: string;
  change: unknown;
  header?: React.ReactNode;
  /** IT passes true only for pending file changes (original max-h-25). */
  isShortView?: boolean;
}) {
  const fileDiff = React.useMemo(() => {
    try {
      const parsed = parsePatchFiles(props.patch);
      if (parsed.length !== 1 || parsed[0]?.files.length !== 1) return null;
      const file = parsed[0].files[0];
      const isBinary = props.patch.split(/\r?\n/).some((line) => line.startsWith("Binary files "));
      return file != null && !isBinary ? file : null;
    } catch {
      // Match VT's fallback for patches the diff engine cannot render.
      return null;
    }
  }, [props.patch]);
  const fallback = React.useMemo(
    () => getPatchFallback(props.path, props.change),
    [props.path, props.change],
  );

  return (
    <div data-codex-source-diff-engine="pierre">
      {props.header}
      {fileDiff != null
        ? <FileDiff
            fileDiff={fileDiff}
            options={FILE_DIFF_OPTIONS}
            className={"composer-diff-simple-line codex-source-tool-patch-file__diff-viewport codex-source-tool-patch-file__diff-engine overflow-y-auto" +
              (props.isShortView === true ? " is-short" : "")}
            style={{ fontSize: "11px", lineHeight: 1.7 }}
          />
        : fallback?.kind === "deleted"
          ? <div className="codex-source-tool-patch-file__empty" data-codex-source-patch-fallback="">
              文件内容已删除
            </div>
          : fallback?.kind === "code"
            ? <pre
                className="codex-source-tool-patch-file__diff-fallback"
                data-codex-source-patch-fallback=""
                data-language={fallback.language}
              >{fallback.content}</pre>
            : null}
    </div>
  );
}
