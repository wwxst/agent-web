/**
 * Deliberately synthetic data for the browser preview.
 * These are NOT Codex transcript records, live backend events, or recovered IPC data.
 */
import type { ConversationRenderEntry } from "../src/conversation/ConversationRenderEntriesModel.js";
import type { ConversationMessageItem, ConversationTranscriptBlock } from "../src/conversation/ConversationMessageRenderPlan.js";
import { createLiveConversationSource } from "../src/conversation/LiveConversationSource.js";
import { projectSourceTurnTranscriptBlocks } from "../src/conversation/SourceTurnTranscriptBlocks.js";
import {
 selectSourceHistoricalTurnItems,
 type SourceHistoricalTurnSnapshot,
} from "../src/conversation/SourceHistoricalTurnContentSource.js";
import type { TurnItem, Dependencies } from "../src/conversation/TurnItemRenderGroups.js";

export type DemoSource = ReturnType<typeof createLiveConversationSource>;
export type DemoConversationId = "frontend" | "review";

export const DEMO_CONVERSATIONS: ReadonlyArray<{ id: DemoConversationId; title: string; subtitle: string }> = [
  { id: "frontend", title: "恢复 Codex 会话界面", subtitle: "正在重构 · 今天" },
  { id: "review", title: "工具调用与审批交互", subtitle: "界面审阅 · 昨天" },
];

export function demoItem(id: string, type: string, content?: string, extra: Record<string, unknown> = {}): ConversationMessageItem {
  // DEMO ONLY: original exec rows always include parsedCmd; the synthetic
  // fixture's command/state fields are converted into that shape here.
  const parsedCmd = type === "exec" && extra.parsedCmd == null ? {
    cmd: typeof extra.command === "string" ? extra.command : "",
    type: "unknown", isFinished: extra.state !== "Working",
  } : {};
  return { id, type, ...(content == null ? {} : { content }), completed: true,
    // Synthetic _e normalization, explicit at fixture construction time.
    ...(["exec","patch"].includes(type) ? {grouping:"groupable"} : {grouping:"standalone"}),
    ...(type === "exec" && extra.parsedCmd == null ? {parsedCmd} : {}), ...extra };
}

export function demoMessageEntry(role: "user" | "assistant", id: string, content: string,
  sourceFormat?: {isAeonFormatted:boolean}): ConversationRenderEntry {
  return demoEntry(id, {
    type: role === "user" ? "user-message" : "assistant-message",
    key: `block:${id}`,
    item: demoItem(id, role === "user" ? "userMessage" : "agentMessage",
      content, sourceFormat??{}),
  });
}

/** Synthetic *host-event* fixture: mutate one canonical assistant item while
 * preserving its id/turnKey and completed=false, exactly as actual source
 * subscription updates would. This does not use a fake second transcript. */
export function demoStreamingCodeEntry(id:string,text:string,completed=false):ConversationRenderEntry {
  return demoEntry(id,{
    type:"assistant-message",key:`block:${id}`,
    item:demoItem(id,"agentMessage",text,{completed}),
  });
}
export function updateDemoStreamingCodeEntry(
  source:DemoSource,id:string,text:string,completed=false,
):void {
  const previous=source.getSnapshot().entries;
  source.update({entries:previous.map(entry=>{
    if(entry.turnId!==id)return entry;
    return {...entry,turn:{
      ...entry.turn,
      demoBlocks:[{type:"assistant-message",key:`block:${id}`,
        item:demoItem(id,"agentMessage",text,{completed})}],
    }};
  })});
}

/** Explicit host event fixture for original D's automatic review summary.
 * This is never an approval *request* or permission grant and sends no RPC. */
