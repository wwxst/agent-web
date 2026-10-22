import {
  getToolActivityHistoryItemId,
  type ToolItem,
} from "./ToolActivityDetailModel.js";
import { convertMcpToolCallHistoryEntity } from "./ToolActivityExternalMessageConversion.js";
import {
  extractImageGenerationFailure,
  formatMcpToolResult,
  formatReasoningSummary,
  isCodexAppMessageTool,
  mapHistoryFileChanges,
  normalizeAssistantHistoryContent,
} from "./ToolActivityHistorySourceTransforms.js";

export type ToolActivityHistoryEntity = Record<string, unknown> & { type: string };

export interface ToolActivityHistoryQueryContext {
  hostId: string;
  conversationId: string;
  historyEntityKey?: string | null | undefined;
  isReadOnly?: boolean | undefined;
}
export interface ToolActivityHistoryEntityQuery {
  hostId: string; threadId: string; entityKey: string; itemId: string;
}
export interface ToolActivityHistoryQueryPlan {
  historyEntity: ToolActivityHistoryEntityQuery;
  assistantMessageEntity: ToolActivityHistoryEntityQuery | null;
}

/** Mirrors LO's bypass rules before entering zO. */
export function buildToolActivityHistoryQueryPlan(
  item: ToolItem, context: ToolActivityHistoryQueryContext,
): ToolActivityHistoryQueryPlan | null {
  const entityKey = context.historyEntityKey;
  const itemId = getToolActivityHistoryItemId(item);
  if (entityKey == null || itemId == null) return null;
  if (context.isReadOnly === true && item.type === "assistant-message" &&
      (item.delivery === "async" || item.requestUserInputAsync != null)) return null;
  const query: ToolActivityHistoryEntityQuery = {
    hostId: context.hostId, threadId: context.conversationId, entityKey, itemId,
  };
  return {
    historyEntity: query,
    assistantMessageEntity: item.type === "assistant-message" ? query : null,
  };
}

export interface ToolActivityHistoryHydrationContext {
  isTurnInProgress?: boolean | undefined;
  isHeartbeatAutomationRequest?: boolean | undefined;
  isHeartbeatAutomationTurn?: boolean | undefined;
  assistantCopyText?: string | null | undefined;
  allowAssistantCopyWhileStreaming?: boolean | undefined;
}
export interface PreparedAssistantHistoryContent extends Record<string, unknown> {
  hidden?: unknown;
  artifactScanContent?: unknown;
}

/** Private helper functions remain explicit host adapters rather than guesses. */
export interface ToolActivityHistoryHydrationDependencies {
  prepareAssistantContent(args: {
    content: unknown; phase: unknown; isStreaming: boolean;
    isHeartbeatAutomationTurn: boolean; isHeartbeatAutomationRequest: boolean;
  }): PreparedAssistantHistoryContent;
  reasoningSummaryToText(summary: unknown): string;
  convertMcpToolCall(entity: ToolActivityHistoryEntity): ToolItem | null | undefined;
  mapFileChanges(changes: unknown): unknown;
  imageGenerationFailure(entity: ToolActivityHistoryEntity): unknown;
  isMcpAppToolCall(server: unknown, appContext: unknown): boolean;
  formatMcpResult(result: unknown, error: unknown, status: unknown): unknown;
}
/** Source-recovered defaults; only the specialized MCP-to-external-message conversion remains host-injected. */
export function createSourceToolActivityHistoryDependencies(
  convertMcpToolCall: ToolActivityHistoryHydrationDependencies["convertMcpToolCall"] = convertMcpToolCallHistoryEntity,
): ToolActivityHistoryHydrationDependencies {
  return {
    prepareAssistantContent: normalizeAssistantHistoryContent,
    reasoningSummaryToText: formatReasoningSummary,
    convertMcpToolCall,
    mapFileChanges: mapHistoryFileChanges,
    imageGenerationFailure: extractImageGenerationFailure,
    isMcpAppToolCall: isCodexAppMessageTool,
    formatMcpResult: formatMcpToolResult,
  };
}

export interface ToolActivityHistoryHydrationResult {
  item: ToolItem | null;
  assistantCopyText: string | null | undefined;
  hiddenByAssistantContent: boolean;
}

