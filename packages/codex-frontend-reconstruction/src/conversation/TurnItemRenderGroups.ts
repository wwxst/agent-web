/**
 * Semantic reconstruction of:
 * frontend/webview/assets/split-items-into-render-groups-9b11d88dce52.js
 *
 * Private helpers are injected through Dependencies rather than guessed.
 * This is an independently written typed model, not the author's original source.
 */
export type TurnItem = Record<string, any> & { type: string; id?: string };
export type TurnStatus = "in_progress" | "complete" | "failed" | "cancelled" | string;
export type RenderMode = "latest" | "all" | string;

export interface Dependencies {
  isAutomationNamespaceTool(namespace: string, tool: string): boolean;
  parseUpNextStatus(args: unknown): unknown;
  getCloudAutomation(item: TurnItem, resolvedApps: unknown): Record<string, any> | null;
  getActivityMetadata(item: TurnItem): { grouping?: string } | null;
  canGroupActivityWithNext(item: TurnItem, next: TurnItem | undefined): boolean;
  excludeFinalAssistant?(item: TurnItem): boolean;
  areEqual?(a: unknown, b: unknown): boolean;
  areConnectorsEqual?(a: unknown, b: unknown): boolean;
  getAutomationUpdateKey?(item: TurnItem): string | undefined;
}

export interface RenderGroups {
  userItems: TurnItem[];
  agentItems: TurnItem[];
  toolGroupStartItems: Set<TurnItem>;
  upNextStatusItem: { type: "up-next-status"; content: unknown } | null;
  automationUpdateItems: TurnItem[];
  cloudAutomationItems: Array<{ callId: string; automation: Record<string, any> }>;
  toolOutputItems: TurnItem[];
  postAssistantItems: TurnItem[];
  systemEventItem: TurnItem | null;
  unifiedDiffItem: TurnItem | null;
  remoteTaskCreatedItems: TurnItem[];
  personalityChangedItems: TurnItem[];
  forkedFromConversationItems: TurnItem[];
  modelChangedItems: TurnItem[];
  modelReroutedItems: TurnItem[];
  subagentActivityItemGroups: TurnItem[][];
  todoListItem: TurnItem | null;
  proposedPlanItem: TurnItem | null;
  planImplementationItem: TurnItem | null;
  mcpServerElicitationItems: TurnItem[];
  permissionRequestItems: TurnItem[];
  approvalItem: TurnItem | null;
  userInputItem: TurnItem | null;
  assistantItem: TurnItem | null;
  currentCommentaryItem: TurnItem | null;
}

const hasContent = (item: TurnItem) =>
  (typeof item.content === "string" && item.content.trim().length > 0) ||
  item.isSkippedCompletion === true ||
  item.structuredOutput != null;

const isFinalAssistant = (item: TurnItem | undefined, exclude?: (item: TurnItem) => boolean) =>
  item?.type === "assistant-message" &&
  item.delivery !== "async" &&
  item.requestUserInputAsync == null &&
  exclude?.(item) !== true;

const isPendingPatchApproval = (item: TurnItem) =>
  item.type === "patch" && item.approvalRequestId != null && item.success == null;

const isPendingExecApproval = (item: TurnItem) =>
  item.type === "exec" && item.approvalRequestId != null && item.output?.exitCode === undefined;

const isImageGenLimitFailure = (item: TurnItem) =>
  item.type === "generated-image" &&
  item.failure?.type === "usageLimitExceeded" &&
  item.failure.limitId === "image_gen";

function approvalTargetId(item: TurnItem): string | null {
  if (item.type === "exec") return item.commandExecutionItemId ?? item.callId ?? null;
  if (item.type === "patch" || item.type === "mcp-tool-call") return item.callId ?? null;
  return null;
}

function attachAutomaticApprovalReviews(items: TurnItem[]): TurnItem[] {
  const typeById = new Map<string, string>();
  for (const item of items) {
    if (!["exec", "patch", "mcp-tool-call"].includes(item.type)) continue;
    const id = approvalTargetId(item);
    if (id != null) typeById.set(id, item.type);
  }
  const consumed = new Set<string>();
  const byTarget = new Map<string, TurnItem[]>();
  for (const item of items) {
    if (item.type !== "automatic-approval-review" || typeof item.targetItemId !== "string") continue;
    const targetId: string = item.targetItemId;
    const targetType = typeById.get(targetId);
    if (targetType == null || (item.status === "denied" && targetType === "mcp-tool-call")) continue;
    if (typeof item.id === "string") consumed.add(item.id);
    byTarget.set(targetId, [...(byTarget.get(targetId) ?? []), item]);
  }
  return items.flatMap((item) => {
    if (item.type === "automatic-approval-review" && typeof item.id === "string" && consumed.has(item.id)) return [];
    const id = approvalTargetId(item);
    const reviews = id == null ? undefined : byTarget.get(id);
    return reviews == null ? [item] : [{ ...item, automaticApprovalReviews: reviews }];
  });
}