export type DemoAutomaticReviewStatus="inProgress"|"denied";
export function demoAutomaticReviewEntry(
  turnId:string,status:DemoAutomaticReviewStatus,
):ConversationRenderEntry{
  return demoActivityEntry(turnId,[demoItem(turnId+"-review",
    "demo-approval-expandable",undefined,{
      heading:"自动审阅状态（模拟）",
      state:status==="inProgress"?"Working":"Needs input",
      demoAutomaticReviewStatus:status,
      demoAutomaticReviewRiskLevel:"high",
    })]);
}
export function updateDemoAutomaticReviewEntry(
  source:DemoSource,turnId:string,status:DemoAutomaticReviewStatus,
):void{
  const current=source.getSnapshot().entries;
  const replacement=demoAutomaticReviewEntry(turnId,status);
  source.update({entries:current.map(entry=>
    entry.turnId===turnId
      ? {...entry,turn:{...entry.turn,demoBlocks:replacement.turn?.demoBlocks}}
      : entry,
  )});
}

/** Explicitly synthetic MCP pending-request test data.
 * Never represents a real Agent approval and grants no permission. */
export function demoMcpApprovalEntry(turnId:string,disabled=false):ConversationRenderEntry{
  return demoActivityEntry(turnId,[
    demoItem(turnId+"-request","demo-mcp-approval",undefined,{
      heading:disabled?"MCP 宿主未授权（演示）":"MCP 请求确认（演示）",
      state:"Needs input",demoMcpApprovalDisabled:disabled,
    }),
  ]);
}

/** Source E Computer Use approval samples in the *existing* canonical
 * timeline. Metadata is synthetic and grants no real application access. */
/** Original at/urlAction mock request inside the canonical turn list. */
/** Original inline tool suggestion in the SAME canonical transcript.
 * This fixture is a visual test only; it cannot install or enable an app. */
/** Source Re biometric surface; browser fixture has no native provider. */
export function demoUserVerificationEntry(turnId:string):ConversationRenderEntry{
 return demoActivityEntry(turnId,[
   demoItem(turnId+"-request","demo-user-verification",undefined,{
     heading:"身份验证请求（模拟）",state:"Needs input",
   }),
 ]);
}
export function demoToolSuggestionEntry(
 turnId:string,target:"connector"|"plugin"="connector",
 action:"install"|"enable"="install",
):ConversationRenderEntry{
 return demoActivityEntry(turnId,[
   demoItem(turnId+"-request","demo-tool-suggestion",undefined,{
     heading:"工具建议（模拟）",state:"Needs input",
     demoToolSuggestionType:target,demoToolSuggestionAction:action,
   }),
 ]);
}

export function demoUrlActionEntry(turnId:string):ConversationRenderEntry{
  return demoActivityEntry(turnId,[
    demoItem(turnId+"-request","demo-url-action",undefined,{
      heading:"URL action（模拟）",
      state:"Needs input",
    }),
  ]);
}

export function demoBrowserWebsiteApprovalEntry(
  turnId:string,allowAllSites:boolean,
):ConversationRenderEntry{
  return demoActivityEntry(turnId,[
    demoItem(turnId+"-request","demo-browser-website-approval",undefined,{
      heading:"Browser 网站访问授权（模拟）",
      state:"Needs input",demoBrowserWebsiteAllSites:allowAllSites,
    }),
  ]);
}

export function demoComputerUseApprovalEntry(turnId:string,highRisk=false):ConversationRenderEntry{
  return demoActivityEntry(turnId,[
    demoItem(turnId+"-request","demo-computer-use-approval",undefined,{
      heading:highRisk?"Computer Use 高风险请求（模拟）":"Computer Use 首次授权（模拟）",
      state:"Needs input",demoComputerUseHighRisk:highRisk,
    }),
  ]);
}

export function demoActivityEntry(id: string, items: ConversationMessageItem[], title?: string): ConversationRenderEntry {
  return demoEntry(id, { type: "agent-activity", key: `block:${id}`, items: items.map((item) => title == null ? item : { ...item, heading: title }) });
}

export function demoEntry(id: string, block: ConversationTranscriptBlock, estimate = 136): ConversationRenderEntry {
  return {
    turnId: id,
    turnSearchKey: id,
    estimatedHeightPx: estimate,
    isLatestTurn: false,
    turn: { items: [], status: "completed", demoBlocks: [block] },
  };
}