export interface ToolActivityHistoryHydrationInput {
  historyEntity: ToolActivityHistoryEntity | null | undefined;
  assistantMessageEntity?: ToolActivityHistoryEntity | null | undefined;
  context: ToolActivityHistoryHydrationContext;
  dependencies: ToolActivityHistoryHydrationDependencies;
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function fallbackQuestionContent(item: ToolItem, entity: ToolActivityHistoryEntity): unknown {
  const request = isRecord(item.requestUserInputAsync) ? item.requestUserInputAsync : null;
  const questionIndex = request?.questionIndex;
  if (questionIndex == null) return entity.text;
  const questions = entity.questions;
  const question = Array.isArray(questions)
    ? questions[questionIndex as number]
    : isRecord(questions) ? questions[String(questionIndex)] : undefined;
  return (isRecord(question) ? question.title : undefined) ?? item.content;
}

/**
 * Reconciles a current transcript item with its canonical history entity.
 * Models the type-specific zO transforms and SO copy-text selection without I/O.
 */
export function hydrateToolActivityItemFromHistory(
  item: ToolItem,
  historyEntity: ToolActivityHistoryEntity | null | undefined,
  assistantMessageEntity: ToolActivityHistoryEntity | null | undefined,
  context: ToolActivityHistoryHydrationContext,
  dependencies: ToolActivityHistoryHydrationDependencies,
): ToolActivityHistoryHydrationResult {
  let hydrated: ToolItem = item;

  if (item.type === "assistant-message" && historyEntity?.type === "agentMessage") {
    const isStreaming = Boolean(context.isTurnInProgress) &&
      !item.completed && !assistantMessageEntity;
    const selectedContent = fallbackQuestionContent(item, historyEntity);
    const { hidden, artifactScanContent: _artifactScanContent, ...contentFields } =
      dependencies.prepareAssistantContent({
        content: selectedContent, phase: historyEntity.phase, isStreaming,
        isHeartbeatAutomationTurn: context.isHeartbeatAutomationTurn === true,
        isHeartbeatAutomationRequest: context.isHeartbeatAutomationRequest === true,
      });
    if (hidden) {
      return { item: null, assistantCopyText: undefined, hiddenByAssistantContent: true };
    }
    hydrated = {
      ...item, ...contentFields,
      memoryCitation: historyEntity.memoryCitation ?? undefined,
      phase: historyEntity.phase,
    };
  } else if (item.type === "assistant-message" && item.externalDelivery != null &&
      historyEntity?.type === "mcpToolCall") {
    hydrated = dependencies.convertMcpToolCall(historyEntity) ?? item;
  } else if (item.type === "reasoning" && historyEntity?.type === "reasoning") {
    hydrated = { ...item, content: dependencies.reasoningSummaryToText(historyEntity.summary) };
  } else if (item.type === "proposed-plan" && historyEntity?.type === "plan") {
    hydrated = { ...item, content: historyEntity.text };
  } else if (item.type === "exec" && historyEntity?.type === "commandExecution") {
    const executionStatus = item.executionStatus === "interrupted" &&
      historyEntity.status === "inProgress" ? "interrupted" : historyEntity.status;
    const parsedCommand = isRecord(item.parsedCmd) ? item.parsedCmd : {};
    const hasOutput = historyEntity.aggregatedOutput != null || historyEntity.exitCode != null;
    hydrated = {
      ...item,
      durationMs: historyEntity.durationMs ?? undefined,
      executionStatus,
      parsedCmd: { ...parsedCommand, isFinished: executionStatus !== "inProgress" },
      processId: historyEntity.processId ?? undefined,
      output: hasOutput ? {
        aggregatedOutput: historyEntity.aggregatedOutput ?? "",
        exitCode: historyEntity.exitCode ?? undefined,
      } : null,
    };
  } else if (item.type === "patch" && historyEntity?.type === "fileChange") {
    hydrated = {
      ...item, status: historyEntity.status,
      changes: dependencies.mapFileChanges(historyEntity.changes),
      success: historyEntity.status === "inProgress" ? null : historyEntity.status === "completed",
    };
  } else if (item.type === "generated-image" && historyEntity?.type === "imageGeneration") {
    hydrated = {
      ...item, src: historyEntity.src, status: historyEntity.status,
      failure: dependencies.imageGenerationFailure(historyEntity),
    };
  } else if (item.type === "mcp-tool-call" && historyEntity?.type === "mcpToolCall") {
    const converted = dependencies.isMcpAppToolCall(historyEntity.server, historyEntity.appContext)
      ? null : dependencies.convertMcpToolCall(historyEntity);
    hydrated = converted ?? {
      ...item,
      completed: historyEntity.status !== "inProgress" || !context.isTurnInProgress,
      durationMs: historyEntity.durationMs,
      result: dependencies.formatMcpResult(historyEntity.result, historyEntity.error, historyEntity.status),
    };
  } else if (item.type === "dynamic-tool-call" && historyEntity?.type === "dynamicToolCall") {
    hydrated = {
      ...item,
      completed: historyEntity.status === "completed" || historyEntity.status === "failed",
      contentItems: historyEntity.contentItems, success: historyEntity.success,
    };
  }

  let assistantCopyText = context.assistantCopyText;
  if (hydrated.type === "assistant-message" &&
      (context.assistantCopyText != null || context.allowAssistantCopyWhileStreaming === true) &&
      typeof hydrated.content === "string") assistantCopyText = hydrated.content.trim();
  return { item: hydrated, assistantCopyText, hiddenByAssistantContent: false };
}
