# AgentActivity 组摘要与工具子行 · 源码逆向恢复第二批（2026-10-21）

## 1. 基线及原版资源

- GitHub 继续基于 `wwxst/agent-web` 的 `recovery/codex-frontend-through-connected-message-20261021`，前一批基线提交 `9beee26d61d39ef945d39a4420be8ebb12a0f5b4`。
- 本阶段从用户私下提供的原版 `frontend.zip` 中定位原始 `inline-followup-markdown-4751fe20f26d.js`（SHA-256 `b2a356e8c59b592f16514e9c160cacbbeebfedf0c18b87699564f8c20705fa0b`）和 `sites-end-resource-fa77a923096d.js`（SHA-256 `a84b2e2181125a3e4d2bc9be458bad4fb36df615243c7f3cc23e076bd4094708`）。注意：这两个文件是**原版编译 JS**，不是可直接复用的原作者 TSX。
- 只提取可在原始编译资源中定位的行为，复核：`node scripts/audit-agent-activity-group-evidence.mjs <原始 webview/assets 目录>`。审计会验证哈希及 **27 个**结构标志。原始字节仅在本地使用，**不得提交到公开仓库**。

## 2. 确认恢复的逻辑

| 原版函数 | 当前文件 | 确认的行为 |
|---|---|---|
| `Xe`（由 `sites-end-resource` 以 `hg` 导入）、`Ze`、`Q`、`K`、`I` | `AgentActivityGroupPresentation.ts` | 活动组状态 `summary` / `active` / `thinking`；仅最新、正在运行且未关闭活动片段时使用动态状态；倒序取最后一个未完成条目，审批请求显示 Thinking；探索模式采用尾部 `exec` 的 `read/search/list_files` 优先/回退规则 |
| `sk`（由 `ak` 渲染） | 同上 | `STEPS_PROSE` 时显示 `Running command`，其他细节等级使用 `Running {command}`；补丁操作显示 `Editing files`；Web Search 标题与查询消息 ID 的优先级 |
| `je`（在 `We`/`Sg` 完成摘要路径中使用） | 同上 | 已由宿主计算的 `ToolActivitySummary` 中，各完成态摘要部分的**真实顺序**、零值抑制和命令/文件数量扣减规则 |
| `Ye` | 同上 | 完成态单项 `group` 降级为 `standalone`；未完成、跨文件 patch、含 visualization 的 patch 不降级 |
| `nk` → `ak` → `A_` | `CodexActivityGroupRow.tsx` | 将上述状态变成**同一条会话渲染链路**中的组标题与独立子行开合；本地默认折叠（和 `A_` 的默认分支一致），native button + `aria-expanded` |

`ConnectedConversationMessageRenderers.tsx` 现在可选接入 `host.agentActivity.groupHeader`，使组标题与子行使用真正的状态投影；如果宿主没有提供所需服务，仍走上一批的旧渲染路径，不伪造未恢复能力。**单项完成工具会根据 `Ye` 保持原有独立活动行**，不会被强行包装成另一个折叠容器。

演示适配器 `demo/adapters.tsx` 明确独立计算**模拟** ToolActivitySummary，仅用于验证 `je` 的展示次序和组件接线；演示条目也补上 `parsedCmd.isFinished`，使源码状态判断可以在模拟数据中正确工作。新增包含两个工具命令的**模拟**会话项，供浏览器真实点击检查。

## 3. 不属于本阶段的“已恢复”范围

- **`We`/`Sg` 完整聚合**：`xe` 的部分 `exec/patch/MCP` 类型解析、`Le/Be` 的工具状态归并、`Me/Ne/Pe` 的来源排序与图标选取，还依赖其他 Codex 私有方法和元数据。本阶段只是恢复其中可证明的 `je` 摘要顺序；不允许把演示产生的 aggregate 写成原版已恢复。
- **`nk` 的子行细节**：`mk/rk` 可展开资格、`bg` MCP 合并、`fk` / 完整 ToolActivity 详情视觉树、动态图标 `bv`、原版滚动渐变与动画仍由宿主负责。新增的子行容器使用独立 CSS，是语义恢复而非像素级还原。
- **动态工具名、本地化、图标**：未知 MCP/dynamic 仅返回 `host-required`，不假装具备原版名称或 UI。原版 `sk` 中由私有 `tO` 格式化的 Web Search 文案依赖传入回调；不能据此猜测查询格式。
- **状态和生命周期**：当前 demo `isActive` 不代表真实 Electron/Agent 执行流。没有连接原版回执、数据库折叠状态、审批回写或后端消息。
- 没有认证截图上的 Codex 安装版本和归档一致，也没有同一会话数据像素对比。

## 4. 验证与后续

本地本批应通过：`npm run test:core`（178/178）、`npm run demo:check-model`（4/4）、原始资源审计（27/27）。远端 GitHub Actions 还应安装完整 React/Vite、运行 `npm run demo:build` 和 Playwright，尤其确认**单项工具维持原样，多项工具组可独立展开/折叠，活动外层 Rk 折叠未倒退**。

下一步以源码追踪 `Le/Be` 的 `exec/patch` 汇总计数和 `fk` 的 ToolActivity 详情渲染为主，同时开始关联真实 `parsedCmd` / tool result 类型，优先替换 `demo/ActivityDetails`。保持 React 模块、测试和 Electron host 接口隔离，不修改 Agent 后端。