const fixtureTurnDependencies: Dependencies = {
  isAutomationNamespaceTool: () => false,
  parseUpNextStatus: () => undefined,
  getCloudAutomation: () => null,
  // Explicit _e host metadata also marks eligible final messages standalone.
  getActivityMetadata: item => typeof item.grouping === "string" ? { grouping: item.grouping } : null,
  // The original canGroupActivityWithNext is private. This fixture deliberately
  // marks the boundary once at the first command after commentary, then N
  // groups the subsequent commands+patch together. It is NOT a host rule.
  canGroupActivityWithNext: () => false,
};
export function demoRawTurnEntry(id: string, items: TurnItem[]): ConversationRenderEntry {
  return {
    ...demoEntry(id, {type:"agent-activity", key:"unused:" + id, items: []}, 340),
    turn: { items, status: "completed" },
  };
}
export function getDemoBlocks(
 entry:ConversationRenderEntry,
 historical?:SourceHistoricalTurnSnapshot<ConversationMessageItem>|null,
):readonly ConversationTranscriptBlock[] {
 if(entry.turn == null && historical?.loaded === true && entry.historyEntityKey != null){
   const items=selectSourceHistoricalTurnItems(historical,entry.turnItemIds);
   return projectSourceTurnTranscriptBlocks({
     turnId:entry.turnId??entry.turnSearchKey??"history",
     items:items as TurnItem[],
     status:historical.status??"completed",
     mode:entry.isLatestTurn?"latest":"all",
     dependencies:fixtureTurnDependencies,
   });
 }
  const items: unknown = entry.turn?.items;
  if (Array.isArray(items) && items.length > 0) {
    return projectSourceTurnTranscriptBlocks({
      turnId: entry.turnId ?? entry.turnSearchKey ?? "unknown",
      items: items as TurnItem[],
      status: entry.turn?.status ?? "completed",
      mode: entry.isLatestTurn ? "latest" : "all",
      dependencies: fixtureTurnDependencies,
    });
  }
  const value: unknown = entry.turn?.demoBlocks;
  return Array.isArray(value) ? value as ConversationTranscriptBlock[] : [];
}

const seedTime = Date.parse("2026-10-21T09:00:00+09:00");

