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
import { getDemoBlocks } from "./mockConversation.js";
import { projectCompletedGroupHeaderParts, type ToolActivitySummary } from "../src/conversation/AgentActivityGroupPresentation.js";

/**
 * All private Codex host components are replaced explicitly in this DEMO adapter.
 * None of these replacements are claimed to match Codex's hidden UI or IPC APIs.
 */
export const demoProjectionDependencies: ConversationRenderProjectionDependencies = {
  isSpecialEntry: () => false,
  expandPreservedTurn: ({ baseTurnEntry }) => [baseTurnEntry],
};

export const demoPlanDependencies: ConversationMessagePlanDependencies = {
  partitionActivities: (items) => [{ type: "activity", items }],
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
  const host: ConnectedConversationRendererHost = {
    Markdown,
    // Explicit DEMO Wa/Rk adapters: Codex's private unit classifier and persisted
    // collapse state are not represented by synthetic transcript records.
    agentActivity: {
      // DEMO group factory for Wa: the fixture explicitly models adjacent
      // activities as one grouped unit. The source classifier is NOT bypassed
      // in production; a real host must supply Wa's actual unit partition.
      toUnits: (items) => items.length === 0 ? [] : [{
        key: `demo-activity-group:${items.map((item, index) => item.id ?? `${item.type}-${index}`).join("|")}`,
        kind: "group" as const, items,
      }],
      getCollapseContext: ({ isActive, collapseWhenPossible }) => ({
        hasFinalAssistantStarted: !isActive,
        isTurnCancelled: false,
        allowCollapseBeforeFinal: collapseWhenPossible,
        preventAutoCollapse: false,
        hasFollowingFinalAnswer: true,
      }),
      renderSummary: (count) => `${count} 项工具活动 · 模拟`,
      groupHeader: {
        // This is explicitly DEMO state mapping, not private Codex turn state.
        getStateContext: ({isActive}) => ({ isLatestVisibleUnit: true,
          isHeaderInProgress: isActive, isActivitySliceClosed: false, isExploring: false }),
        canExpand: () => true, // DEMO: real mk/rk and tool visibility stay host-owned.
        renderCompletedSummary: (items) => {
          const aggregate: ToolActivitySummary = {
            loadedToolCount:0,mcpToolCallCount:0,mcpToolCallSources:[],
            createdFileCount:0,editedFileCount:0,deletedFileCount:0,stoppedCreatedFileCount:0,
            exploredFileCount:0,searchCount:0,listCount:0,visualizationActivity:null,
            commandCount:items.filter(item=>item.type==="exec").length,
            completedVisualizationCommandCount:0,runningVisualizationCommandCount:0,
            completedWebSearchCommandCount:0,runningWebSearchCommandCount:0,
            webSearchCount:items.filter(item=>item.type==="web-search").length,
          };
          const parts=projectCompletedGroupHeaderParts(aggregate,[]);
          const count=parts.find(part=>part.kind==="commands");
          return count?.kind==="commands" ? `${count.count} 项命令 · 模拟` : `${items.length} 项活动 · 模拟`;
        },
        translateMessage: message => message.defaultMessage.replace(/\{([a-zA-Z]+)\}/g,
          (_,key:string)=>String(message.values?.[key] ?? "")),
        renderHostActiveLabel: item => typeof item.heading==="string" ? item.heading : "工具活动 · 模拟",
        renderIcon: () => <span data-demo-activity-icon="" aria-hidden="true">◇</span>,
        conversationDetailLevel: "STEPS_PROSE",
      },
    },
    ActivityDetails,
    ActivityResult: ({ result }) => <pre className="demo-activity-detail">{typeof result === "string" ? result : "模拟活动结果"}</pre>,
    GeneratedImages: () => <span className="demo-muted">图片展示尚未接通</span>,
    ThinkingStatus: ({ isVisible, showThinking }) => isVisible && showThinking
      ? <div className="demo-thinking"><span className="demo-thinking-dot"/> 正在思考（模拟）</div>
      : null,
    InProgressFixedContent: () => <span className="demo-muted">执行中（模拟）</span>,
    ConversationGap: () => <div className="demo-conversation-gap" />,
    FileDiff: DemoFileDiff,
    getText: (item) => item.type === "userMessage" || item.type === "agentMessage"
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
    getPlanOptions: (entry) => ({ isTurnInProgress: entry.turn?.status === "inProgress", includeTurnExtras: false }),
    dependencies: demoPlanDependencies,
    renderers,
  });
  return function DemoRow(props: React.ComponentProps<typeof RecoveredRow>) {
    const blocks = getDemoBlocks(props.entry);
    const role = blocks[0]?.type === "user-message" ? "user" : blocks[0]?.type === "assistant-message" ? "assistant" : "activity";
    return <div className={`demo-row demo-row--${role}`} data-demo-role={role}>
      {typeof props.entry.timestampSeparatorAtMs === "number" && <div className="demo-time-marker">
        {new Date(props.entry.timestampSeparatorAtMs).toLocaleString("zh-CN")}
      </div>}
      <RecoveredRow {...props} />
    </div>;
  };
}
