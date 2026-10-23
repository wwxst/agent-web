# Codex Windows UI 源码对照复核报告（2026-10-21）

> 审计性质：**源码/截图/当前仓库的分层静态核查**，并非把全量 16,086 资源逐文件语义逆向。**没有**对这张截图对应的安装包做版本指纹确认，也**没有**完成同数据像素级基准比对。不得将「源码中存在字段」误称为「已经实现其行为」。

## 0. 输入与基线

- 原始用户提供的 `frontend.zip`：来自账号迁移包 02；选取的 JS/CSS 原始字节与历史提取缓存 SHA-256 一致。`frontend.zip` 解压物是编译结果，缺少原作者 TSX/Source Map。
- 重构仓库：`wwxst/agent-web`，分支 `recovery/codex-frontend-through-connected-message-20261021`，核查起点 **`edb4aecc3108a116e4a1d05744bb51dee847d31e`**（PR #1，`main` 仍是独立基线）。本地依据为 `agent-web-source-first-full.zip`。
- 原版 UI 参考：**本轮用户提供 1090×760 截图**（不进入公共仓库，截图可能包含个人会话/项目资料）。对照的浏览器演示截图为之前 CI 生成的 1352×760 和源代码接线后的实际截图。画面内容/主题可能不同，当前**无法判定截图的安装版本是否与归档的编译资源完全相同**。
- 原版关键文件 SHA-256：
  - `app-initial-5851df3f6cb1.js`: `c70d95da34ba7e5962a559dbf68d0102d10b4b47b877f5d9933629bb5a1f3a10`
  - `app-initial-e7c27dd40beb.css`: `6de949e9037e0038f9d4f18530e3bc8a5aa6274fa53ec9e59be85c05218003bc`
  - `app-shared-dc7535e633d7.css`: `282dd3546bccfba48212a186641a73dedb27af6af7962dad40b3f5db6a9a08f2`

## 1. 结论

**当前还不能称为与原版全部一致。** 数据编排、虚拟列表和 Composer 布局等有编译代码依据且部分已经浏览器运行；但可见的侧边导航、活动时间线、输入区实际行为和 Electron 宿主仍明显不完整。`25/25` 源码签名只证明三个原始文件中含相应文本；`140/140` 核心测试和此前 `3/3` 浏览器冒烟测试不证明视觉一致。

### 关键证据分级

- **A：从原始编译资源确认的结构/状态线索**：`data-app-shell-*` 容器属性、`navigationRailEnabled` 分支、`--app-shell-navigation-rail-width` 的动态计算、Composer `kcr/Pcr/Hcr` 相关属性、部分 CSS token、turn/activity/virtualizer 分类和几何算法。
- **B：以源码为依据的可维护语义重构，但不等价于原版实现**：`src/conversation` 各模型、`VirtualizedTurnList.tsx`、`ConversationMessageBlocks.tsx`、`CodexComposerLayout.tsx` 等；其内部依赖和可视组件仍要接线。
- **C：演示层自写或暂时缺失**：`demo/App.tsx` 的单层 Sidebar/窗控、`demo/adapters.tsx` 的 Markdown 和 `ActivityDetails`、mock diff、`textarea`、模拟会话、字体/图标、Electron IPC。

## 2. 结合本轮截图的显著差异

| 截图可见的 UI | 原始编译证据 | 当前仓库情况 | 判定 |
|---|---|---|---|
| **窄导航图标 Rail + 次级项目会话 Sidebar**（截图大约 x=0–52 和 x=52–291） | `app-initial-5851df3f6cb1.js` 中有 `navigationRailEnabled`；`--app-shell-navigation-rail-width` 由运行时宽度计算 | `demo/App.tsx:47-80` 只有单个 `ConversationSidebar`；`.demo-sidebar` 使用一个 `clamp(...)`，折叠时写死 56px | **大缺口 P0**。不可把原版普通 sidebar token 直接当 Rail+Sidebar 总宽 |
| 顶部应用菜单/窗口按钮及标题栏 | `data-app-shell-application-menu-bar`、`data-app-shell-main-titlebar`、样式按窗口类型和状态变化 | `demo/App.tsx:195-212` 里 File/Edit/View/Help 与窗口按钮是示意文字，非 Electron window chrome | **未完成 P1** |
| 活动摘要 + 工具子行 + 折叠/滚动连续性 | 原版 `agent-activity-item-1be092f0c744.js`、`local-conversation-turn-69783815d57d.js` | `demo/adapters.tsx:24-53` 的 `ActivityDetails` 独立 `useState(false)` 展开；状态文案为 demo 自定义 | **大缺口 P0**，没有证明能处理原版的 `activityExpanded/onToggle` 与持续活动状态 |
| 正文中的行内代码、命令、编辑文件、进度 | 原版 `conversation-markdown-*`、`local-conversation-turn-*`、工具细节模块 | 使用 `react-markdown` 和简化 `.demo-*` CSS；code block/命令详情未等价重构 | **未完成 P0** |
| 底部多状态 Composer：权限、模型、语音、发送 | 原版 `app-initial` Composer Root/Body/Input/Footer，`Pcr` 包含 dictation 与响应式条件 | `CodexComposerLayout` 仅恢复层级/部分 data 属性；`demo/App.tsx:247-264` 仍注入 `textarea`、模拟权限/模型，无语音/真实发送 | **部分逆向 P0** |
| 浅绿主题与字体/图标 | 原版复杂 theme/window state CSS | `demo/codexDesktopShell.css` 人工设定白/灰色，`Icon` 为自写 SVG、Segoe UI fallback | **未恢复 P0/P1**。不可推断截图颜色就是源码默认主题 |
| 真实会话标题、线程列表、滚动条 | 原版 app shell + thread list + virtualizer | 列表模型真实接线但源数据来自 `demo/mockConversation.ts`，标题固定场景 | **部分逆向 P1** |