function extractTrailingReviews(items: TurnItem[]): TurnItem[] {
  const result: TurnItem[] = [];
  while (items.at(-1)?.type === "automatic-approval-review") result.push(items.pop()!);
  return result.reverse();
}

function elicitationKey(item: TurnItem): string | null {
  const value = item.elicitation;
  if (value == null) return null;
  switch (value.kind) {
    case "userVerification":
    case "browserAuth":
    case "formElicitation":
    case "openaiForm":
    case "legacyOpenAIForm":
    case "generic":
    case "urlAction":
      return typeof value.serverName === "string" ? value.serverName.trim() || null : null;
    case "mcpToolCall": return value.approval?.connector_id ?? null;
    case "connectorAuth": return value.connector?.connector_id ?? null;
    default: return null;
  }
}

function dedupeElicitations(items: TurnItem[], deps: Dependencies): TurnItem[] {
  const result: TurnItem[] = [];
  for (const item of items) {
    const duplicate = result.some((prior) => {
      if (prior.requestId !== item.requestId) return false;
      const a = prior.elicitation ?? {};
      const b = item.elicitation ?? {};
      if (a.kind === "connectorAuth" && b.kind === "connectorAuth") {
        return (deps.areConnectorsEqual ?? deps.areEqual ?? Object.is)(a.connector, b.connector);
      }
      const sameKindFamily = new Set([
        "userVerification", "browserAuth", "formElicitation", "openaiForm",
        "legacyOpenAIForm", "generic", "urlAction",
      ]);
      return sameKindFamily.has(a.kind) && sameKindFamily.has(b.kind);
    });
    if (!duplicate) result.push(item);
  }
  return result;
}

function dedupeAutomationUpdates(items: TurnItem[], keyOf: (item: TurnItem) => string | undefined) {
  const seen = new Set<string | undefined>();
  const result: TurnItem[] = [];
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i]!;
    const key = keyOf(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result.reverse();
}

/**
 * Splits raw turn items into the semantic groups consumed by the transcript UI.
 * `mode === "latest"` applies the live-turn filtering and commentary behavior.
 */
