import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  createConnectedConversationMessageRenderers,
  type ConnectedConversationRendererHost,
} from "../src/components/ConnectedConversationMessageRenderers.js";
import { createConversationLiveRow } from "../src/components/ConversationMessageBlocks.js";
import type { ConversationMessageItem, ConversationMessagePlanDependencies } from "../src/conversation/ConversationMessageRenderPlan.js";
import type { ConversationRenderProjectionDependencies } from "../src/conversation/ConversationRenderEntriesModel.js";
import type { InlineFileReviewAction, InlineReviewFile } from "../src/conversation/InlineFileReviewModel.js";
import { getDemoBlocks, getDemoHistoryTurnItems } from "./mockConversation.js";
import {connectDesktopHostEventBridge} from "./desktopHost.js";
import { projectCompletedGroupHeaderParts } from "../src/conversation/AgentActivityGroupPresentation.js";
import { aggregateAgentActivityUnits } from "../src/conversation/AgentActivityAggregate.js";
import { groupSourceAgentActivityUnits } from "../src/conversation/AgentActivityUnitGrouping.js";
import { isSourcePreGroupExecSuppressed } from "../src/conversation/SourcePreGroupExecFilter.js";
import { getSourceExpandableGroupRows } from "../src/conversation/AgentActivityGroupVisibility.js";
import { createSourceActivityCollapseState } from "../src/conversation/SourceActivityCollapseState.js";
import {
  createSourceTurnRuntimeStatusSource,
  type ConnectedSourceTurnRuntimeStatusSource,
} from "../src/conversation/SourceTurnRuntimeStatusSource.js";
import {
 createSourceHistoricalTurnContentSource,
 sourceHistoricalTurnQuery,
 type ConnectedSourceHistoricalTurnSource,
} from "../src/conversation/SourceHistoricalTurnContentSource.js";
import { projectSourceRepeatedActivityRows } from "../src/conversation/SourceRepeatedActivityGroups.js";
import { partitionSourceAeonActivity } from "../src/conversation/SourceAeonActivityPartitions.js";
import { classifyRawActivityItem } from "../src/conversation/AgentActivityRawClassifier.js";
import type { ExecCommandLeafProps } from "../src/components/CodexToolActivityLeafRenderer.js";
import {
  CodexSourceExecCommandLeaf,
  CodexSourceExecListFilesLeaf,
  CodexSourceExecReadLeaf,
  CodexSourceExecSearchLeaf,
  CodexSourcePatchLeaf,
} from "../src/components/CodexSourceToolActivityLeaves.js";
import {createSourceConversationHostEventBridge} from "../src/conversation/SourceConversationHostEventBridge.js";
import { createToolActivityHistorySource, type ConnectedToolActivityHistorySource } from "../src/conversation/ToolActivityHistorySource.js";
import type { ToolItem } from "../src/conversation/ToolActivityDetailModel.js";

/**
 * All private Codex host components are replaced explicitly in this DEMO adapter.
 * None of these replacements are claimed to match Codex's hidden UI or IPC APIs.
 */
export const demoProjectionDependencies: ConversationRenderProjectionDependencies = {
  isSpecialEntry: () => false,
  expandPreservedTurn: ({ baseTurnEntry }) => [baseTurnEntry],
};

export const demoPlanDependencies: ConversationMessagePlanDependencies = {
  partitionActivities: (items,{isAeonThread}) => partitionSourceAeonActivity({items,isAeonThread,resolveMcpTask:item=>item.demoAeonTaskResult ?? null}),
  getSpecialActivityResult: () => null,
  hasPersistentActivity: () => true,
  hasRenderableActivity: (items) => items.length > 0,
  shouldRenderActivityAsUnit: () => false,
};

function Markdown({ text, role }: { text: string; role: "user" | "assistant" | "activity" }) {
  return <div className={`demo-markdown demo-markdown--${role}`}>
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
  </div>;
}

