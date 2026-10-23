# AgentActivity 原始事件分类：xe / we / Te / O / D

## 编译源码依据

输入为用户提供的原始 `frontend/webview/assets/inline-followup-markdown-4751fe20f26d.js`，SHA256：
`b2a356e8c59b592f16514e9c160cacbbeebfedf0c18b87699564f8c20705fa0b`。

```bash
node scripts/audit-agent-activity-raw-classifier-evidence.mjs /path/to/frontend/webview/assets/inline-followup-markdown-4751fe20f26d.js
```

原版 JS 不存入公开仓库。此批审计源函数签名，不等于逐行语义完全等价。

## 已实施并真实接线的部分

- `AgentActivityRawClassifier.ts` 基于原版 `xe` 对 `exec`、`patch`、`mcp-tool-call`、`external-event`、`automatic-approval-review`、`web-search` 和明确的非工具事件分类；
- `D/Ce` 识别不包含写入参数的远程 `curl`，仅用于统计，不执行命令；
- `Te/O` 汇总文件操作与已拒绝/超时的审批；`we` 对探索活动的 search/read/list_files/tool-loader 计数；
- `demo/adapters.tsx` 不再直接手工计算 exec/web-search 的 `AggregateUnit`，改为 **xe → Le/Be/Ve → projectCompletedGroupHeaderParts**，实际喂给现有 React 活动组标题；
- 回归测试覆盖完成/执行中、取消的补丁、curl 本地/写入过滤、MCP source、审批与探索行，以及对已有活动组的聚合。

## 未确认的私有依赖（必须继续逆向）

`x` 工具读取检测、`ue/y` 可视化命令、`he/pe` MCP 保留/隐藏、`ne/T` MCP 来源、`S` 扩展事件、`oe/ye` 精确 Diff 计数、`g/Ee` 路径解析都还由宿主回调负责。**缺失回调时不会猜测来源或 Diff 计数。**

此外，工具详情叶子组件 `fk`、审批动作、图标和完整原版布局、Electron/Agent IPC 仍未实施。这不是完成了完整的原版 Codex UI。
