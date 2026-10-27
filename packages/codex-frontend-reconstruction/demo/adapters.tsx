import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {createSourceCodeBlockWordWrapPreference,
  sourceCodeBlockWrapState} from "../src/conversation/SourceCodeBlockWordWrapPreference.js";
import {
  createSourceStreamingCodeHighlightController,
  projectSourceStreamingCodeHighlight,
} from "../src/conversation/SourceStreamingCodeHighlight.js";
import {
  createConnectedConversationMessageRenderers,
  type ConnectedConversationRendererHost,
} from "../src/components/ConnectedConversationMessageRenderers.js";
import { createConversationLiveRow } from "../src/components/ConversationMessageBlocks.js";
import { CodexSourceWorkStatus } from "../src/components/CodexSourceWorkStatus.js";
import type { ConversationMessageItem, ConversationMessagePlanDependencies } from "../src/conversation/ConversationMessageRenderPlan.js";
import type { ConversationRenderProjectionDependencies } from "../src/conversation/ConversationRenderEntriesModel.js";
import type { InlineFileReviewAction, InlineReviewFile } from "../src/conversation/InlineFileReviewModel.js";
import {projectSourceMcpGenericApprovalMessage}
  from "../src/conversation/SourceMcpApprovalRequestModel.js";
import {projectSourceBrowserWebsiteApproval} from "../src/conversation/SourceBrowserWebsiteApprovalModel.js";
import {projectSourceUrlActionRequest} from "../src/conversation/SourceUrlActionRequestModel.js";
import {projectSourceToolSuggestion} from "../src/conversation/SourceToolSuggestionRequestModel.js";
import {projectSourceUserVerificationRequest}
  from "../src/conversation/SourceUserVerificationModel.js";
import {projectSourceUnsupportedOpenAIForm}
  from "../src/conversation/SourceUnsupportedOpenAIFormModel.js";
import {projectSourceTextFormElicitation}
  from "../src/conversation/SourceTextFormElicitationModel.js";
import {projectSourceHostMcpApproval} from "../src/conversation/SourceHostMcpApprovalProjection.js";
import {bindSourcePendingElicitationsToTimeline}
  from "../src/conversation/SourcePendingElicitationTimelineBinder.js";
import {demoActivityEntry,demoItem,type DemoSource,type DemoConversationId}
  from "./mockConversation.js";
