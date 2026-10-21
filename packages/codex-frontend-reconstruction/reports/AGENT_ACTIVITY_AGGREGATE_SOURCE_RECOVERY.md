# AgentActivity 计数聚合：Le / Re / ze / Be / Ve

## 证据与范围

用户提供的原版 `inline-followup-markdown-4751fe20f26d.js` SHA-256:
`b2a356e8c59b592f16514e9c160cacbbeebfedf0c18b87699564f8c20705fa0b`。
运行 `node scripts/audit-agent-activity-aggregate-evidence.mjs <原版文件路径>` 可复核哈希与 22 个源码签名。
原始编译 JS 不上传到公开仓库。

原版 `Le` 建立聚合状态（`ze`），通过 `Re` 选择支持的单元，经 `Be` 分类型累加并由 `Ve` 输出统计字段。`Z/He` 对审批失败 ID 去重。

## 本阶段实际代码

- `AgentActivityAggregate.ts`: 对已经标准化的 exploration、patch、exec、automatic-approval-review、mcp-tool-call、web-search 单元完成路径集合去重、运行中数量、visualization 合并、审批状态去重、MCP 来源合并及首次出现顺序。
- `demo/adapters.tsx`: 使用明确标注的 **DEMO** 类型映射产出 `AggregateUnit`，调用已经恢复的 `aggregateAgentActivityUnits`，再交给上一阶段的 `projectCompletedGroupHeaderParts` 输出组标题。之前的手工命令计数不再使用。
- 新增 12 项纯模型测试，延续已有 React 活动列表和两层展开结构。

## 没有恢复、不可混淆

`xe` 从原版原始 exec/patch/MCP 事件到标准化单元的**完整分类器**仍未实现。原版 `Re` 的未知项依赖私有 `S`，只通过宿主适配器暴露边界，绝不把模拟映射冒充原版分类。

`Me/Ne/Pe` 来源与图标、完整 `Sg` 排版、`fk` ToolActivity 详情、审批回写、Electron 事件和同数据视觉对照仍未完成。通过核心测试不意味着 UI 像素级一致。

## 验证

```bash
cd packages/codex-frontend-reconstruction
node scripts/audit-agent-activity-aggregate-evidence.mjs /path/to/inline-followup-markdown-4751fe20f26d.js
npm run test:core
npm run demo:check-model
npm run demo:build
npm run demo:test:e2e
```
