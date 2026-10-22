import {
  buildToolActivityHistoryQueryPlan,
  createSourceToolActivityHistoryDependencies,
  hydrateToolActivityItemFromHistory,
  type ToolActivityHistoryEntity,
  type ToolActivityHistoryEntityQuery,
  type ToolActivityHistoryHydrationContext,
  type ToolActivityHistoryHydrationDependencies,
  type ToolActivityHistoryQueryContext,
  type ToolActivityHistoryQueryPlan,
  type ToolActivityHistoryHydrationResult,
} from "./ToolActivityHistoryHydrationModel.js";
import type { ToolItem } from "./ToolActivityDetailModel.js";

export type ToolActivityHistoryUnsubscribe = () => void;
export type ToolActivityHistoryEntityListener =
  (entity: ToolActivityHistoryEntity | null | undefined) => void;

/**
 * Host adapter for the two source query channels used by the original history
 * hydration path. Bind these methods to the app's Mr/Au/Vd subscriptions; this
 * module intentionally does not guess their private database/runtime APIs.
 */
export interface ToolActivityHistorySubscriptionHost {
  subscribeHistoryEntity(
    query: ToolActivityHistoryEntityQuery,
    listener: ToolActivityHistoryEntityListener,
  ): ToolActivityHistoryUnsubscribe;
  subscribeAssistantMessageEntity(
    query: ToolActivityHistoryEntityQuery,
    listener: ToolActivityHistoryEntityListener,
  ): ToolActivityHistoryUnsubscribe;
}

export interface ToolActivityHistorySourceInput {
  item: ToolItem;
  queryContext: ToolActivityHistoryQueryContext;
  hydrationContext?: ToolActivityHistoryHydrationContext;
}

export type ToolActivityHistorySourceState = "loading" | "ready" | "unavailable" | "error";

export interface ToolActivityHistorySourceSnapshot extends ToolActivityHistoryHydrationResult {
  revision: number;
  state: ToolActivityHistorySourceState;
  queryPlan: ToolActivityHistoryQueryPlan | null;
  historyEntity: ToolActivityHistoryEntity | null | undefined;
  assistantMessageEntity: ToolActivityHistoryEntity | null | undefined;
  historyLoaded: boolean;
  assistantMessageLoaded: boolean;
  error: unknown | null;
}

export interface ToolActivityHistorySource {
  getSnapshot(): ToolActivityHistorySourceSnapshot;
  subscribe(listener: () => void): ToolActivityHistoryUnsubscribe;
}

export interface ConnectedToolActivityHistorySource extends ToolActivityHistorySource {
  updateInput(input: ToolActivityHistorySourceInput): void;
  dispose(): void;
}

function querySignature(query: ToolActivityHistoryEntityQuery | null): string {
  if (query == null) return "";
  return [query.hostId, query.threadId, query.entityKey, query.itemId].join("\u0000");
}