import {createSourceInlineReviewWrapPreference}
  from "../src/conversation/SourceInlineReviewWrapPreference.js";
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
import {resolveSourceMcpToolActivityLabel,sourceMcpLabelInputFromActivity} from "../src/conversation/SourceMcpToolActivityLabel.js";
import { partitionSourceAeonActivity } from "../src/conversation/SourceAeonActivityPartitions.js";
import { classifyRawActivityItem } from "../src/conversation/AgentActivityRawClassifier.js";
import type { ExecCommandLeafProps } from "../src/components/CodexToolActivityLeafRenderer.js";
import {
  CodexSourceExecCommandLeaf,
  CodexSourceExecListFilesLeaf,
  CodexSourceExecReadLeaf,
  CodexSourceExecSearchLeaf,
  CodexSourcePatchLeaf,
  CodexSourceMcpToolCallLeaf,
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

/** Original shared Ce/ord preference is host-owned and has no private
 * persistence in this reconstructed frontend. Every mounted code block
 * observes the same session-scoped user-controlled setting. */
const demoCodeBlockWordWrapPreference=createSourceCodeBlockWordWrapPreference();

/** Original chatgpt-code-block source layout: a dedicated code surface,
 * independent scrollport and onCopyCode. This is intentionally NOT a port
 * of the private CodeMirror/highlighter, preview or executable code paths. */
function markdownCodeText(node:React.ReactNode):string {
  if(typeof node==="string"||typeof node==="number")return String(node);
  if(Array.isArray(node))return node.map(markdownCodeText).join("");
  if(React.isValidElement<{children?:React.ReactNode}>(node))
    return markdownCodeText(node.props.children);
  return "";
}
function MarkdownSourceCodeBlock({
  children,isStreaming=false,...preProps
}:React.ComponentProps<"pre"> & {isStreaming?:boolean}){
  const element=React.Children.toArray(children).find(
    (node):node is React.ReactElement<{className?:string;children?:React.ReactNode}>=>
      React.isValidElement(node)&&node.type==="code",
  );
  const code=element?.props;
  const language=/\blanguage-([\w.+-]+)/.exec(code?.className??"")?.[1]??null;
  const raw=markdownCodeText(code?.children??children);
  const copyContent=raw.replace(/\n$/,"");
  // One original Bt-style controller per mounted code block. ReactMarkdown
  // preserves the pre component type during streamed message re-renders.
  const [controller]=React.useState(createSourceStreamingCodeHighlightController);
  const snapshot=React.useSyncExternalStore(
    controller.subscribe,controller.getSnapshot,controller.getSnapshot,
  );
  React.useEffect(()=>{
    controller.setInput(raw,language,isStreaming);
  },[controller,raw,language,isStreaming]);
  React.useEffect(()=>()=>controller.dispose(),[controller]);
  const visible=projectSourceStreamingCodeHighlight(raw,snapshot);
  const styledCode=element!=null&&visible.segments.some(p=>p.className!=null)
    ? React.cloneElement(element,{
        children:visible.segments.map((part,index)=>
          <span key={index} className={part.className??undefined}>{part.text}</span>),
      })
    : children;
  const [copyState,setCopyState]=React.useState<"idle"|"copied"|"error">("idle");
  const preference=React.useSyncExternalStore(
    demoCodeBlockWordWrapPreference.subscribe,
    demoCodeBlockWordWrapPreference.getSnapshot,
    demoCodeBlockWordWrapPreference.getSnapshot,
  );
  const wrap=sourceCodeBlockWrapState({policy:"user-controlled",preference});
  const copyTimeout=React.useRef<ReturnType<typeof setTimeout>|null>(null);
  React.useEffect(()=>()=>{if(copyTimeout.current!=null)clearTimeout(copyTimeout.current);},[]);
  async function copyCode(){
    try{
      if(navigator.clipboard?.writeText==null)throw Error("clipboard unavailable");
      await navigator.clipboard.writeText(copyContent);
      setCopyState("copied");
    }catch{
      setCopyState("error");
    }
    if(copyTimeout.current!=null)clearTimeout(copyTimeout.current);
    copyTimeout.current=setTimeout(()=>setCopyState("idle"),1800);
  }
  return <div className="demo-markdown-code-surface"
    data-code-block=""
    data-conversation-code-surface="true"
    data-markdown-copy="code-block"
    data-source-code-wrap-lines={wrap.wrapLines?"true":"false"}
    data-source-code-highlight={visible.pending?"pending":snapshot.highlighted?"ready":"fallback"}
    data-source-code-streaming={isStreaming?"true":"false"}>
    <div className="demo-markdown-code-action-bar"
      data-code-block-action-bar="true" data-markdown-copy="exclude">
      <span className="demo-markdown-code-language">{language??"Code"}</span>
      <div className="demo-markdown-code-controls" data-code-block-controls="" role="presentation">
        {wrap.canToggle?<button type="button" className="demo-markdown-code-wrap"
          aria-label={wrap.wrapLines?"Disable word wrap":"Enable word wrap"}
          title={wrap.wrapLines?"Disable word wrap":"Enable word wrap"}
          aria-pressed={wrap.wrapLines}
          onClick={()=>demoCodeBlockWordWrapPreference.setEnabled(!wrap.wrapLines)}>
          <svg viewBox="0 0 24 24" width="16" height="16"
            fill="none" stroke="currentColor" strokeWidth="1.7"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 6h16M4 10h13a3 3 0 0 1 0 6h-4"/>
            <path d="m16 13-3 3 3 3M4 18h6"/>
          </svg>
        </button>:null}
        <button type="button" className="demo-markdown-code-copy"
          aria-label={copyState==="copied"?"已复制代码":copyState==="error"?"复制失败":"复制代码"}
          title={copyState==="copied"?"已复制":copyState==="error"?"无法复制":"复制代码"}
          onClick={()=>{void copyCode();}}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
            stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"
            strokeLinejoin="round" aria-hidden="true">
            <rect x="8" y="8" width="11" height="11" rx="2"/>
            <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>
          </svg>
          <span>{copyState==="copied"?"已复制":copyState==="error"?"复制失败":"复制"}</span>
        </button>
      </div>
    </div>
    <div className="demo-markdown-code-scrollport chatgpt-code-scrollport"
      data-code-block-source="true" dir="ltr">
      <pre {...preProps}>{styledCode}</pre>
    </div>
  </div>;
}
function Markdown({ text, role, isStreaming=false }: {
  text:string;role:"user"|"assistant"|"activity";isStreaming?:boolean
}) {
  // Keep the custom pre renderer stable across successive streamed Markdown
  // revisions; changing its function identity would remount and reset Bt.
  const components=React.useMemo(()=>({
    pre:(props:React.ComponentProps<"pre">)=>
      <MarkdownSourceCodeBlock {...props} isStreaming={isStreaming}/>,
  }),[isStreaming]);
  return <div className={`demo-markdown demo-markdown--${role}`}>
    <ReactMarkdown remarkPlugins={[remarkGfm]}
      components={components}>{text}</ReactMarkdown>
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
      <span className="demo-activity-state">{item.type==="host-pending-elicitation"?"等待宿主处理":item.state === "Working" ? "运行中" : "已完成 · 模拟"}</span>
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

/** Demo host's persistent-in-session C preference, separate from code-snippet
 * word wrap. It survives conversation/source remounts, with no backend claim. */
const demoInlineReviewWrapPreference=createSourceInlineReviewWrapPreference();

const oldFile: InlineReviewFile = {
  name: "LiveConversationSource.ts",
  contents: "const snapshot = initialSnapshot;\nlisteners.forEach(listener => listener());",
};
const newFile: InlineReviewFile = {
  name: "LiveConversationSource.ts",
  contents: "const snapshot = freezeSnapshot(initialSnapshot);\nfor (const listener of [...listeners]) listener();",
};

export function makeDemoRow(notify: (message: string) => void) {
  const eventBridge=createSourceConversationHostEventBridge();
  // Subscribe to the independent Electron preload when available, or leave
  // the synthetic browser preview on its existing deterministic event feed.
  connectDesktopHostEventBridge(eventBridge);
  const historyStore=eventBridge.toolHistory;
  const pendingStore=eventBridge.pendingElicitations;
  const hostPending=(item:ConversationMessageItem)=>{
    if(item.type!=="host-pending-elicitation"||
      typeof item.id!=="string"||typeof item.pendingHostId!=="string"||
      typeof item.pendingThreadId!=="string")return null;
    return pendingStore.get({
      hostId:item.pendingHostId,threadId:item.pendingThreadId,requestId:item.id,
    });
  };
  const collapseState = createSourceActivityCollapseState();
  const demoMcpLabelHost = {
    isFailedResult: (input:import("../src/conversation/SourceMcpToolActivityLabel.js").SourceMcpToolActivityLabelInput)=>
      input.toolResult?.type==="error",
    getToolDefinitionTitle: (definition:import("../src/conversation/SourceMcpToolActivityLabel.js").SourceMcpToolActivityLabelInput["toolDefinition"])=>
      typeof definition?.demoTitle==="string"?definition.demoTitle:null,
    getFallbackLabel: (input:import("../src/conversation/SourceMcpToolActivityLabel.js").SourceMcpToolActivityLabelInput)=>
      input.toolName||null,
  };
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
  // One canonical Y subscription is shared by the virtualized historical row
  // and Find-in-Thread. It exists independently of virtual row mount state.
  // This is a DEMO host query, not the private persisted search service.
  const findHistorySource=createSourceHistoricalTurnContentSource(historyTurnQuery,historyTurnStore);
  historicalTurnSources.set(JSON.stringify([
    historyTurnQuery.hostId,historyTurnQuery.threadId,historyTurnQuery.entityKey,
  ]),findHistorySource);
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
      renderSummary: (count,workedForItem) => workedForItem == null
        ? `${count} 项工具活动 · 模拟`
        : <CodexSourceWorkStatus item={workedForItem}/>,
      renderWorkedFor: item => <div data-source-work-status-divider="true"
        className="codex-source-work-status-divider">
        <CodexSourceWorkStatus item={item}/>
      </div>,
      groupHeader: {
        // Je/bg: fixture-only private result safety and bm display signature.
        getRepeatedRows: items => projectSourceRepeatedActivityRows(items, {
          getGrouping: item => item.grouping==="groupable" ? "groupable" : "standalone",
          canGroupMcpResult: item => item.demoSafeMcpResult === true,
          getToolDisplaySignature: item => typeof item.demoToolDisplaySignature === "string"
            ? item.demoToolDisplaySignature : null,
        }),
        getRecognizedRepeatedAction: item => {
          const name=item.demoRecognizedActionLabel;
          return typeof name==="string"?{
            message:{id:"demo.mcp.recognizedAction",defaultMessage:name},
            iconKey:"demo-mcp-recognized",
          }:null;
        },
        renderRepeatedHeader: header => {
          if(header.variant==="external-event")return {
            summary:`已收到来自 ${header.sourceLabel || "未知来源"} 的 ${header.count} 个事件 · 模拟`
          };
          const icon=<span data-demo-repeated-icon="" aria-hidden="true">◇</span>;
          if(header.variant==="codex-action")return {
            icon,summary:`${header.action.message.defaultMessage} · ${header.count} 次调用 · 模拟`
          };
          const label=resolveSourceMcpToolActivityLabel(
            sourceMcpLabelInputFromActivity(header.item),demoMcpLabelHost);
          return {icon,summary:`${label.text??"工具"} · ${header.count} 次调用 · 模拟`};
        },
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
        hideRawCommand: false,mcpLabelHost:demoMcpLabelHost,
      }),
      leafAdapters: {
        Read: CodexSourceExecReadLeaf,
        Search: CodexSourceExecSearchLeaf,
        ListFiles: CodexSourceExecListFilesLeaf,
        Command: DemoCommandLeaf,
        Patch: CodexSourcePatchLeaf,
        McpToolCall: CodexSourceMcpToolCallLeaf,
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
    getText: (item) => item.type === "userMessage" || item.type === "user-message" || item.type === "agentMessage" || item.type === "assistant-message"
      ? typeof item.content === "string" ? item.content : null
      : null,
    getFileReview: (item) => item.type === "demo-file-review"
      ? { oldFile, newFile, compact: false, canAccept: false, canEdit: false }
      : null,
    getApprovalReviews: (item) => {
      if(item.type!=="demo-approval" && item.type!=="demo-approval-expandable")return null;
      // Test host may explicitly deliver a dynamic automatic-review status;
      // real Agent authorization remains outside this demonstration bridge.
      const status=item.demoAutomaticReviewStatus==="inProgress"
        ||item.demoAutomaticReviewStatus==="denied"
          ? item.demoAutomaticReviewStatus
          :item.type==="demo-approval"?"denied":"pending";
      return {
        reviews:[{id:"review-permission",status,riskLevel:"high",
          summary:"申请修改工作区文件"}],
        isDeclined:status==="denied",
        isExpandable:true,
      };
    },
    /** Original at dispatch only recognizes the explicit urlAction kind.
     * Browser fixture is intentionally readonly for external opens. Native
     * Electron uses its real (validated) isolated openExternalUrl bridge. */
    getTextFormElicitationRequest:(item)=>{
      const live=hostPending(item);
      if(live!=null)return projectSourceTextFormElicitation(live.elicitation,{
        hostId:live.hostId,conversationId:live.threadId,requestId:live.requestId,
      });
      if(item.type!=="demo-text-form-elicitation"||typeof item.id!=="string")return null;
      return projectSourceTextFormElicitation({
        kind:"formElicitation",serverName:"Sample MCP form server (synthetic)",
        message:"Share project information (synthetic)",
        schema:{type:"object",properties:{
          project:{type:"string",title:"Project name",description:"Enter the project label"},
          purpose:{type:"string",title:"Purpose",description:"Describe what to accomplish",
            minLength:3,maxLength:120},
        },required:["project","purpose"],additionalProperties:false},
      },{hostId:"demo-host",conversationId:"frontend",requestId:item.id});
    },
    onTextFormElicitationReply:window.agentWebDesktopHost!=null
      ?reply=>window.agentWebDesktopHost!.replyToTextForm(reply)
      :undefined,
    getUnsupportedOpenAIFormRequest:(item)=>{
      const live=hostPending(item);
      if(live!=null)return projectSourceUnsupportedOpenAIForm(live.elicitation,{
        hostId:live.hostId,conversationId:live.threadId,requestId:live.requestId,
      });
      if(item.type!=="demo-unsupported-openai-form"||typeof item.id!=="string")
        return null;
      return projectSourceUnsupportedOpenAIForm({
        kind:"unsupportedOpenAIForm",
        serverName:"Sample MCP form server (synthetic)",
      },{hostId:"demo-host",conversationId:"frontend",requestId:item.id});
    },
    onUnsupportedOpenAIFormReply:window.agentWebDesktopHost!=null
      ?envelope=>window.agentWebDesktopHost!.replyToUnsupportedForm(envelope)
      :undefined,
    getUserVerificationRequest:(item)=>{
      const live=hostPending(item);
      if(live!=null)return projectSourceUserVerificationRequest(live.elicitation,{
        hostId:live.hostId,conversationId:live.threadId,requestId:live.requestId,
      });
      if(item.type!=="demo-user-verification"||typeof item.id!=="string")
        return null;
      return projectSourceUserVerificationRequest({
        kind:"userVerification",
        title:"Confirm access to workspace files (synthetic)",
        serverName:"Sample Files MCP (synthetic)",
        description:"This is a visual fixture. No biometric verification is performed.",
      },{hostId:"demo-host",conversationId:"frontend",requestId:item.id});
    },
    onUserVerificationCancel:window.agentWebDesktopHost!=null
      ?envelope=>window.agentWebDesktopHost!.cancelUserVerification(envelope)
      :undefined,
    getToolSuggestionRequest:(item)=>{
      const live=hostPending(item);
      if(live!=null)return projectSourceToolSuggestion(live.elicitation,{
        hostId:live.hostId,conversationId:live.threadId,requestId:live.requestId,
      });
      if(item.type!=="demo-tool-suggestion"||typeof item.id!=="string")return null;
      return projectSourceToolSuggestion({
        kind:"toolSuggestion",suggestion:{
          tool_type:item.demoToolSuggestionType==="plugin"?"plugin":"connector",
          suggest_type:item.demoToolSuggestionAction==="enable"?"enable":"install",
          tool_id:"sample-files-tool",tool_name:"Sample Files (synthetic)",
        },
      },{hostId:"demo-host",conversationId:"frontend",requestId:item.id});
    },
    // Intentionally no onStartToolSuggestion/onCheckToolSuggestionReady:
    // verified host app/plugin service does not exist yet.
    getUrlActionRequest:(item)=>{
      const live=hostPending(item);
      if(live!=null)return projectSourceUrlActionRequest(live.elicitation,{
        hostId:live.hostId,conversationId:live.threadId,requestId:live.requestId,
      });
      if(item.type!=="demo-url-action"||typeof item.id!=="string")return null;
      return projectSourceUrlActionRequest({
        kind:"urlAction",action:{
          message:"Complete the browser step, then continue (synthetic).",
          url:"https://example.org/account/verify",
        },
      },{hostId:"demo-host",conversationId:"frontend",requestId:item.id});
    },
    onUrlActionOpenExternal:window.agentWebDesktopHost!=null
      ?url=>window.agentWebDesktopHost!.openExternalUrl(url)
      :undefined,
    /** Source ft/Ge: recognition is from an exact synthetic browser MCP
     * request and host policy, not UI classification. All replies fail closed. */
    getBrowserWebsiteApprovalRequest:(item)=>{
      const live=hostPending(item);
      if(live!=null)return projectSourceBrowserWebsiteApproval(live.elicitation,{
        hostId:live.hostId,conversationId:live.threadId,
        requestId:live.requestId,allowAllSites:false,
      });
      if(item.type!=="demo-browser-website-approval"||typeof item.id!=="string")return null;
      const allowAllSites=item.demoBrowserWebsiteAllSites===true;
      return projectSourceBrowserWebsiteApproval({
        kind:"mcpToolCall",
        approval:{
          tool_name:"access_browser_origin",
          connector_id:allowAllSites?"browser-use":"connector-chrome",
          connector_name:allowAllSites?"Browser":"Chrome",
          tool_params:{origin:allowAllSites?"https://example.org":"https://docs.example.org",
            reason:"Synthetic website access request; no Agent backend is connected."},
          persist:["always"],
        },
      },{hostId:"demo-host",conversationId:"frontend",requestId:item.id,allowAllSites});
    },
    /** Source E Computer Use request is distinct from generic MCP tool ye.
     * Both use the same host-scoped MCP elicitation *reply transport*.
     * Demo records are explicitly synthetic; native Electron main rejects. */
    getComputerUseApprovalRequest:(item)=>{
      if(item.type!=="demo-computer-use-approval"||typeof item.id!=="string")return null;
      const highRisk=item.demoComputerUseHighRisk===true;
      return {
        hostId:"demo-host",conversationId:"frontend",
        requestId:item.id,
        appDisplayName:highRisk?"Terminal":"Visual Studio Code",
        connectorName:"Computer Use (synthetic fixture)",
        riskLevel:highRisk?"high":null,
        subtitle:"Synthetic request · no Computer Use backend is connected",
        persistModes:highRisk?["session"] as const:["session","always"] as const,
        hasPreviouslyApproved:highRisk,
      };
    },
    /** Host-only demo transport: every reply rejects. A click can never grant
     * real permission or pretend a request has settled successfully. */
    getMcpApprovalRequest:(item)=>{
      const live=hostPending(item);
      if(live!=null){
        return projectSourceHostMcpApproval(live.elicitation,{
          hostId:live.hostId,conversationId:live.threadId,requestId:live.requestId,
        });
      }
      if(item.type!=="demo-mcp-approval"||typeof item.id!=="string")return null;
      const disabled=item.demoMcpApprovalDisabled===true;
      // Original be/ke generic-message title logic is exercised by the
      // secondary readonly fixture; the active tool-call fixture exercises Se.
      const generic=projectSourceMcpGenericApprovalMessage(
        "Tool call needs your approval. Reason: Host approval is unavailable",
        {reason:"Host approval is unavailable"});
      return {
        hostId:"demo-host",conversationId:"frontend",
        requestId:item.id,
        title:disabled?generic.title:'Allow sample files app to run tool "files.search"?',
        connectorName:"Fixture files MCP connector",
        subtitle:"Synthetic request · no Agent backend is connected",
        reason:disabled?generic.reason:"Read a list of sample project files for display only.",
        riskLevel:disabled?null:"high",
        disabled,
        persist:disabled?[]:["session","always"] as const,
        toolParams:{
          path:"/projects/agent-web",
          query:"codex",
          count:20,
          filters:{kinds:["ts","tsx","css"],includeHidden:false},
          description:Array.from({length:18},(_,index)=>
            "Line "+String(index+1).padStart(2,"0")+
            ": long tool argument, retained after expansion").join("\n"),
          recursive:true,
        },
        collapseToolParams:false,
      };
    },
    onMcpApprovalReply:async(requestId,reply,context)=>{
      const desktop=window.agentWebDesktopHost;
      if(desktop!=null){
        // Real Electron preload -> main IPC; main has no Agent backend and
        // MUST reject with MCP_BACKEND_UNAVAILABLE. No success simulation.
        return desktop.replyToMcpApproval({...context,requestId,response:reply});
      }
      // Explicit browser-only fixture; no Agent backend or Electron exists.
      await new Promise<void>(resolve=>setTimeout(resolve,380));
      throw Error("DEMO ONLY: no MCP approval transport configured");
    },
    inlineReviewWrapPreference:demoInlineReviewWrapPreference,
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
    /** One host-event ingress -> one canonical LiveConversationSource. No
     * separate list, synthetic grant, or cross-thread mounting. */
    bindHostElicitations(source:DemoSource,threadId:DemoConversationId){
      return bindSourcePendingElicitationsToTimeline({
        store:pendingStore,source,hostId:"demo-host",threadId,
        createEntry(request,turnId){
          const kind=String(request.elicitation.kind);
          return demoActivityEntry(turnId,[
            demoItem(request.requestId,"host-pending-elicitation",undefined,{
              heading:"宿主待处理请求 · "+kind,
              state:"Needs input",pendingHostId:request.hostId,
              pendingThreadId:request.threadId,
            }),
          ]);
        },
      });
    },
    findHistory: {source: findHistorySource, query: historyTurnQuery},
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
