/**
 * Deliberately synthetic data for the browser preview.
 * These are NOT Codex transcript records, live backend events, or recovered IPC data.
 */
import type { ConversationRenderEntry } from "../src/conversation/ConversationRenderEntriesModel.js";
import type { ConversationMessageItem, ConversationTranscriptBlock } from "../src/conversation/ConversationMessageRenderPlan.js";
import { createLiveConversationSource } from "../src/conversation/LiveConversationSource.js";

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
    ...(type === "exec" && extra.parsedCmd == null ? {parsedCmd} : {}), ...extra };
}

export function demoMessageEntry(role: "user" | "assistant", id: string, content: string): ConversationRenderEntry {
  return demoEntry(id, {
    type: role === "user" ? "user-message" : "assistant-message",
    key: `block:${id}`,
    item: demoItem(id, role === "user" ? "userMessage" : "agentMessage", content),
  });
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

export function getDemoBlocks(entry: ConversationRenderEntry): readonly ConversationTranscriptBlock[] {
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

function reviewScenario(): ConversationRenderEntry[] {
  return [
    demoMessageEntry("user", "review-intro", "我想核对工具状态、文件差异和权限审批是否分开展示。"),
    demoMessageEntry("assistant", "review-response", "把任务分成 **工具活动、修改审阅和审批** 三种不同条目，而不是把所有输出混在一段文本里。"),
    demoActivityEntry("review-exec", [demoItem("review-exec1", "exec", undefined, {
      heading: "读取项目结构", command: "find src -maxdepth 2 -type f", output: "src/components/\nsrc/conversation/\nsrc/index.ts", state: "Ready",
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
    demoMessageEntry("assistant", "review-final", "**演示不会触发真实权限变更。** 与 Agent 后端接入时，需要在宿主层明确实现权限校验、授权请求和执行回调。"),
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
    projection: { conversationId: id, cwd: "/projects/agent-web", showFullTranscript: true },
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
