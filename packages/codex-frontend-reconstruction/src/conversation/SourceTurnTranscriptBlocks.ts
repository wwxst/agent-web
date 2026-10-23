/**
 * Converts an actual turn.items sequence to the recovered rs transcript block
 * contract. Reuses the existing splitTurnItemsIntoRenderGroups extraction from
 * original split-items-into-render-groups; it does not invent a second splitter.
 *
 * Non-message host leaves and private Wa/hn predicates remain injected.
 */
import { splitTurnItemsIntoRenderGroups, type TurnItem, type Dependencies, type TurnStatus } from "./TurnItemRenderGroups.js";
import type { ConversationTranscriptBlock, ConversationMessageItem } from "./ConversationMessageRenderPlan.js";

export interface SourceTurnBlockInput {
  turnId: string;
  items: readonly TurnItem[];
  status: TurnStatus;
  mode: "latest" | "all";
  dependencies: Dependencies;
  resolvedApps?: unknown;
  collapseWhenPossible?: boolean;
}

/** Source ordering: user items → activity units → final assistant item. */
export function projectSourceTurnTranscriptBlocks(input: SourceTurnBlockInput): ConversationTranscriptBlock[] {
  const groups = splitTurnItemsIntoRenderGroups(
    [...input.items], input.status === "inProgress" ? "in_progress" : input.status === "completed" ? "complete" : input.status,
    input.mode, undefined, input.resolvedApps ?? [], input.dependencies,
  );
  const blocks: ConversationTranscriptBlock[] = [];
  for (const [index, item] of groups.userItems.entries()) {
    blocks.push({
      type: "user-message", key: input.turnId + ":user:" + (item.id ?? index),
      item: item as ConversationMessageItem,
      isFirstUserMessage: index === 0,
      isLastUserMessage: index === groups.userItems.length - 1,
    });
  }
  if (groups.agentItems.length > 0) {
    blocks.push({
      type: "agent-activity", key: input.turnId + ":agent-activity",
      items: groups.agentItems.map(item => ({
        ...item,
        ...(groups.toolGroupStartItems.has(item) ? { startsGroup: true } : {}),
      }) as ConversationMessageItem),
      ...(input.collapseWhenPossible === undefined ? {} : { collapseWhenPossible: input.collapseWhenPossible }),
    });
  }
  if (groups.assistantItem != null) {
    blocks.push({
      type: "assistant-message", key: input.turnId + ":assistant:" + (groups.assistantItem.id ?? "final"),
      item: groups.assistantItem as ConversationMessageItem,
    });
  }
  return blocks;
}