function ActivityDetails({ item }: { item: ConversationMessageItem; isActive: boolean; presentation: "ordinary" | "subagent" | "activity-units" }) {
  const [expanded, setExpanded] = React.useState(false);
  const heading = typeof item.heading === "string" ? item.heading : "工具活动";
  const command = typeof item.command === "string" ? item.command : null;
  const output = typeof item.output === "string" ? item.output : null;
  return <div className="demo-activity">
    <button type="button" className="demo-activity-toggle" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
      <span className="demo-activity-icon" aria-hidden="true">›</span>
      <span>{heading}</span>
      <span className="demo-activity-state">{item.state === "Working" ? "运行中" : "已完成 · 模拟"}</span>
    </button>
    {expanded && (command != null || output != null) && <div className="demo-activity-detail">
      {command != null && <pre><span className="demo-command-prefix">$ </span>{command}</pre>}
      {output != null && <pre>{output}</pre>}
    </div>}
  </div>;
}

function DemoCommandLeaf(props: ExecCommandLeafProps) {
  return <div data-demo-xc-command="" data-demo-summary-kind={String(props.summary.type)}
    data-demo-in-progress={String(props.isInProgress)}
    data-demo-background-running={String(props.isBackgroundTerminalRunning)}
    data-demo-background-finished={String(props.isBackgroundTerminalFinished)}>
    <CodexSourceExecCommandLeaf {...props} />
  </div>;
}

const oldFile: InlineReviewFile = {
  name: "LiveConversationSource.ts",
  contents: "const snapshot = initialSnapshot;\nlisteners.forEach(listener => listener());",
};
const newFile: InlineReviewFile = {
  name: "LiveConversationSource.ts",
  contents: "const snapshot = freezeSnapshot(initialSnapshot);\nfor (const listener of [...listeners]) listener();",
};

function DemoFileDiff({ oldFile: oldVersion, newFile: newVersion, overflow }: {
  oldFile: InlineReviewFile;
  newFile: InlineReviewFile;
  overflow: "wrap" | "scroll";
}) {
  return <div className={`demo-full-diff demo-full-diff--${overflow}`}>
    <div className="demo-diff-filename">{newVersion.name ?? oldVersion.name ?? "example.ts"} · 演示对比</div>
    <pre className="demo-diff-minus">- {oldVersion.contents}</pre>
    <pre className="demo-diff-plus">+ {newVersion.contents}</pre>
  </div>;
}

