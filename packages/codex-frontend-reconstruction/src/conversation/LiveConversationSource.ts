/**
 * Typed, host-agnostic subscription boundary for the live conversation page.
 * This is a reconstructed integration contract, not Codex original Df/cA code.
 */
import type { ConversationRenderEntry, ConversationRenderProjectionOptions } from "./ConversationRenderEntriesModel.js";

export interface LiveConversationSnapshot {
  revision: number;
  conversationId: string;
  entries: readonly ConversationRenderEntry[];
  loadingHistory: boolean;
  connectionState: "connected" | "connecting" | "disconnected" | "error";
  projection: Omit<ConversationRenderProjectionOptions, "baseEntries" | "previousEntries">;
}

export interface LiveConversationSource {
  getSnapshot(): LiveConversationSnapshot;
  subscribe(listener: () => void): () => void;
}

/** Immutable snapshots are essential to React.useSyncExternalStore. */
export function createLiveConversationSource(initial: Omit<LiveConversationSnapshot, "revision">):
  LiveConversationSource & { update(next: Partial<Omit<LiveConversationSnapshot, "revision">>): void; dispose(): void } {
  let revision = 0;
  let closed = false;
  let snapshot: LiveConversationSnapshot = freezeSnapshot({ ...initial, revision });
  const listeners = new Set<() => void>();

  function update(next: Partial<Omit<LiveConversationSnapshot, "revision">>) {
    if (closed) return;
    if (next.entries != null && !Array.isArray(next.entries)) {
      throw new TypeError("entries must be an array");
    }
    const changed = Object.entries(next).some(([key, value]) =>
      !Object.is(snapshot[key as keyof LiveConversationSnapshot], value));
    if (!changed) return;
    revision += 1;
    snapshot = freezeSnapshot({ ...snapshot, ...next, revision });
    for (const listener of [...listeners]) listener();
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      if (!closed) listeners.add(listener);
      return () => listeners.delete(listener);
    },
    update,
    dispose() { closed = true; listeners.clear(); },
  };
}

function freezeSnapshot(snapshot: LiveConversationSnapshot): LiveConversationSnapshot {
  // Do not mutate host events. Freeze the public envelope and copy the entry array;
  // the host owns individual immutable entries and nested projection fields.
  return Object.freeze({ ...snapshot, entries: Object.freeze([...snapshot.entries]) });
}

/**
 * Guard against stale subscriptions pushing records from another thread after
 * navigation; a revision is scoped to one conversation source instance.
 */
export function acceptLiveConversationUpdate(
  current: LiveConversationSnapshot,
  incoming: Pick<LiveConversationSnapshot, "conversationId" | "revision">,
): boolean {
  return incoming.conversationId === current.conversationId && incoming.revision > current.revision;
}