export function splitTurnItemsIntoRenderGroups(
  items: TurnItem[],
  status: TurnStatus,
  mode: RenderMode,
  isFinalAssistantExcluded: ((item: TurnItem) => boolean) | undefined,
  resolvedApps: unknown,
  deps: Dependencies,
): RenderGroups {
  const userItems: TurnItem[] = [];
  const rawAgentItems: TurnItem[] = [];
  const toolGroupStartItems = new Set<TurnItem>();
  const toolOutputItems: TurnItem[] = [];
  const automationUpdates: TurnItem[] = [];
  const cloudAutomationItems: RenderGroups["cloudAutomationItems"] = [];
  const postAssistantItems: TurnItem[] = [];
  const remoteTaskCreatedItems: TurnItem[] = [];
  const personalityChangedItems: TurnItem[] = [];
  const forkedFromConversationItems: TurnItem[] = [];
  const modelChangedItems: TurnItem[] = [];
  const modelReroutedItems: TurnItem[] = [];
  const subagentActivityItemGroups: TurnItem[][] = [];
  const mcpServerElicitationItems: TurnItem[] = [];
  const permissionRequestItems: TurnItem[] = [];
  const commentaryItems = new Set<TurnItem>();
  const elicitationServers = new Set<string>();

  let unifiedDiffItem: TurnItem | null = null;
  let todoListItem: TurnItem | null = null;
  let proposedPlanItem: TurnItem | null = null;
  let planImplementationItem: TurnItem | null = null;
  let approvalItem: TurnItem | null = null;
  let userInputItem: TurnItem | null = null;
  let upNextStatusItem: RenderGroups["upNextStatusItem"] = null;
  let currentCommentaryItem: TurnItem | null = null;
  let lastWasNonMessageSubagent = false;
  let passedInitialWorktreeInit = false;

  for (const item of items) {
    const isNonMessageSubagent = item.type === "subagent-activity" && !item.isMessage;
    const beginsSubagentGroup = isNonMessageSubagent && !lastWasNonMessageSubagent;
    lastWasNonMessageSubagent = isNonMessageSubagent;

    if (item.type === "user-message" && item.heartbeatTrigger != null) {
      userItems.push(item);
      continue;
    }
    if (!passedInitialWorktreeInit && item.type === "user-message") {
      userItems.push(item);
      continue;
    }
    passedInitialWorktreeInit ||= item.type !== "worktree-init";

    if (mode === "latest") {
      if (
        item.type === "dynamic-tool-call" &&
        deps.isAutomationNamespaceTool(item.namespace, item.tool) &&
        item.completed &&
        item.success === true
      ) {
        const content = deps.parseUpNextStatus(item.arguments);
        if (content !== undefined) {
          upNextStatusItem = content == null ? null : { type: "up-next-status", content };
          currentCommentaryItem = null;
        }
      }
      if (item.type === "assistant-message") {
        const visible = hasContent(item);
        if (item.phase === "commentary" && item.delivery !== "async" && item.requestUserInputAsync == null) {
          rawAgentItems.push(item);
          commentaryItems.add(item);
          if (!item.completed || visible) currentCommentaryItem = item;
          continue;
        }
        if (
          item.delivery === "async" ||
          item.requestUserInputAsync != null ||
          (item.phase === "final_answer" && visible)
        ) currentCommentaryItem = null;
      } else if (
        (item.type === "user-message" && item.deliveryStatus !== "not-sent" &&
          item.hookFeedback !== true && item.heartbeatTrigger == null && item.codexDelegation == null) ||
        (item.type === "realtime-transcript" && item.entries?.some((entry: any) => entry.role === "user"))
      ) {
        upNextStatusItem = null;
        currentCommentaryItem = null;
      }
    }

    if (item.type === "turn-diff") unifiedDiffItem = item;
    if (item.type === "todo-list") todoListItem = item;
    if (item.type === "proposed-plan") { proposedPlanItem = item; continue; }
    if (item.type === "remote-task-created") remoteTaskCreatedItems.push(item);
    if (item.type === "personality-changed") personalityChangedItems.push(item);
    if (item.type === "forked-from-conversation") forkedFromConversationItems.push(item);
    if (item.type === "model-changed") { modelChangedItems.push(item); continue; }
    if (item.type === "model-rerouted") { modelReroutedItems.push(item); continue; }
    if (item.type === "plan-implementation") { planImplementationItem = item; continue; }

    if (item.type === "mcp-server-elicitation") {
      if (item.completed === true) {
        if (item.elicitation?.kind !== "unsupportedOpenAIForm") rawAgentItems.push(item);
        continue;
      }
      const key = elicitationKey(item);
      if (key != null) elicitationServers.add(key);
      mcpServerElicitationItems.push(item);
      continue;
    }
    if (item.type === "permission-request") { permissionRequestItems.push(item); continue; }
    if (isPendingPatchApproval(item) || isPendingExecApproval(item)) { approvalItem = item; continue; }
    if (item.type === "userInput" && item.completed !== true) { userInputItem = item; continue; }
    if (item.type === "user-message") { rawAgentItems.push(item); continue; }

    if (item.type === "generated-image") {
      const limitFailure = isImageGenLimitFailure(item);
      if (!limitFailure) toolOutputItems.push(item);
      if (status === "in_progress" || limitFailure) rawAgentItems.push(item);
      continue;
    }
    if (item.type === "mcp-tool-call") {
      const automation = deps.getCloudAutomation(item, resolvedApps);
      if (automation?.type === "chatgpt-automation") {
        cloudAutomationItems.push({ callId: item.callId, automation });
        continue;
      }
    }
    if (item.type === "automation-update") { automationUpdates.push(item); continue; }
    if (item.type === "auto-review-interruption-warning") { postAssistantItems.push(item); continue; }

    if (item.type === "subagent-activity") {
      if (item.isMessage) rawAgentItems.push(item);
      else if (beginsSubagentGroup) {
        rawAgentItems.push(item);
        subagentActivityItemGroups.push([item]);
      } else subagentActivityItemGroups.at(-1)?.push(item);
      continue;
    }

    if (
      item.type === "reasoning" ||
      item.type === "automatic-approval-review" ||
      deps.getActivityMetadata(item) != null
    ) rawAgentItems.push(item);
  }

  let agentItems = attachAutomaticApprovalReviews(rawAgentItems);
  const trailingReviews = mode === "latest" ? [] : extractTrailingReviews(agentItems);

  if (mode === "latest") {
    let inCommentaryRun = false;
    agentItems = agentItems.filter((item, index) => {
      if (commentaryItems.has(item)) {
        inCommentaryRun = true;
        return item === currentCommentaryItem;
      }
      if (item.type === "mcp-tool-call" && !item.completed && elicitationServers.has(item.invocation?.server)) return false;
      if (
        inCommentaryRun &&
        deps.getActivityMetadata(item)?.grouping === "groupable" &&
        !deps.canGroupActivityWithNext(item, agentItems[index + 1])
      ) {
        toolGroupStartItems.add(item);
        inCommentaryRun = false;
      }
      return true;
    });
    trailingReviews.push(...extractTrailingReviews(agentItems));
  }

  let candidateIndex = agentItems.length - 1;
  while (agentItems[candidateIndex]?.type === "mcp-server-elicitation") candidateIndex--;
  if (!isFinalAssistant(agentItems[candidateIndex], isFinalAssistantExcluded)) {
    let cursor = candidateIndex;
    for (;;) {
      const candidate = agentItems[cursor];
      if (
        candidate?.type !== "mcp-server-elicitation" &&
        candidate?.type !== "subagent-activity" &&
        !(candidate?.type === "user-message" && candidate.steeringStatus === "accepted" && candidate.codexDelegation != null) &&
        !isImageGenLimitFailure(candidate ?? { type: "" }) &&
        !(candidate?.type === "reasoning" && candidate.completed) &&
        !(candidate?.type === "exec" && status === "complete" && candidate.parsedCmd?.isFinished) &&
        !(candidate?.type === "dynamic-tool-call" && status === "complete" && candidate.completed)
      ) break;
      cursor--;
    }
    const possibleFinal = agentItems[cursor];
    if (possibleFinal != null && isFinalAssistant(possibleFinal, isFinalAssistantExcluded) && possibleFinal.phase === "final_answer") candidateIndex = cursor;
  }

  let assistantItem = isFinalAssistant(agentItems[candidateIndex], isFinalAssistantExcluded)
    ? agentItems[candidateIndex]!
    : null;
  const assistantHasContent = assistantItem != null && hasContent(assistantItem);

  if (assistantItem != null) {
    for (const item of agentItems.splice(candidateIndex + 1)) {
      if (item.type === "user-message") postAssistantItems.push(item);
      else agentItems.push(item);
    }
    agentItems.splice(candidateIndex, 1);
    const previous = agentItems[candidateIndex - 1];
    if (
      assistantItem.phase === "final_answer" &&
      previous?.type === "assistant-message" &&
      previous.phase === "final_answer" &&
      previous.searchItemId != null &&
      previous.searchItemId === assistantItem.searchItemId &&
      (deps.areEqual ?? Object.is)(previous, assistantItem)
    ) agentItems.splice(candidateIndex - 1, 1);
    postAssistantItems.push(...trailingReviews);
  } else agentItems.push(...trailingReviews);

  if (postAssistantItems.length > 1) {
    const set = new Set(postAssistantItems);
    postAssistantItems.splice(0, postAssistantItems.length, ...items.filter((item) => set.has(item)));
  }

  let systemEventItem: TurnItem | null = null;
  if (status !== "in_progress" && !assistantHasContent && agentItems.at(-1)?.type === "system-error") {
    systemEventItem = agentItems.pop() ?? null;
  }

  const getUpdateKey = deps.getAutomationUpdateKey ??
    ((item: TurnItem) => item.result?.automationId ?? item.arguments?.id ?? item.callId);
  const uniqueAutomationUpdates = dedupeAutomationUpdates(automationUpdates, getUpdateKey);
  const originalAssistantItem = assistantItem;
  if (assistantItem?.completed && uniqueAutomationUpdates.length > 0) {
    assistantItem = { ...assistantItem, automationCitations: uniqueAutomationUpdates };
  }

  return {
    userItems,
    agentItems,
    toolGroupStartItems,
    upNextStatusItem: mode === "latest" && status === "in_progress" ? upNextStatusItem : null,
    automationUpdateItems: assistantItem == null ? uniqueAutomationUpdates : [],
    cloudAutomationItems,
    toolOutputItems,
    postAssistantItems,
    systemEventItem,
    unifiedDiffItem,
    remoteTaskCreatedItems,
    personalityChangedItems,
    forkedFromConversationItems,
    modelChangedItems,
    modelReroutedItems,
    subagentActivityItemGroups,
    todoListItem,
    proposedPlanItem,
    planImplementationItem,
    mcpServerElicitationItems: dedupeElicitations(mcpServerElicitationItems, deps),
    permissionRequestItems,
    approvalItem,
    userInputItem,
    assistantItem,
    currentCommentaryItem: currentCommentaryItem === originalAssistantItem ? assistantItem : currentCommentaryItem,
  };
}