function planSignature(plan: ToolActivityHistoryQueryPlan | null): string {
  if (plan == null) return "";
  return [
    querySignature(plan.historyEntity),
    plan.assistantMessageEntity == null ? "" : querySignature(plan.assistantMessageEntity),
  ].join("\u0001");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Bridges LO query planning and zO entity hydration to host-provided reactive
 * subscriptions. Each published snapshot is immutable and stable between
 * updates, so it can be consumed by React.useSyncExternalStore.
 */
export function createToolActivityHistorySource(
  initialInput: ToolActivityHistorySourceInput,
  host: ToolActivityHistorySubscriptionHost,
  dependencies: ToolActivityHistoryHydrationDependencies = createSourceToolActivityHistoryDependencies(),
): ConnectedToolActivityHistorySource {
  let input = initialInput;
  let queryPlan = buildToolActivityHistoryQueryPlan(input.item, input.queryContext);
  let activeSignature = planSignature(queryPlan);
  let generation = 0;
  let revision = 0;
  let closed = false;
  let historyEntity: ToolActivityHistoryEntity | null | undefined;
  let assistantMessageEntity: ToolActivityHistoryEntity | null | undefined;
  let historyLoaded = false;
  let assistantMessageLoaded = queryPlan?.assistantMessageEntity == null;
  let subscriptionError: unknown | null = null;
  let hasSubscriptionError = false;
  let activeUnsubscribers: ToolActivityHistoryUnsubscribe[] = [];
  const listeners = new Set<() => void>();

  function currentState(): ToolActivityHistorySourceState {
    if (queryPlan == null) return "unavailable";
    if (hasSubscriptionError) return "error";
    return historyLoaded && assistantMessageLoaded ? "ready" : "loading";
  }

  function makeSnapshot(): ToolActivityHistorySourceSnapshot {
    const hydrated = hydrateToolActivityItemFromHistory(
      input.item,
      historyEntity,
      assistantMessageEntity,
      input.hydrationContext ?? {},
      dependencies,
    );
    return Object.freeze({
      revision,
      state: currentState(),
      queryPlan,
      historyEntity,
      assistantMessageEntity,
      historyLoaded,
      assistantMessageLoaded,
      error: hasSubscriptionError ? subscriptionError : null,
      ...hydrated,
    });
  }

  let snapshot = makeSnapshot();

  function publish(): void {
    if (closed) return;
    revision += 1;
    snapshot = makeSnapshot();
    for (const listener of [...listeners]) listener();
  }

  function stopSubscriptions(): void {
    const pending = activeUnsubscribers;
    activeUnsubscribers = [];
    for (const unsubscribe of pending.reverse()) {
      try {
        unsubscribe();
      } catch {
        // Teardown is best-effort; one broken host cleanup must not leak the rest.
      }
    }
  }

  function attach(
    unsubscribe: ToolActivityHistoryUnsubscribe,
    token: number,
    owned: ToolActivityHistoryUnsubscribe[],
  ): void {
    if (typeof unsubscribe !== "function") {
      throw new TypeError("history host subscriptions must return an unsubscribe function");
    }
    if (closed || token !== generation || activeUnsubscribers !== owned) {
      unsubscribe();
      return;
    }
    owned.push(unsubscribe);
  }

  function failSubscription(error: unknown, token: number): void {
    if (closed || token !== generation) return;
    stopSubscriptions();
    hasSubscriptionError = true;
    subscriptionError = error;
    publish();
  }

  function startSubscriptions(plan: ToolActivityHistoryQueryPlan, token: number): void {
    const owned: ToolActivityHistoryUnsubscribe[] = [];
    activeUnsubscribers = owned;
    try {
      const stopHistory = host.subscribeHistoryEntity(plan.historyEntity, (entity) => {
        if (closed || token !== generation) return;
        historyEntity = entity;
        historyLoaded = true;
        publish();
      });
      attach(stopHistory, token, owned);
      if (closed || token !== generation) return;

      if (plan.assistantMessageEntity != null) {
        const stopAssistant = host.subscribeAssistantMessageEntity(plan.assistantMessageEntity, (entity) => {
          if (closed || token !== generation) return;
          assistantMessageEntity = entity;
          assistantMessageLoaded = true;
          publish();
        });
        attach(stopAssistant, token, owned);
      }
    } catch (error) {
      failSubscription(error, token);
    }
  }

  if (queryPlan != null) startSubscriptions(queryPlan, generation);

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      if (!closed) listeners.add(listener);
      return () => listeners.delete(listener);
    },
    updateInput(nextInput) {
      if (closed) return;
      if (Object.is(input.item, nextInput.item) &&
          Object.is(input.queryContext, nextInput.queryContext) &&
          Object.is(input.hydrationContext, nextInput.hydrationContext)) return;

      input = nextInput;
      const nextPlan = buildToolActivityHistoryQueryPlan(input.item, input.queryContext);
      const nextSignature = planSignature(nextPlan);
      if (nextSignature === activeSignature) {
        queryPlan = nextPlan;
        publish();
        return;
      }

      generation += 1;
      stopSubscriptions();
      queryPlan = nextPlan;
      activeSignature = nextSignature;
      historyEntity = undefined;
      assistantMessageEntity = undefined;
      historyLoaded = false;
      assistantMessageLoaded = queryPlan?.assistantMessageEntity == null;
      hasSubscriptionError = false;
      subscriptionError = null;
      publish();
      if (queryPlan != null) startSubscriptions(queryPlan, generation);
    },
    dispose() {
      if (closed) return;
      closed = true;
      generation += 1;
      stopSubscriptions();
      listeners.clear();
    },
  };
}

export function isToolActivityHistoryEntity(value: unknown): value is ToolActivityHistoryEntity {
  return isRecord(value) && typeof value.type === "string";
}