function frontendScenario(): ConversationRenderEntry[] {
  return [
    demoMessageEntry("user", "intro", "继续 Codex 前端恢复。先把之前的会话模型和 React 虚拟列表真正接起来。"),
    demoMessageEntry("assistant", "response-intro", "当前已经具备 **会话数据源、条目编排、虚拟列表和消息渲染适配器**。\n\n这次把它们组合成一个能够启动的 **React 演示宿主**。消息使用模拟数据，不连接后端。"),
    demoActivityEntry("inspect", [demoItem("inspect1", "exec", undefined, {
      heading: "读取模块与状态", command: "ls src/components && cat reports/STATUS.md", output: "ConversationMessageBlocks.tsx\nVirtualizedTurnList.tsx\nConnectedLiveConversationTranscript.tsx", state: "Ready",
    })]),
    demoActivityEntry("batch-tools", [
      demoItem("batch-a", "exec", undefined, {heading:"读取第一份源码证据（模拟）",command:"cat original-signatures.txt",output:"source: Xe, We, nk",state:"Ready"}),
      demoItem("batch-b", "exec", undefined, {heading:"核对分组状态（模拟）",command:"node scripts/audit-agent-activity-evidence.mjs",output:"signature audit: demo fixture",state:"Ready"}),
    ]),
    demoMessageEntry("user", "ask-testing", "我们需要看到核心测试是否真的能通过。"),
    demoActivityEntry("test", [demoItem("test1", "exec", undefined, {
      heading: "执行核心测试", command: "npm run test:core", output: "# tests 140\n# pass 140\n# fail 0", state: "Ready",
    })]),
    demoMessageEntry("assistant", "test-response", "已有模块的核心测试报告为 **140/140**。\n\n但必须区分：\n- ✅ 算法和模型的核心单元测试\n- ⚠️ 真实 React 页面运行与 UI 比对，仍需独立验证"),
    demoMessageEntry("user", "ask-diff", "给我看看文件修改和审批状态在会话里怎样展示。"),
    demoActivityEntry("diff", [demoItem("review1", "demo-file-review", undefined, {
      heading: "查看文件改动", filePath: "src/conversation/LiveConversationSource.ts", state: "Ready",
    })]),
    demoActivityEntry("approval", [demoItem("approval1", "demo-approval", undefined, {
      heading: "审批请求（展示示例）", state: "Needs input",
    })]),
    demoMessageEntry("assistant", "diff-response", "上面使用恢复的 `InlineFileReview` 和 `AutomaticApprovalReviewList` 组件。**接受 / 编辑不会修改磁盘**；演示只能查看或触发明确标记的模拟操作。"),
    demoMessageEntry("user", "ask-render", "现在消息正文和代码块可以展示吗？"),
    demoMessageEntry("assistant", "markdown-sample", "可以。演示宿主使用独立的 Markdown 渲染器，不冒充 Codex 私有实现。\n\n```tsx\n<ConnectedLiveConversationTranscript\n  source={demoSource}\n  RowComponent={RecoveredRow}\n  scrollController={browserScrollController}\n/>\n```\n\n**下一步** 是 Composer 与 Electron/Agent 通信。"),
    demoActivityEntry("tools", [demoItem("tool1", "exec", undefined, {
      heading: "连接真实会话渲染链路", command: "npm run demo:build", output: "Build is checked on your local machine after npm install.", state: "Ready",
    })]),
    demoMessageEntry("assistant", "last", "这是一套 **Codex 风格集成演示**：当前可验证的是组件如何协作，而不是完成了原版全部功能。可以点击左侧会话、滚动历史、查看审批和 Diff，或者在下面的输入区体验模拟发送。"),
  ];
}

/** Explicit synthetic turn history payload; identical IDs in the Y base
 * turn and the subscription. Production reads history from a host query. */
export function getDemoHistoryTurnItems(): TurnItem[] {
 return [
  demoItem("history-visible-user","user-message",
   "这是历史记录的用户消息（模拟），不是内联 turn 内容"),
  demoItem("history-visible-command","exec",undefined,{
   command:"git status --porcelain",state:"Ready",
  }),
  demoItem("history-visible-command-b","exec",undefined,{
   command:"git diff --stat",state:"Ready",
  }),
  demoItem("history-visible-answer","assistant-message",
   "历史正文已通过订阅恢复（模拟事件）",{
    phase:"final_answer",completed:true,
  }),
 ];
}

