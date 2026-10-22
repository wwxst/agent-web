import type {
  ToolActivityHistoryEntity,
  ToolActivityHistoryEntityQuery,
} from "./ToolActivityHistoryHydrationModel.js";
import type {
  ToolActivityAssistantMessagePresenceListener,
  ToolActivityHistoryEntityListener,
  ToolActivityHistorySubscriptionHost,
  ToolActivityHistoryUnsubscribe,
} from "./ToolActivityHistorySource.js";

type Channel = "history" | "assistant-message-presence";
type Listener = (value: unknown) => void;
interface Entry {
  query: ToolActivityHistoryEntityQuery;
  loaded: boolean;
  value: unknown;
  listeners: Set<Listener>;
}
export interface ToolActivityHistoryEntityStoreSnapshot<T = unknown> {
  readonly loaded: boolean;
  readonly value: T | undefined | null;
}
export interface ToolActivityHistoryEntityStore extends ToolActivityHistorySubscriptionHost {
  publishHistoryEntity(query: ToolActivityHistoryEntityQuery, entity: ToolActivityHistoryEntity | null | undefined): void;
  publishAssistantMessagePresence(query: ToolActivityHistoryEntityQuery, presence: unknown): void;
  getHistoryEntitySnapshot(query: ToolActivityHistoryEntityQuery): ToolActivityHistoryEntityStoreSnapshot<ToolActivityHistoryEntity>;
  getAssistantMessagePresenceSnapshot(query: ToolActivityHistoryEntityQuery): ToolActivityHistoryEntityStoreSnapshot;
  clearThread(hostId: string, threadId: string): void;
  dispose(): void;
}

function keyOf(query: ToolActivityHistoryEntityQuery): string {
  return JSON.stringify([query.hostId, query.threadId, query.entityKey, query.itemId]);
}

/**
 * Concrete host-side cache for the source-derived Au/Vd query pair.
 * Au publishes the canonical history entity; Vd publishes an opaque presence
 * value whose truthiness gates assistant streaming presentation. The two
 * channels intentionally remain separate even though their query arguments
 * are structurally identical in the original compiled component.
 *
 * This is a reconstructed store for the independent frontend, not the private
 * Codex query runtime itself.
 */
export function createToolActivityHistoryEntityStore(): ToolActivityHistoryEntityStore {
  let closed = false;
  const channels: Record<Channel, Map<string, Entry>> = {
    history: new Map(),
    "assistant-message-presence": new Map(),
  };

  function entryFor(channel: Channel, query: ToolActivityHistoryEntityQuery): Entry {
    const map = channels[channel];
    const key = keyOf(query);
    let entry = map.get(key);
    if (entry == null) {
      entry = {
        query: Object.freeze({ ...query }),
        loaded: false,
        value: undefined,
        listeners: new Set(),
      };
      map.set(key, entry);
    }
    return entry;
  }

  function snapshot<T>(channel: Channel, query: ToolActivityHistoryEntityQuery): ToolActivityHistoryEntityStoreSnapshot<T> {
    const entry = channels[channel].get(keyOf(query));
    return Object.freeze({
      loaded: entry?.loaded === true,
      value: (entry?.value as T | undefined | null) ?? undefined,
    });
  }

  function subscribe(
    channel: Channel,
    query: ToolActivityHistoryEntityQuery,
    listener: Listener,
  ): ToolActivityHistoryUnsubscribe {
    if (closed) return () => {};
    const entry = entryFor(channel, query);
    entry.listeners.add(listener);
    if (entry.loaded) listener(entry.value);
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      entry.listeners.delete(listener);
    };
  }

  function publish(channel: Channel, query: ToolActivityHistoryEntityQuery, value: unknown): void {
    if (closed) return;
    const entry = entryFor(channel, query);
    if (entry.loaded && Object.is(entry.value, value)) return;
    entry.loaded = true;
    entry.value = value;
    for (const listener of [...entry.listeners]) listener(value);
  }

  return {
    subscribeHistoryEntity(query, listener: ToolActivityHistoryEntityListener) {
      return subscribe("history", query, listener);
    },
    subscribeAssistantMessagePresence(query, listener: ToolActivityAssistantMessagePresenceListener) {
      return subscribe("assistant-message-presence", query, listener);
    },
    publishHistoryEntity(query, entity) {
      publish("history", query, entity);
    },
    publishAssistantMessagePresence(query, presence) {
      publish("assistant-message-presence", query, presence);
    },
    getHistoryEntitySnapshot(query) {
      return snapshot<ToolActivityHistoryEntity>("history", query);
    },
    getAssistantMessagePresenceSnapshot(query) {
      return snapshot("assistant-message-presence", query);
    },
    clearThread(hostId, threadId) {
      if (closed) return;
      for (const channel of Object.keys(channels) as Channel[]) {
        for (const entry of channels[channel].values()) {
          if (entry.query.hostId === hostId && entry.query.threadId === threadId) {
            publish(channel, entry.query, undefined);
          }
        }
      }
    },
    dispose() {
      if (closed) return;
      closed = true;
      for (const map of Object.values(channels)) {
        for (const entry of map.values()) entry.listeners.clear();
        map.clear();
      }
    },
  };
}
