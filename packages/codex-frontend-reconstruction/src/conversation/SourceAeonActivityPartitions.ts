/**
 * Source: original app-initial-5851df3f6cb1.js `Smn` (export `ayr`,
 * imported as `hn` by local-conversation-turn-69783815d57d.js).
 *
 * `_mn` is the private automation / attached-thread result decoder.
 * This model deliberately requires the host to resolve it; it does not
 * mistake an ordinary MCP success for a task result or call external APIs.
 */
import type {
  ConversationMessageItem,
  ConversationActivityPart,
} from "./ConversationMessageRenderPlan.js";

export interface SourceAeonActivityPartitionOptions<T extends ConversationMessageItem> {
  items: readonly T[];
  isAeonThread: boolean;
  hostId?: string | undefined;
  /** Exact private `_mn(item, hostId)` boundary, including approval/result verification. */
  resolveMcpTask: (item: T, hostId: string | undefined) => unknown | null;
}

/**
 * `Smn/hn` keeps the entire input as one activity partition outside Aeon.
 * In Aeon, every host-validated MCP task splits the adjacent ordinary activity
 * items without coalescing distinct task results or dropping unrecognized calls.
 */
export function partitionSourceAeonActivity<T extends ConversationMessageItem>(
  {items,isAeonThread,hostId,resolveMcpTask}: SourceAeonActivityPartitionOptions<T>,
): ConversationActivityPart[] {
  if (items.length === 0) return [];
  if (!isAeonThread) return [{type:"activity",items:[...items]}];

  const result: ConversationActivityPart[] = [];
  for (const item of items) {
    const task = item.type === "mcp-tool-call" ? resolveMcpTask(item,hostId) : null;
    if (task != null) {
      result.push({type:"result",result:task});
      continue;
    }
    const previous=result[result.length-1];
    if (previous?.type === "activity" && previous.items != null)
      previous.items.push(item);
    else result.push({type:"activity",items:[item]});
  }
  return result;
}