function reviewScenario(): ConversationRenderEntry[] {
  return [
    // Explicit source isAeonFormatted flag: test fixture for original
    // compact Rt branch, not a claim that every review conversation is Aeon.
    demoMessageEntry("user", "review-intro", "我想核对工具状态、文件差异和权限审批是否分开展示。",
      {isAeonFormatted:true}),
    demoMessageEntry("assistant", "review-response", "把任务分成 **工具活动、修改审阅和审批** 三种不同条目，而不是把所有输出混在一段文本里。"),
    demoActivityEntry("review-exec", [demoItem("review-exec1", "exec", undefined, {
      heading: "读取项目结构（模拟）",
      command: "powershell.exe -NoProfile", cmd: "powershell.exe -NoProfile",
      commandActions:[
        {command:"cmd.exe /c"},{command:"Get-ChildItem src -File"},{command:"pwsh.exe -NoProfile"},
      ],
      output: "src/components/\nsrc/conversation/\nsrc/index.ts", state: "Ready",
    })]),
    // Synthetic UI-only fixtures exercise the source ZC/QC/$C script labels.
    // They do not launch commands or imply that a real skill script ran.
    demoActivityEntry("review-skill-script-running", [demoItem("review-skill-script-running1", "exec", undefined, {
      heading: "Skill 脚本后台运行（模拟）",
      command: "python3 -u /workspace/.agents/skills/repo_audit/scripts/check.py",
      cmd: ["python3", "-u", "/workspace/.agents/skills/repo_audit/scripts/check.py"],
      output: "正在检查源码签名（模拟输出）", state: "Working", processId: 4242,
    })]),
    demoActivityEntry("review-skill-script-finished", [demoItem("review-skill-script-finished1", "exec", undefined, {
      heading: "Skill 脚本后台结束（模拟）",
      command: "python3 -u /workspace/.agents/skills/repo_audit/scripts/check.py",
      cmd: ["python3", "-u", "/workspace/.agents/skills/repo_audit/scripts/check.py"],
      output: "源码签名检查完成（模拟输出）", state: "Ready", processId: 4243,
    })]),
    // Synthetic patch fixture for the source-shaped PT/IT leaf. It does not
    // modify the demo project or invoke a host file API.
    demoActivityEntry("review-patch", [demoItem("review-patch1", "patch", undefined, {
      heading: "演示文件修改", approvalRequestId: "demo-approval-1", state: "Needs input",
      grantRoot: "/projects/agent-web",
      visualizationActivities: [{ kind: "update" }],
      changes: {
        "src/conversation/ToolActivityHistorySource.ts": {
          type: "update",
          unified_diff: [
            "--- a/src/conversation/ToolActivityHistorySource.ts",
            "+++ b/src/conversation/ToolActivityHistorySource.ts",
            "@@ -1,2 +1,14 @@",
            " export const source = null;",
            "-export const oldSource = null;",
            "+export const source = createToolActivityHistorySource();",
            "+// Preserve the source-derived viewport height while exercising real scroll.",
            "+export const historyLine01 = 1;",
            "+export const historyLine02 = 2;",
            "+export const historyLine03 = 3;",
            "+export const historyLine04 = 4;",
            "+export const historyLine05 = 5;",
            "+export const historyLine06 = 6;",
            "+export const historyLine07 = 7;",
            "+export const historyLine08 = 8;",
            "+export const historyLine09 = 9;",
            "+export const historyLine10 = 10;",
            "+export const historyLine11 = 11;",
            "+export const historyLine12 = 12;",
          ].join("\n"),
        },
        "src/components/CodexSourceToolActivityLeaves.tsx": {
          type: "add",
          content: "export function CodexSourcePatchLeaf() {\n  return null;\n}\n",
        },
        "assets/preview.bin": {
          type: "update",
          unified_diff: "Binary files a/assets/preview.bin and b/assets/preview.bin differ",
        },
      },
    })]),
    demoActivityEntry("review-diff", [demoItem("review-diff1", "demo-file-review", undefined, {
      heading: "审阅变更（只读）", filePath: "src/components/VirtualizedTurnList.tsx", state: "Ready",
    })]),
    demoActivityEntry("review-approval", [demoItem("review-approval1", "demo-approval-expandable", undefined, {
      heading: "需要明确授权", state: "Needs input",
    })]),
    // Three source-shaped xC leaf variants; all records are synthetic and read-only.
    demoActivityEntry("review-exploration", [
      demoItem("review-read1", "exec", undefined, {
        heading: "读取文件", state: "Ready", cwd: "/projects/agent-web",
        parsedCmd: { type: "read", isFinished: true, name: "ToolActivityHistorySource.ts", path: "src/conversation/ToolActivityHistorySource.ts" },
      }),
      demoItem("review-search1", "exec", undefined, {
        heading: "搜索代码", state: "Ready",
        parsedCmd: { type: "search", isFinished: true, query: "useSyncExternalStore", path: "src/components" },
      }),
      demoItem("review-list1", "exec", undefined, {
        heading: "列出文件", state: "Ready",
        parsedCmd: { type: "list_files", isFinished: true, path: "src/conversation" },
      }),
    ]),
    // Source Je/bg repeated MCP grouping in the *existing* agent activity
    // renderer. Eligibility is marked explicitly by this synthetic host.
    demoActivityEntry("review-repeated-mcp", [
      demoItem("repeat-a","mcp-tool-call",undefined,{
        grouping:"groupable",completed:true,source:null,
        invocation:{server:"fixture-files",tool:"search",arguments:{query:"agent"}},
        functionName:"files.search",appContext:{connectorId:"file-connector",linkId:"link"},
        result:{type:"success",content:[]},demoSafeMcpResult:true,
        demoToolDisplaySignature:"Files search",
        toolDisplay:{invoked:"已搜索资料",invoking:"正在搜索资料",title:"资料搜索"},
      }),
      demoItem("repeat-b","mcp-tool-call",undefined,{
        grouping:"groupable",completed:true,source:null,
        invocation:{server:"fixture-files",tool:"search",arguments:{query:"codex"}},
        functionName:"files.search",appContext:{connectorId:"file-connector",linkId:"link"},
        result:{type:"success",content:[]},demoSafeMcpResult:true,
        demoToolDisplaySignature:"Files search",
        toolDisplay:{invoked:"已搜索资料",invoking:"正在搜索资料",title:"资料搜索"},
      }),
      demoItem("repeat-barrier","mcp-tool-call",undefined,{
        grouping:"groupable",completed:false,source:null,
        invocation:{server:"fixture-files",tool:"search",arguments:{query:"pending"}},
        functionName:"files.search",appContext:{connectorId:"file-connector",linkId:"link"},
        demoSafeMcpResult:true,demoToolDisplaySignature:"Files search",
        toolDisplay:{invoking:"正在搜索资料",title:"资料搜索"},
      }),
      demoItem("repeat-c","mcp-tool-call",undefined,{
        grouping:"groupable",completed:true,source:null,
        demoRecognizedActionLabel:"已搜索文件",
        invocation:{server:"fixture-files",tool:"search",arguments:{query:"after"}},
        functionName:"files.search",appContext:{connectorId:"file-connector",linkId:"link"},
        result:{type:"success",content:[]},demoSafeMcpResult:true,
        demoToolDisplaySignature:"Files search",
      }),
      demoItem("repeat-d","mcp-tool-call",undefined,{
        grouping:"groupable",completed:true,source:null,
        demoRecognizedActionLabel:"已搜索文件",
        invocation:{server:"fixture-files",tool:"search",arguments:{query:"next"}},
        functionName:"files.search",appContext:{connectorId:"file-connector",linkId:"link"},
        result:{type:"success",content:[]},demoSafeMcpResult:true,
        demoToolDisplaySignature:"Files search",
      }),
      // Source V_ fixture: two adjacent incoming events, then subscription
      // closure which Je must keep outside the repeated disclosure.
      demoItem("external-a","external-event",undefined,{
        grouping:"groupable",sourceKey:"fixture-slack",sourceLabel:"Slack",
        subscriptionEnded:false,heading:"收到事件 A",state:"Ready",
      }),
      demoItem("external-b","external-event",undefined,{
        grouping:"groupable",sourceKey:"fixture-slack",sourceLabel:"Slack",
        subscriptionEnded:false,heading:"收到事件 B",state:"Ready",
      }),
      demoItem("external-ended","external-event",undefined,{
        grouping:"groupable",sourceKey:"fixture-slack",sourceLabel:"Slack",
        subscriptionEnded:true,heading:"订阅结束",state:"Ready",
      }),
    ]),
    // DEMO-only source Ke/fr + qe visibility case. It is forced through the
    // latest renderer without changing the existing actual latest review turn.
    {...demoActivityEntry("review-source-ke-qe",[
      demoItem("source-old-finished","exec",undefined,{
        grouping:"groupable",state:"Ready",command:"git status",
        demoLatestSourceVisibility:true,
      }),
      demoItem("source-divider","assistant-message"," ",{
        grouping:"standalone",completed:false,
      }),
      demoItem("source-running-command","exec",undefined,{
        grouping:"groupable",state:"Working",command:"npm run build",
        heading:"运行中（模拟）",
      }),
      demoItem("source-hidden-visualize-read","exec",undefined,{
        grouping:"groupable",parsedCmd:{type:"read",path:".codex/skills/visualize/SKILL.md",isFinished:true},
      }),
      // Ordinary skill reads must remain; qt only recognizes visualize.
      demoItem("source-ordinary-skill-read","exec",undefined,{
        grouping:"groupable",state:"Ready",
        parsedCmd:{type:"read",path:".codex/skills/ordinary/SKILL.md",isFinished:true},
      }),
      demoItem("source-hidden-visualization-command","exec",undefined,{
        grouping:"groupable",state:"Ready",command:"touch .codex/visualizations/preview.html",
        demoSuccessfulExecution:true,
      }),
      demoItem("source-patch-with-visualization","patch",undefined,{
        grouping:"groupable",success:true,changes:{},
        visualizationActivities:[{path:"preview.tsx",kind:"create"}],
      }),
    ])},
    // Explicit qn/Qr **frontend subscription** fixture, not a live Agent.
    // This historical turn has the same query identities as Fc. Both tool
    // leaves are completed; only the turn status/up-next stream controls qe.
    {...demoActivityEntry("review-live-turn-state",[
      demoItem("live-turn-command-a","exec",undefined,{
        state:"Ready",command:"git status --short",startsGroup:true,
      }),
      demoItem("live-turn-command-b","exec",undefined,{
        state:"Ready",command:"git diff --stat",
      }),
    ]),historyEntityKey:"fixture-live-turn-history",
       preserveServerUserMessages:true,
       turn:{items:[],status:"inProgress",demoBlocks:[{
         type:"agent-activity",key:"block:review-live-turn-state",items:[
           demoItem("live-turn-command-a","exec",undefined,{state:"Ready",command:"git status --short",startsGroup:true}),
           demoItem("live-turn-command-b","exec",undefined,{state:"Ready",command:"git diff --stat"}),
         ],
       }]}},
    // Original Y history-summary path: its turn content is *removed* from
    // the projected virtual row. A host subscription restores these same items.
    {...demoRawTurnEntry("review-history-hydration",getDemoHistoryTurnItems()),historyEntityKey:"fixture-history-content"},
    // Source kk/Rk/SG working-time branch: explicitly synthetic timestamps,
    // not a hardcoded title subtitle or an Agent-derived wall-clock claim.
    demoActivityEntry("review-work-status",[
      demoItem("review-work-status-command","exec",undefined,{
        command:"git diff --stat",state:"Ready",
      }),
      demoItem("review-work-status-duration","worked-for",undefined,{
        status:"worked",startedAtMs:1_000,completedAtMs:132_000,
      }),
    ]),
    demoMessageEntry("assistant", "review-final", "**演示不会触发真实权限变更。** 与 Agent 后端接入时，需要在宿主层明确实现权限校验、授权请求和执行回调。"),
    // Real source turn.items fixture: commentary, command group, file patch,
    // and final answer share ONE virtualized row, unlike former mock turns.
    demoRawTurnEntry("review-workflow", [
      demoItem("workflow-commentary","assistant-message","下面仅用于验证连续工具活动的组件接线（模拟数据，不执行命令）。",
        {phase:"commentary",completed:true}),
      demoItem("workflow-command-a","exec",undefined,{state:"Ready",command:"Get-Content src/conversation/AgentActivityUnitGrouping.ts",output:"// fixture read",demoCombinedTraceKey:"review-workflow-trace"}),
      demoItem("workflow-command-b","exec",undefined,{state:"Ready",command:"git diff --check",output:"fixture: no whitespace errors"}),
      demoItem("workflow-command-c","exec",undefined,{state:"Ready",command:"npm run test:core",output:"fixture: tests passed"}),
      demoItem("workflow-patch","patch",undefined,{
        // A genuine split boundary reaches the N model, but source ek/ok
        // recombines it only because this fixture supplies an explicit trace.
        startsGroup:true,
        success:true,state:"Ready",
        changes:{
          "src/conversation/AgentActivityUnitGrouping.ts":{
            type:"update",
            unified_diff:[
              "--- a/src/conversation/AgentActivityUnitGrouping.ts",
              "+++ b/src/conversation/AgentActivityUnitGrouping.ts",
              "@@ -1,3 +1,17 @@",
              " export const grouping = 'original';",
              "-export const expanded = false;",
              "+export const expanded = true;",
              "+// Source N preserves a contiguous group across compatible items.",
              "+export const line01 = 1;",
              "+export const line02 = 2;",
              "+export const line03 = 3;",
              "+export const line04 = 4;",
              "+export const line05 = 5;",
              "+export const line06 = 6;",
              "+export const line07 = 7;",
              "+export const line08 = 8;",
              "+export const line09 = 9;",
              "+export const line10 = 10;",
              "+export const line11 = 11;",
            ].join("\n"),
          },
          "src/components/CodexActivityGroupRow.tsx":{
            type:"update",
            unified_diff:[
              "--- a/src/components/CodexActivityGroupRow.tsx",
              "+++ b/src/components/CodexActivityGroupRow.tsx",
              "@@ -1,3 +1,3 @@",
              " const oldHeight = 120;",
              "-const overflow = 'visible';",
              "+const overflow = 'auto';",
              " const keepNestedScroll = true;",
            ].join("\n"),
          }
        }
      }),
      
      demoItem("workflow-answer","assistant-message","模拟活动已结束。命令和文件差异共享同一条活动时间线，审批与文件操作不会写入磁盘。",
        {phase:"final_answer",completed:true,grouping:"standalone"}),
    ]),
  ];
}

