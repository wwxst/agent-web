export * from "./conversation/ActiveToolActivityLabel.js";
export * from "./conversation/TurnEntriesModel.js";

export { splitTurnItemsIntoRenderGroups } from "./conversation/TurnItemRenderGroups.js";
export type { Dependencies as TurnItemRenderGroupDependencies, RenderGroups as TurnItemRenderGroups, TurnStatus, RenderMode } from "./conversation/TurnItemRenderGroups.js";

export { expandTurnIntoTranscriptEntries } from "./conversation/TranscriptEntryExpansion.js";
export type { TurnExpansionOptions, TurnExpansionDependencies, TranscriptEntry, TranscriptBlock } from "./conversation/TranscriptEntryExpansion.js";

export { classifyActivityItem, normalizeToolApprovalReviews } from "./conversation/ActivityGroupingModel.js";
export type { ActivityItem, ActivityGrouping, ClassifiedActivity, ActivityGroupingDependencies, DynamicToolPresentation } from "./conversation/ActivityGroupingModel.js";

export { buildStaticThreadTranscriptModel, shouldInitiallyCollapseWorkGroup, getVisibleWorkGroupItems, findLastUserMessageEntryIndex } from "./conversation/StaticThreadTranscriptModel.js";
export type { SharedSnapshot, SnapshotTurn, SnapshotItem, SnapshotRenderEntry, SnapshotTurnRenderModel, StaticThreadTranscriptModel, SnapshotMessage, SnapshotFileChange, SnapshotWorkEntry } from "./conversation/StaticThreadTranscriptModel.js";

export {
  coalesceAdjacentVoiceItems,
  findTranscriptTailFlushTurnIds,
  getEntrySourceTurnId,
  getEntrySourceTurnIdWithPredicate,
  isBemLifecycleRecord,
  markMostRecentTurn,
  reconcileProjectedTimeline,
} from './conversation/LiveTimelineMerge.js';
export type { LiveEntry, VoiceBlock, VoiceItem, VoiceItemBlock } from './conversation/LiveTimelineMerge.js';
export { attachHistorySource, getVoiceSubagentThreadIds, projectLiveVoiceBlocks } from './conversation/LiveVoiceBlockProjection.js';
export type { VoiceTimelineBlock, VoiceTimelineEntry, VoiceTurn, VoiceProjectionAdapters, VoiceProjectionContext } from './conversation/LiveVoiceBlockProjection.js';
export { buildLiveConversationTimeline } from './conversation/LiveConversationTimelineCoordinator.js';
export type { TimelineTurn, LiveTimelineHistory, LiveTimelineOptions } from './conversation/LiveConversationTimelineCoordinator.js';
export { initialFollowState, reduceFollowState, inferLiveTurnPhase, readLatestTurnStatus, isStaticOrWatchingFollowMode, responseSpacerOverflow, serializeViewportFollow } from './conversation/LiveViewportFollowState.js';
export type { FollowMode, FollowState, FollowEvent, TurnPhase } from './conversation/LiveViewportFollowState.js';

export {
  DEFAULT_ESTIMATED_ROW_HEIGHT_PX,
  DEFAULT_VIRTUALIZER_OVERSCAN_COUNT,
  DEFAULT_TURN_SCROLL_MARGIN_PX,
  buildThreadVirtualizerLayout,
  getVisibleThreadRange,
  reanchorThreadRange,
  adjustDistanceFromBottomForLayoutChange,
  getDistanceToCenterTurn,
  getDistanceToTurn,
  findVisibleMeasuredAnchor,
  captureRenderedWindow,
  isThreadRangeContained,
} from "./conversation/ThreadVirtualizerModel.js";
export type {
  ThreadVirtualizerEntry,
  ThreadVirtualizerLayout,
  ThreadVirtualizerRange,
  BuildThreadVirtualizerLayoutOptions,
} from "./conversation/ThreadVirtualizerModel.js";

export { buildConversationRenderEntries } from "./conversation/ConversationRenderEntriesModel.js";
export type { ConversationRenderEntry, ConversationRenderProjectionOptions, ConversationRenderProjectionDependencies, ConversationRenderProjectionResult, TimestampEvent } from "./conversation/ConversationRenderEntriesModel.js";

export { createLiveConversationSource, acceptLiveConversationUpdate } from "./conversation/LiveConversationSource.js";
export type { LiveConversationSource, LiveConversationSnapshot } from "./conversation/LiveConversationSource.js";

export { buildConversationMessageRenderPlan, getLastAssistantBlockKey, isConversationMessageBlock } from "./conversation/ConversationMessageRenderPlan.js";
export type { ConversationMessageItem, ConversationActivityPart, ConversationTranscriptBlock, ConversationMessageRenderNode, ConversationMessageRenderPlan, ConversationMessagePlanOptions, ConversationMessagePlanDependencies } from "./conversation/ConversationMessageRenderPlan.js";

export * from "./conversation/ConversationMarkdownPresentation.js";
export * from "./conversation/InlineFileReviewModel.js";
export * from "./conversation/ActivityStatusPresentation.js";

export * from "./conversation/ConversationPresentationAdapterModel.js";

export { projectNavigationDestinations } from "./conversation/NavigationRailModel.js";
export type { NavigationDestination, NavigationProjection, NavigationProjectionOptions } from "./conversation/NavigationRailModel.js";

export { getAgentActivityCollapseEligibility, projectAgentActivityCollapse } from "./conversation/AgentActivityProjection.js";
export type { AgentActivityItem, AgentActivityUnit, AgentActivityPersistenceAdapters, AgentActivityCollapseOptions, AgentActivityCollapseProjection } from "./conversation/AgentActivityProjection.js";

export { isUnfinishedGroupItem, isActiveGroupMember, isExplorationCommand, projectActivityGroupHeader, getActiveActivityHeaderLabel, projectCompletedGroupHeaderParts, shouldDemoteCompletedSingleGroup } from "./conversation/AgentActivityGroupPresentation.js";
export type { GroupActivityItem, ActivityGroupHeaderState, ActivityGroupStateOptions, ActivityHeaderMessage, ActivityHeaderLabel, ToolActivitySummary, CompletedGroupHeaderPart } from "./conversation/AgentActivityGroupPresentation.js";

// Source-derived aggregation of normalized Le/Be/Ve activity units.
export { aggregateAgentActivityUnits } from "./conversation/AgentActivityAggregate.js";
export type { AggregateUnit, ActivityAggregate, ReviewFailure, SourceDescriptor, VisualizationKind } from "./conversation/AgentActivityAggregate.js";

export * from "./conversation/AgentActivityRawClassifier.js";

export * from "./conversation/ToolActivityDetailModel.js";

export * from "./conversation/ToolActivityHistoryHydrationModel.js";

export * from "./conversation/ToolActivityHistorySourceTransforms.js";