## 3. 原版源码中的几个容易误用的事实

1. `app-shared` 同时可见 `--thread-content-max-width:none` 的基础声明、`48rem` 等工具类/主题值，以及通过容器查询切换 `--thread-content-responsive-max-width` 的规则。**`48rem` 不是可以无条件固定到所有线程视图的结论**。当前 `demo/codexDesktopShell.css:14` 将它写入 `:root`，会掩盖原版的部分状态分支。
2. 原版 `--spacing-token-sidebar:clamp(240px, var(--codex-sidebar-preferred-width,275px), min(520px, calc(100vw - 320px)))` 是可验证的样式变量；但有独立 `navigationRailEnabled` 与 rail width 状态。**当前 UI 没有实现导航 rail 的组合关系**。
3. 原版 `--height-toolbar:46px`、`--height-toolbar-sm:36px` 是已验证的 token，不意味着所有页面标题栏和菜单只可能是固定高度；真正选择还受 page/window state 约束。
4. 原版 `Pcr` 的 Footer 逻辑包括 `dictation != null || layout === 'multiline'` 为 `stacked`，单行模式有响应式条件。现有 `getComposerFooterRows(layout)` 仅根据 layout 判断，并且 demo 强制多行，没有恢复 dictation 转换、焦点补偿、真实输入法/粘贴行为。
5. `scripts/audit-layout-evidence.mjs` 的「25/25」检查只是 `text.includes`，不是 React 组件、CSS 选择器执行结果或 UI 视觉比对，不应被用于统计功能完成度。

## 4. 恢复/未恢复清单

见同批 `逆向状态矩阵_2026-10-21.csv`（23 个子系统，附原版文件、当前实现、问题与优先级）。

### 重点分界

- **源码确认并部分实现**：活动分类、Turn 投影、静态/实时条目模型、虚拟列表几何与 React 列表、消息类型分发、Composer 插槽和部分 CSS token。
- **独立适配层**：`LiveConversationSource` 的外部订阅 store，`ConnectedConversationMessageRenderers` 及 `demo` 的 Markdown/ActivityDetails/scroll controller；这些解决集成问题，但不宣称私有 Codex 源码被完整还原。
- **尚未逆向或未完成可运行实现**：原版 Rail/Sidebar 的路由/状态树、完整 AgentActivity 细节/展开条件、原版 Markdown 和高亮引擎、真实 FileDiff、Composer 富文本与语音附件权限、真实 Electron preload/IPC、原版字体图标和所有窗口状态。

## 5. 项目文档、测试与回归的核查

- 已在本地**重新执行** `npm run test:core`：**140/140 通过**；原始三文件静态签名审计 **25/25 通过**。
- 之前 GitHub CI 在 `edb4aec` 确认了 **Vite 生产构建和 Chromium 3/3 用例通过**，仅证明当前 demo 可挂载、可模拟发送/滚动/切换及已断言的尺寸。当前这张 **1090×760** 截图尚未完成同 viewport/同内容/同主题逐组件像素基准测试。
- `reports/STATUS.md`、`reports/CONTINUATION_CHECKPOINT.json`、`reports/CONTINUATION.md` 保留了 **87/92 次测试以及“无 GitHub 推送”**等当时真实但现已过期的历史状态。应将它们标注为历史快照，不能作为当前最新进度；最新事实请以本报告和 HEAD 为准。
- `src/ui.ts` 目前未导出新组件 `CodexComposerLayout`；demo 直接从子路径导入。作为最终可复用组件库的公共导出接口，还未纳入。

## 6. 下一阶段需要做什么（按真正影响保真验收的顺序）

1. **P0 原版 Shell + Rail + Sidebar**：定位 `app-initial` 的 `navigationRailEnabled` 所在组件与实际 panel JSX；建立浏览器/Electron/账号 feature flag、折叠与搜索状态的显式模型；不再写一个单层仿制侧边栏。
2. **P0 原版 AgentActivity**：分析 `agent-activity-item`、`local-conversation-turn` 与活动详细行的实际层级，恢复 `activityExpanded`、自动折叠、工作状态和子条目列表；真正替换 `demo/adapters.tsx:ActivityDetails`。
3. **P0 原版 Composer 控制器**：继续从编译函数跟踪 dictation、真实编辑器、附件、模型及审批选项、发送/停止 IPC；先恢复状态/视图接口，保留安全宿主边界，再替换 textarea。
4. **P0/P1 完整正文/样式**：按原版 Markdown/代码/文件差异与 CSS，建立同窗口尺寸/同数据/同状态的截图比对，并将视觉差异追溯到具体编译源码规则。
5. **P1 Electron 和 Agent**：恢复 preload/bridge 合约，建立真实应用集成和端到端验证；不要把模拟执行当实际授权或命令运行。

## 7. 验收口径

本阶段结论为 **“源码与未覆盖缺口复核完成，UI 保真仍未通过”**。不能量化宣称“已经还原多少百分比”，因为功能测试数与原版全部分支覆盖并无可比性。未确认截图与编译资源是否来自完全相同的 Codex 构建版本，这是接下来真实像素验收的一项前置条件。
