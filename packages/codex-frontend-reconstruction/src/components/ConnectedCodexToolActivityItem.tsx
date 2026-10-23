import * as React from "react";
import type { ToolItem } from "../conversation/ToolActivityDetailModel.js";
import type { ToolActivityHistorySource } from "../conversation/ToolActivityHistorySource.js";
import {
  CodexToolActivityItem,
  type CodexToolActivityItemProps,
} from "./CodexToolActivityItem.js";

export type ConnectedCodexToolActivityItemProps = Omit<
  CodexToolActivityItemProps<ToolItem>,
  "item" | "historyHydration" | "assistantCopyText"
> & {
  source: ToolActivityHistorySource;
};

/**
 * Connects the host-backed history source to the existing source-shaped tool
 * activity renderer. The source owns query lifetimes and hydration; this
 * component only subscribes and forwards its current projection to the leaf
 * renderer, leaving all proprietary visual leaves injected as before.
 */
export function ConnectedCodexToolActivityItem(props: ConnectedCodexToolActivityItemProps) {
  const { source, ...renderProps } = props;
  const snapshot = React.useSyncExternalStore(source.subscribe, source.getSnapshot, source.getSnapshot);
  if (snapshot.item == null) return null;
  return (
    <div data-codex-tool-history-connected="" data-codex-tool-history-state={snapshot.state}
      data-codex-tool-history-revision={snapshot.revision} style={{ display: "contents" }}>
    <CodexToolActivityItem
      {...renderProps}
      item={snapshot.item}
      assistantCopyText={snapshot.assistantCopyText}
    />
    </div>
  );
}
