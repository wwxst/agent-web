import * as React from "react";
import type { LiveConversationSource } from "../conversation/LiveConversationSource.js";
import {
  LiveConversationTranscript,
  type LiveConversationTranscriptProps,
} from "./LiveConversationTranscript.js";

export type ConnectedLiveConversationTranscriptProps = Omit<
  LiveConversationTranscriptProps,
  "baseEntries" | "projectionOptions"
> & {
  source: LiveConversationSource;
  LoadingView?: React.ComponentType | undefined;
  DisconnectedView?: React.ComponentType | undefined;
};

/**
 * Data-subscription integration for the live transcript. Host-specific Df
 * subscriptions remain outside this component. The original Codex UI is not
 * modified by this integration layer; the supplied RowComponent owns its DOM.
 */
export function ConnectedLiveConversationTranscript(props: ConnectedLiveConversationTranscriptProps) {
  const { source, LoadingView, DisconnectedView, ...viewProps } = props;
  const snapshot = React.useSyncExternalStore(source.subscribe, source.getSnapshot, source.getSnapshot);
  if (snapshot.loadingHistory && snapshot.entries.length === 0 && LoadingView != null) {
    return <LoadingView />;
  }
  if (snapshot.connectionState === "disconnected" && snapshot.entries.length === 0 && DisconnectedView != null) {
    return <DisconnectedView />;
  }
  return (
    <LiveConversationTranscript
      {...viewProps}
      baseEntries={snapshot.entries as LiveConversationTranscriptProps["baseEntries"]}
      projectionOptions={snapshot.projection}
    />
  );
}