export function makeDemoRow(notify: (message: string) => void) {
  const eventBridge=createSourceConversationHostEventBridge();
  // Subscribe to the independent Electron preload when available, or leave
  // the synthetic browser preview on its existing deterministic event feed.
  connectDesktopHostEventBridge(eventBridge);
  const historyStore=eventBridge.toolHistory;
  const collapseState = createSourceActivityCollapseState();
  const historySources = new Map<string, ConnectedToolActivityHistorySource>();
  const historyTurnStore=eventBridge.historicalTurns;
  const historicalTurnSources=new Map<string,ConnectedSourceHistoricalTurnSource<ConversationMessageItem>>();
  const historyTurnQuery={
    hostId:"demo-host",threadId:"review",entityKey:"fixture-history-content",
  };
  function getHistoricalTurnSource(entry:import("../src/conversation/ConversationRenderEntriesModel.js").ConversationRenderEntry){
    const query=sourceHistoricalTurnQuery(entry);
    if(query==null)return null;
    const key=JSON.stringify([query.hostId,query.threadId,query.entityKey]);
    const existing=historicalTurnSources.get(key);
    if(existing!=null)return existing;
    const source=createSourceHistoricalTurnContentSource(query,historyTurnStore);
    historicalTurnSources.set(key,source);
    return source;
  }
  const turnRuntimeStore=eventBridge.turnRuntime;
  const turnRuntimeSources=new Map<string,ConnectedSourceTurnRuntimeStatusSource>();
  const liveHistoryQuery={
    hostId:"demo-host",threadId:"review",entityKey:"fixture-live-turn-history",
  };
  const liveUpNextQuery={hostId:"demo-host",threadId:"review"};
  function getTurnRuntimeSource(entry:import("../src/conversation/ConversationRenderEntriesModel.js").ConversationRenderEntry) {
    if(entry.turnId!=="review-live-turn-state")return null;
    const key=JSON.stringify([entry.conversationId,entry.turnId,entry.historyEntityKey]);
    const existing=turnRuntimeSources.get(key);
    if(existing!=null)return existing;
    const source=createSourceTurnRuntimeStatusSource({
      hostId:"demo-host",threadId:"review",
      historyEntityKey:"fixture-live-turn-history",turnStatus:"in_progress",
      isTerminalOrSummaryTurn:false,assistantItem:null,
      hasInlineSubagentActivity:false,isMostRecentTurn:true,
      hasUpNextStatusItem:true,interruptedByThisClient:false,
    },turnRuntimeStore);
    turnRuntimeSources.set(key,source);
    return source;
  }

  function getHistorySource(item: ConversationMessageItem, isActive: boolean) {
    // DEMO only: use the fixture's stable ID as the history item ID. A real host
    // must pass the source item ID and canonical history key from its event store.
    if (item.type !== "exec" || typeof item.id !== "string") return null;
    const itemId = typeof item.commandExecutionItemId === "string"
      ? item.commandExecutionItemId : item.id;
    const registryKey = JSON.stringify(["demo-host", "demo-conversation", "demo-history", itemId]);
    const cached = historySources.get(registryKey);
    if (cached != null) return cached;
    const queryContext = {
      hostId: "demo-host", conversationId: "demo-conversation", historyEntityKey: "demo-history",
    };
    const query = {
      hostId: "demo-host", threadId: "demo-conversation", entityKey: "demo-history", itemId,
    };
    const status = item.state === "Working" ? "inProgress" : "completed";
    const output = typeof item.output === "string" ? item.output : undefined;
    // One ingress for LO/Au/Vd, Y history and Fc qn/Qr; metadata remains
    // deliberately synthetic and no command is executed.
    eventBridge.publish({type:"tool-history-entity",query,entity:{
      type:"commandExecution",status,
      ...(item.processId == null ? {} : {processId: item.processId}),
      ...(output == null ? {} : {aggregatedOutput:output,exitCode:status==="completed"?0:undefined}),
    }});
    const source = createToolActivityHistorySource({
      item: {...item, commandExecutionItemId: itemId} as ToolItem,
      queryContext,
      hydrationContext: {isTurnInProgress: isActive},
    }, historyStore);
    historySources.set(registryKey, source);
    return source;
  }
  const host: ConnectedConversationRendererHost = {
    Markdown,
    // Explicit DEMO Wa/Rk adapters: Codex's private unit classifier and persisted
    // collapse state are not represented by synthetic transcript records.
    agentActivity: {
      collapseState,
      // Explicit fixture only. The private host decides combinedUnitKey; no
      // synthetic trace is inferred from adjacency or command/file types.
      getCombinedUnitKey: items => {
        const value=items.find(item => typeof item.demoCombinedTraceKey === "string")?.demoCombinedTraceKey;
        return typeof value === "string" ? value : null;
      },
      // N/P source grouping uses *explicit synthetic metadata* from fixtures.
      // The private _e classifier must be provided by a future real host.
      toUnits: (items) => groupSourceAgentActivityUnits(items, {
        getGrouping: item => item.grouping === "groupable" ? "groupable" : "standalone",
        startsGroup: item => item.startsGroup === true,
        // Only fixture-verified private fr outcomes; never assume all reads
        // or successful commands are skippable in a real conversation.
        shouldSkipBeforeGrouping: (item,next) => isSourcePreGroupExecSuppressed(item,next,{
          // Undefined lets source Jt/Kt/qt run; explicit fixture outcomes
          // may override but no broad "any SKILL.md" classification is used.
          isSuccessfulExecution: item => item.demoSuccessfulExecution === true ? true : undefined,
          classifyVisualizationCommand: item => item.demoVisualizationKind ?? undefined,
          isVisualizationSkillRead: item => item.demoVisualizeSkillRead === true ? true : undefined,
        }),
      }),
      // Source qe uses Gi from private turn state. Only opt-in test fixtures
      // supply it; other demo turns keep their previously verified behavior.
      allowLatestCompletedGroup: ({items,isActive}) =>
        items.some(item=>item.demoLatestSourceVisibility === true) ? isActive : null,
      getCollapseContext: ({ isActive, collapseWhenPossible, hasFollowingFinalAnswer }) => ({
        hasFinalAssistantStarted: !isActive,
        isTurnCancelled: false,
        allowCollapseBeforeFinal: collapseWhenPossible,
        preventAutoCollapse: false,
        hasFollowingFinalAnswer,
      }),
      renderSummary: (count) => `${count} 项工具活动 · 模拟`,
      groupHeader: {
        // Je/bg: fixture-only private result safety and bm display signature.
        getRepeatedRows: items => projectSourceRepeatedActivityRows(items, {
          getGrouping: item => item.grouping==="groupable" ? "groupable" : "standalone",
          canGroupMcpResult: item => item.demoSafeMcpResult === true,
          getToolDisplaySignature: item => typeof item.demoToolDisplaySignature === "string"
            ? item.demoToolDisplaySignature : null,
        }),
        // DEMO-only icon. XO uses mv and V_ uses bv from the original app host.
        renderRepeatedIcon: () => <span data-demo-repeated-icon="" aria-hidden="true">◇</span>,
        renderRepeatedSummary: group => {
          const first=group.items[0];
          const count=group.items.length;
          if (first?.type==="external-event")
            return `已收到来自 ${String(first.sourceLabel ?? "来源")} 的 ${count} 个事件 · 模拟`;
          const tool=first?.invocation != null &&
            typeof first.invocation==="object" && "tool" in first.invocation ?
            String(first.invocation.tool) : "工具";
          return `${tool} · ${count} 次调用 · 模拟`;
        },
        // This is explicitly DEMO state mapping, not private Codex turn state.
        getStateContext: ({isActive, isLatestVisibleUnit, isActivitySliceClosed}) => ({
          isLatestVisibleUnit, isHeaderInProgress: isActive, isActivitySliceClosed, isExploring: false }),
        // mk/rk: expose only source-visible child rows, not every raw item.
        getVisibleItems: items => getSourceExpandableGroupRows(items, {
          isTurnCancelled: false,
          isMeaningfulRead: item => item.meaningfulRead === true,
          hasRenderableVisualization: item => Array.isArray(item.visualizationActivities) &&
            item.visualizationActivities.length > 0,
          isHiddenDynamicTool: item => item.hiddenDynamicTool === true,
        }),
        canExpand: items => getSourceExpandableGroupRows(items, {
          isTurnCancelled: false,
          isMeaningfulRead: item => item.meaningfulRead === true,
          hasRenderableVisualization: item => Array.isArray(item.visualizationActivities) &&
            item.visualizationActivities.length > 0,
          isHiddenDynamicTool: item => item.hiddenDynamicTool === true,
        }).length > 0,
        renderCompletedSummary: (items) => {
          // DEMO-only normalization. The original private xe classifier remains
          // a separate host boundary; the Le/Be/Ve counter aggregation is recovered.
          // Recovered source xe classification feeds the recovered Le/Be/Ve
          // aggregator. Demo tool metadata is synthetic; private predicates
          // and source resolver hooks must come from a future real host.
          const normalized = items.map(item => classifyRawActivityItem(item));
          const aggregate = aggregateAgentActivityUnits(normalized);
          const parts=projectCompletedGroupHeaderParts(aggregate,[]);
          // Literal Chinese summaries come from the pinned zh-CN bundle
          // ("...editedFiles.leading" / "...commands"), not guessed counts.
          // This is still a fixture-driven summary, not the private host i18n.
          const labels=parts.flatMap(part => {
            if (part.kind==="file-changes") return [part.count===1 ? "编辑了一个文件" : "编辑了文件"];
            if (part.kind==="commands") return ["运行了命令"];
            if (part.kind==="exploration") return ["读取文件"];
            return [];
          });
          return labels.length ? `${labels.join(" · ")} · 模拟` : `${items.length} 项活动 · 模拟`;
        },
        translateMessage: message => message.defaultMessage.replace(/\{([a-zA-Z]+)\}/g,
          (_,key:string)=>String(message.values?.[key] ?? "")),
        renderHostActiveLabel: item => typeof item.heading==="string" ? item.heading : "工具活动 · 模拟",
        renderIcon: () => <span data-demo-activity-icon="" aria-hidden="true">◇</span>,
        conversationDetailLevel: "STEPS_PROSE",
      },
    },
    // Explicit DEMO host: recovered fk/SO routing now mounts independently
    // authored, source-shaped xC/PT leaves. The fixtures remain synthetic; no
    // command execution, file mutation, or privileged host action is performed.
    toolActivity: {
      getHistorySource,
      getContext: (_item, isActive) => ({
        isTurnInProgress: isActive,
        isWorkMode: false,
        renderToolActivityInWorkMode: true,
      }),
      getLeafContext: (_item, isActive) => ({
        conversationId: "demo-conversation", hostId: "demo-host", cwd: "/projects/agent-web",
        isReadOnly: false, isTurnInProgress: isActive, isTurnCancelled: false,
        threadDetailLevel: "STEPS_PROSE", summaryTone: "default", showSummaryIcon: true,
        hideRawCommand: false,
      }),
      leafAdapters: {
        Read: CodexSourceExecReadLeaf,
        Search: CodexSourceExecSearchLeaf,
        ListFiles: CodexSourceExecListFilesLeaf,
        Command: DemoCommandLeaf,
        Patch: CodexSourcePatchLeaf,
      },
    },
    ActivityDetails,
    ActivityResult: ({ result }) => <pre data-demo-aeon-task-result="" className="demo-activity-detail">{typeof result === "string" ? result : result != null && typeof result === "object" && "demoLabel" in result ? String(result.demoLabel) : "模拟活动结果"}</pre>,
    GeneratedImages: () => <span className="demo-muted">图片展示尚未接通</span>,
    ThinkingStatus: ({ isVisible, showThinking }) => isVisible && showThinking
      ? <div className="demo-thinking"><span className="demo-thinking-dot"/> 正在思考（模拟）</div>
      : null,
    InProgressFixedContent: () => <span className="demo-muted">执行中（模拟）</span>,
    ConversationGap: () => <div className="demo-conversation-gap" />,
    FileDiff: DemoFileDiff,
    getText: (item) => item.type === "userMessage" || item.type === "user-message" || item.type === "agentMessage" || item.type === "assistant-message"
      ? typeof item.content === "string" ? item.content : null
      : null,
    getFileReview: (item) => item.type === "demo-file-review"
      ? { oldFile, newFile, compact: true, canAccept: false, canEdit: false }
      : null,
    getApprovalReviews: (item) => item.type === "demo-approval" || item.type === "demo-approval-expandable"
      ? {
        reviews: [{ id: "review-permission", status: item.type === "demo-approval" ? "denied" : "pending", riskLevel: "high", summary: "申请修改工作区文件" }],
        isDeclined: item.type === "demo-approval",
        isExpandable: true,
      }
      : null,
    onFileReviewAction: (_item: ConversationMessageItem, action: InlineFileReviewAction) =>
      notify(action === "reject" ? "仅演示：已点击 Reject；没有修改任何文件。" : "操作已禁用：此演示不具备文件修改权限。"),
    translator: {
      format: ({ id, defaultMessage, values }) => id === "restricted.aeonMessaging.activityState"
        ? String(values?.state ?? "Thinking")
        : defaultMessage,
    },
    getApprovalReviewSummary: () => "工作区文件修改权限 · 等待确认（模拟）",
    getApprovalReviewDetails: () => "演示无任何文件写入能力。真实授权需要 Electron/Agent 宿主执行安全校验。",
  };
  const renderers = createConnectedConversationMessageRenderers(host);
  const RecoveredRow = createConversationLiveRow({
    getBlocks: getDemoBlocks,
    getTurnRuntimeSource,
    getHistoricalTurnSource,
    getPlanOptions: (entry) => ({ isTurnInProgress: entry.turn?.status === "inProgress", includeTurnExtras: false,
      isAeonThread: entry.isAeonThread === true,
      // The turn host supplies K/Y/ar/U/rn/we/Ui. Test-only fixture below
      // makes those original Gi inputs explicit; no inferred task state.
      latestActivityRetentionInput: entry.turnId === "review-source-ke-qe" ? {
        isTurnInProgress: entry.turn?.status === "inProgress",
        isTerminalOrSummaryTurn: false,
        assistantItem: null,
        hasInlineSubagentActivity: false,
        isMostRecentTurn: entry.isMostRecentTurn === true,
        hasUpNextStatusItem: false,
        interruptedByThisClient: false,
        hasResolvedUpNextState: false,
      } : undefined,
      renderMode: entry.turnId === "review-source-ke-qe" || entry.turnId === "review-live-turn-state"
        ? "latest" : entry.isLatestTurn ? "latest" : "all" }),
    dependencies: demoPlanDependencies,
    renderers,
  });
  const DemoRow = function DemoRow(props: React.ComponentProps<typeof RecoveredRow>) {
    const blocks = getDemoBlocks(props.entry);
    const role = blocks[0]?.type === "user-message" ? "user" : blocks[0]?.type === "assistant-message" ? "assistant" : "activity";
    return <div className={`demo-row demo-row--${role}`} data-demo-role={role} data-demo-turn-id={props.entry.turnId}>
      {typeof props.entry.timestampSeparatorAtMs === "number" && <div className="demo-time-marker">
        {new Date(props.entry.timestampSeparatorAtMs).toLocaleString("zh-CN")}
      </div>}
      {props.entry.turnId==="review-history-hydration" ? <div
        data-demo-history-turn-controls="">
        <button type="button" data-demo-load-history=""
          onClick={()=>eventBridge.publish({type:"historical-turn",query:historyTurnQuery,
            payload:{status:"completed",items:getDemoHistoryTurnItems()},
          })}>模拟：读取历史回合</button>
        <button type="button" data-demo-clear-history=""
          onClick={()=>eventBridge.publish({type:"clear-thread",hostId:"demo-host",threadId:"review"})}>
          模拟：清除历史缓存</button>
      </div> : null}
      {props.entry.turnId==="review-live-turn-state" ? <div className="demo-source-turn-controls"
        data-demo-source-turn-controls="">
        <button type="button" data-demo-resolve-up-next=""
          onClick={()=>eventBridge.publish({type:"up-next-ready",query:liveUpNextQuery,ready:true})}>
          模拟：后续状态就绪
        </button>
        <button type="button" data-demo-complete-turn=""
          onClick={()=>eventBridge.publish({type:"turn-history-status",query:liveHistoryQuery,status:"completed"})}>
          模拟：历史回合完成
        </button>
        <button type="button" data-demo-resume-turn=""
          onClick={()=>eventBridge.publish({type:"turn-history-status",query:liveHistoryQuery,status:"inProgress"})}>
          模拟：历史回合进行中
        </button>
      </div> : null}
      <RecoveredRow {...props} />
    </div>;
  };
  return Object.assign(DemoRow, {
    dispose() {
      for (const source of historySources.values()) source.dispose();
      historySources.clear();
      // Event bridge owns the three underlying stores.
      for(const source of turnRuntimeSources.values())source.dispose();
      turnRuntimeSources.clear();

      for(const source of historicalTurnSources.values())source.dispose();
      historicalTurnSources.clear();
      eventBridge.dispose();
      collapseState.dispose();
    },
  });
}
