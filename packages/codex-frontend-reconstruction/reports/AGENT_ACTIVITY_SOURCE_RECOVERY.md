# AgentActivity 源码级恢复 · 第一批（2026-10-21）

## 原始证据和版本边界

只使用用户私下提供的 `frontend.zip` 中原始编译资源。**这些原版资源没有提交到公开的 GitHub**。原始字节 SHA-256：

| 文件 | SHA-256 |
|---|---|
| `sites-end-resource-fa77a923096d.js` | `a84b2e2181125a3e4d2bc9be458bad4fb36df615243c7f3cc23e076bd4094708` |
| `local-conversation-turn-69783815d57d.js` | `e40ee63884bc75af917583fe70afade4b6c683adbd93d9536b7636eb6d8f54d4` |
| `agent-activity-item-1be092f0c744.js` | `e64adbffa15ebaa08ffd854743e1409325303481313656bf6749407b4c53d1ca` |

复核命令（传入**解压后的原始** `frontend/webview/assets` 路径）：

```bash
node scripts/audit-agent-activity-evidence.mjs /path/to/frontend/webview/assets
```

## 已确认的源码结构

- `local-conversation-turn` 中活动条目经 `hn` 拆分、`Wa` 转换后交给 `ga`；导入解析为 `sites-end-resource` 导出的 `ek`（活动单位列表）。
- `sites-end-resource` 的 `Rk` 负责已读/未读场景下的活动收起，`Lk` 用 `hasFinalAssistantStarted`、`isTurnCancelled`、`allowCollapseBeforeFinal` 等计算折叠资格。
- `kk` 产生 `collapsibleUnits`、`expandedUnits`、`persistentUnits`、`preToggleUnits` 和 `workedForItem`。这**不是**“把所有工具行放到一个 details 里面”的简单逻辑。
- `Ak` 对未完成输入响应、MCP、dynamic tool、助手和待发用户消息有不同的持久显示谓词。`lg` / `ki` / `Eg` / widget 检测等不可直接从此局部模块确证，严格交由宿主适配器，没有伪造。
- `Hk` 提供实际交互容器；原版还包含分阶段动画、预加载、被拒审批自动滚动以及使用外部 Store 维持内容的能力。此批**没有**声称恢复这些子系统。
- `Bk` 计算折叠条目数量，群组以实际条目数量计数。单独的 context-compaction 不显示空折叠按钮。

## 本批实际实施

1. `AgentActivityProjection.ts`：恢复 `Lk` / `kk` / `Bk` 可确认分区规则，并注入私有 `Ak` 谓词。
2. `CodexAgentActivity.tsx` + 独立 CSS：恢复 “折叠内容 + 持久内容 + 预切换内容” 的 React 接线；展开态由原始 turn state 或本地模拟状态控制。
3. `ConnectedConversationMessageRenderers.tsx` 在**显式 host.agentActivity 存在时**启用新结构，否则保留既有未完成接线，不造成上层 API 强行破坏。
4. `demo/adapters.tsx` 使用明确标注 **DEMO** 的 `toUnits` 和 `getCollapseContext`，模拟事件绝不执行真实命令、审批或者文件变更。
5. 新增模型测试和 Chromium 交互测试，保留原有虚拟列表与 Composer 等测试。

## 尚未恢复，不应冒充原版

- `Wa` 的完整动态分组、`hg` / `Sg` 的工具活动摘要、按命令分类的图标和私有标题本地化。
- 审批详情、FileDiff、MCP widgets / subagent 混排的全部实际原版视觉组件。
- 原版 `Hk` 的动画、预加载、被拒审批自动滚动、持久折叠状态与宿主数据库/Electron 通信。
- 当前模拟对话不携带原版活动元数据，**折叠资格判断由 demo 宿主明确指定**，不能据此声称真正的 Codex 事件接线完成。
- 原版截图的像素级对齐仍未验证。同尺寸同数据截图与原版安装版本指纹需单独验收。

下阶段优先继续 `hg`/`Sg` 摘要算法、`nk` 的子行与活动状态组件、持久折叠状态存储适配器。不得重复建立平行的演示 UI。