export function initialDemoEntries(id: DemoConversationId): ConversationRenderEntry[] {
  const source = id === "frontend" ? frontendScenario() : reviewScenario();
  return source.map((entry, index) => ({
    ...entry,
    isLatestTurn: index === source.length - 1,
    turn: { ...entry.turn!, turnStartedAtMs: seedTime + index * 75_000 },
  }));
}

export function createDemoSource(id: DemoConversationId): DemoSource {
  return createLiveConversationSource({
    conversationId: id,
    entries: initialDemoEntries(id),
    connectionState: "connected",
    loadingHistory: false,
    projection: { conversationId: id, hostId: "demo-host", cwd: "/projects/agent-web", showFullTranscript: true },
  });
}

/** The source update, rather than a second local UI list, drives React subscriptions. */
export function appendDemoEntries(source: DemoSource, additional: ConversationRenderEntry[]): void {
  if (additional.length === 0) return;
  const current = source.getSnapshot().entries;
  source.update({ entries: [
    ...current.map((entry) => entry.isLatestTurn ? { ...entry, isLatestTurn: false } : entry),
    ...additional.map((entry, index) => ({ ...entry, isLatestTurn: index === additional.length - 1 })),
  ] });
}

export function makeLongHistory(count = 45): ConversationRenderEntry[] {
  const rows: ConversationRenderEntry[] = [];
  for (let i = 1; i <= count; i += 1) {
    const id = `history-${i}`;
    rows.push(i % 3 === 0
      ? demoActivityEntry(id, [demoItem(`${id}-tool`, "exec", undefined, {
        heading: `历史工具活动 ${i}`, command: `git show --stat demo-${i}`, output: `Mock output line ${i}`, state: "Ready",
      })])
      : demoMessageEntry(i % 2 === 0 ? "user" : "assistant", id,
        i % 2 === 0 ? `这是第 ${i} 条模拟历史消息，用于测试虚拟列表。` : `第 ${i} 条历史回复：滚动后行应能按需挂载和测量高度。`));
  }
  return rows;
}
