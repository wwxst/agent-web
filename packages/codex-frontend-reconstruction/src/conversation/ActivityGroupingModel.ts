/**
 * Semantic reconstruction of the activity-item classifier exported by:
 * frontend/webview/assets/agent-activity-item-1be092f0c744.js
 *
 * The compiled module's private predicates/renderers are explicit adapters.
 * This module models classification and grouping, not the React row renderer.
 */
export type ActivityItem = Record<string, any> & { type: string };
export type ActivityGrouping = "standalone" | "groupable";

export interface ClassifiedActivity {
  item: ActivityItem;
  grouping: ActivityGrouping;
}

export interface DynamicToolPresentation {
  hiddenInConversation?: boolean;
  standaloneInConversation?: boolean;
}

export interface ActivityGroupingDependencies {
  isExecOrPatchStandalone(item: ActivityItem): boolean;
  isMcpToolCallStandalone(item: ActivityItem): boolean;
  isMcpAppToolCall(item: ActivityItem, mcpServerStatuses?: unknown): boolean;
  getDynamicToolPresentation(item: ActivityItem): DynamicToolPresentation | null;
  hasSpecialLegacyFormProperty(property: unknown): boolean;
}

function normalizeAutomaticApprovalReviews(item: ActivityItem): ActivityItem {
  const reviews = item.automaticApprovalReviews as ActivityItem[] | undefined;
  if (reviews == null) return item;
  const nonApproved = reviews.filter((review) => review.status !== "approved");
  if (nonApproved.length > 0 && nonApproved.length === reviews.length) return item;

  const { automaticApprovalReviews: _discarded, ...withoutReviews } = item;
  return nonApproved.length === 0
    ? withoutReviews
    : { ...withoutReviews, automaticApprovalReviews: nonApproved };
}

function standalone(item: ActivityItem): ClassifiedActivity {
  return { item, grouping: "standalone" };
}
function groupable(item: ActivityItem): ClassifiedActivity {
  return { item, grouping: "groupable" };
}

/**
 * Mirrors the observed item-type switch. A null result means the item is not
 * represented as an activity row by this classifier.
 */
export function classifyActivityItem(
  item: ActivityItem,
  options: {
    dynamicToolPresentation?: DynamicToolPresentation | null;
    includeGeneratedImages?: boolean;
    mcpServerStatuses?: unknown;
  },
  deps: ActivityGroupingDependencies,
): ClassifiedActivity | null {
  switch (item.type) {
    case "external-event":
      return groupable(item);

    case "exec":
    case "patch":
      return deps.isExecOrPatchStandalone(item) ? standalone(item) : groupable(item);

    case "mcp-tool-call": {
      const normalized = normalizeAutomaticApprovalReviews(item);
      return deps.isMcpToolCallStandalone(item) ||
        deps.isMcpAppToolCall(item, options.mcpServerStatuses)
        ? standalone(normalized)
        : groupable(normalized);
    }

    case "web-search":
      return typeof item.query === "string" && item.query.trim().length > 0
        ? groupable(item)
        : null;

    case "dynamic-tool-call": {
      const presentation =
        options.dynamicToolPresentation ?? deps.getDynamicToolPresentation(item);
      if (presentation?.hiddenInConversation === true) return null;
      return presentation?.standaloneInConversation === true
        ? standalone(item)
        : groupable(item);
    }

    case "generated-image":
      return options.includeGeneratedImages === true ? standalone(item) : null;

    case "image-view":
      return standalone(item);

    case "mcp-server-elicitation": {
      if (
        item.completed !== true ||
        item.elicitation?.kind === "unsupportedOpenAIForm"
      ) return null;

      const legacyFormNeedsGrouping =
        item.elicitation?.kind === "legacyOpenAIForm" &&
        Object.values(item.elicitation?.schema?.properties ?? {}).some(
          deps.hasSpecialLegacyFormProperty,
        );
      return legacyFormNeedsGrouping ? groupable(item) : standalone(item);
    }

    case "automatic-approval-review":
      if (item.status === "approved") return null;
      if (item.status === "inProgress") return groupable(item);
      if (["aborted", "denied", "timedOut"].includes(item.status)) return standalone(item);
      return null;

    case "dil-reasoning":
    case "assistant-message":
    case "auto-review-interruption-warning":
    case "context-compaction":
    case "multi-agent-action":
    case "realtime-transcript":
    case "stream-error":
    case "strict-review-notice":
    case "subagent-activity":
    case "system-error":
    case "user-input-response":
    case "user-message":
    case "worked-for":
    case "worktree-init":
      return standalone(item);

    case "reasoning":
    case "automation-update":
    case "forked-from-conversation":
    case "model-changed":
    case "model-rerouted":
    case "permission-request":
    case "personality-changed":
    case "plan-implementation":
    case "proposed-plan":
    case "remote-task-created":
    case "todo-list":
    case "turn-diff":
    case "userInput":
    case "steered":
      return null;

    default:
      return null;
  }
}

/**
 * Reconstructs the private `pr` normalization observed before MCP tool rows
 * are returned. Exported for unit testing and reuse by adapters.
 */
export function normalizeToolApprovalReviews(item: ActivityItem): ActivityItem {
  return normalizeAutomaticApprovalReviews(item);
}
