# VISUAL_ACCEPTANCE_A_SHELL_EMPTY

## 1. 验收结论与适用范围

已取得官方 Codex Windows 应用和 agent-web Electron 重构版的第一组真实完整窗口截图，已通过元数据验证并生成对照图。**采集与比较完成；视觉保真度验收不通过。**

最严重问题是空白主页 Composer 的垂直位置、左侧栏宽度、主页工具栏结构，以及导航/模型/权限/语音等能力缺口。不能将像素差异百分比解释为“相似度”或“完成率”。

两边主会话区均无历史消息，输入框为空、无附件、无进行中的生成；侧边栏展开。最终画面无弹窗、悬浮菜单、通知或自动化指针覆盖。原版使用正常新聊天入口/快捷键进入空白会话，没有删除历史数据，没有通过 CSS、DevTools 或注入改动原版。

**可比性边界：**真实窗口尺寸、DPI、显示器、位置、主题和空白会话类别匹配；侧边栏数据及语言环境不完全相同。原版保留用户项目/最近会话，重构版使用新建独立 profile；原版为中文，重构版多处硬编码英文。整图差异因此混合了数据、语言、结构、几何、样式和能力差异，只用于定位，不能作为排除了内容影响的 CSS 分数。本轮没有通过清空原版或填入假历史记录来制造一致。

## 2. 原始截图与比较图片

原版（完整 DWM 可见窗口，未经裁剪/缩放/修图）：

![Original Codex](original-shell-empty.png)

重构版（真实 Electron 窗口，未经裁剪/缩放/修图）：

![Reconstructed Electron](reconstructed-shell-empty.png)

并排图：左为原版，右为重构版。

![Side by side](comparison/side-by-side.png)

叠加图：仓库工具原样生成的 50%/50% 绘制结果。

![Overlay](comparison/overlay.png)

差异热图：最大 RGB 通道差超过 24 的像素标红，其余为浅灰；这是阈值图，不是连续强度热图。

![Difference](comparison/difference.png)

## 3. 环境、窗口身份与元数据

| 项目 | 官方 Codex | 重构版 |
|---|---|---|
| 进程 | ChatGPT | electron |
| 实际窗口标题 | ChatGPT | agent-web · Codex 风格集成预览 |
| 身份依据 | OpenAI.Codex_26.1013.3656.0 安装包与唯一窗口 | Electron 可执行文件、独立 profile、目标 checkout 的 main.cjs |
| 可见物理尺寸 | 1352×760 | 1352×760 |
| 同一主显示器位置 | x=284, y=160 | x=284, y=160 |
| 显示器 | 主显示器 1920×1080 | 同一主显示器 |
| windowDpi / scale | 96 / 1.0 | 96 / 1.0 |
| 采集线程 DPI awareness | per-monitor-v2-thread | per-monitor-v2-thread |
| 边界 | dwm-extended-frame-bounds | dwm-extended-frame-bounds |
| 主题 | light，截图核对 | light，截图核对 |
| 应用缩放准备 | 正常键盘 Ctrl+0 重置 | 正常键盘 Ctrl+0 重置 |
| 主会话状态 | 新聊天、无消息、空输入 | 新聊天、无消息、空输入 |

操作系统为 Windows 10 Pro 10.0.19045。DPI awareness 字段描述采集线程，不将其冒充为已经测量过的原版进程 DPI 模式；原版程序未修改。应用缩放通过正常快捷键统一，没有读取原版私有 renderer 的数值。

两个 outerBounds 不同：原版为 (284,160,1352,760)，重构版为 (277,160,1366,767)。重构版存在 7px 的不可见窗口边距；采集工具按 DWM 可见边界取完整窗口，两张 PNG 的可见尺寸、坐标相同。该字段差异是真实窗口框架差异，不是绕过尺寸验证。

原版采集时间：2026-10-31 11:38:43 +08:00。重构版：2026-10-31 11:38:47 +08:00。

元数据验证：`validation.ok = true`，`errors = []`。另外独立核对了 PNG 尺寸及 SHA-256 与各自 JSON、比较 report 的一致性。

两份原始 JSON：

- [original-shell-empty.png.json](original-shell-empty.png.json)
- [reconstructed-shell-empty.png.json](reconstructed-shell-empty.png.json)
- [完整环境与工具版本](environment.json)
- [机器比较结果](comparison/report.json)

原版元数据原文：

```json
{
  "schemaVersion": 1,
  "scenarioId": "A-shell-empty",
  "theme": "light",
  "captureBoundary": "dwm-extended-frame-bounds",
  "screenshot": "original-shell-empty.png",
  "width": 1352,
  "height": 760,
  "windowDpi": 96,
  "windowScaleFactor": 1,
  "dpiAwareness": "per-monitor-v2-thread",
  "processName": "ChatGPT",
  "windowTitle": "ChatGPT",
  "visibleBounds": {
    "x": 284,
    "y": 160,
    "width": 1352,
    "height": 760
  },
  "outerBounds": {
    "x": 284,
    "y": 160,
    "width": 1352,
    "height": 760
  },
  "sha256": "3c6b61a4798b51614fa5dd9b7fe0e512f7d5cae80f56093c033332af17520a3b",
  "capturedAtUtc": "2026-10-31T03:38:43.0048205Z"
}
```

重构版元数据原文：

```json
{
  "schemaVersion": 1,
  "scenarioId": "A-shell-empty",
  "theme": "light",
  "captureBoundary": "dwm-extended-frame-bounds",
  "screenshot": "reconstructed-shell-empty.png",
  "width": 1352,
  "height": 760,
  "windowDpi": 96,
  "windowScaleFactor": 1,
  "dpiAwareness": "per-monitor-v2-thread",
  "processName": "electron",
  "windowTitle": "agent-web · Codex 风格集成预览",
  "visibleBounds": {
    "x": 284,
    "y": 160,
    "width": 1352,
    "height": 760
  },
  "outerBounds": {
    "x": 277,
    "y": 160,
    "width": 1366,
    "height": 767
  },
  "sha256": "2047afb138fe265206a2e9af4f0ff06c96d99fad5bc21c749878b1171e978b26",
  "capturedAtUtc": "2026-10-31T03:38:47.7009576Z"
}
```

## 4. 比较结果的正确解读

| 指标 | 本轮结果 |
|---|---:|
| 总像素 | 1027520 |
| RGB 通道阈值 | 24 |
| 超阈值像素 | 27813 |
| 超阈值像素比例 | 2.706809% |
| RGB 平均绝对误差（0–255） | 4.986214 |
| 最大单通道差 | 248 |

大片相同白色背景及小于阈值的灰色差异，会让整图百分比看起来很低。例如原版侧边栏空白处 (100,500) 是 #fcfcfc，重构版为 #f5f5f5，差值 7 未超过阈值，却是可见表面色差。2.71% 的超阈值像素不代表 97.29% 的视觉保真度。

本轮未缩放、裁剪、遮罩或剔除任何区域，也没有按不同区域重设阈值。原版真实历史条目造成的差异必须从布局问题中区分出来。

## 5. 六个区域逐项分析

分类：A=结构性差异；B=几何尺寸差异；C=视觉样式差异；D=功能性差异。下面的坐标均以截图左上角为 (0,0)，是 PNG 目测边界约值（约 ±2px），不是原版 DOM/CSS 数值。

### 5.1 Windows 窗口框架及顶部菜单

- **结构 A（已证实）：**两边都是真实 Windows 应用窗口，重构版右上角是真实 Electron 原生最小化/最大化/关闭控件。重构版返回、前进和面板图标在 App.tsx 中是 span/aria-hidden 表示；原版可访问树对应实际按钮。不能因为画了图标就算功能完成。
- **几何 B（已证实）：**原版内容表面从 y≈44 开始，重构版从 y=36 开始，差约 8px。原版主表面右上/右下有圆角及外侧留白，重构版内容面更接近直角铺满。DWM/outerBounds 的不可见边距也不同。
- **文字/样式 C（已证实）：**原版“文件/编辑/视图/帮助”，重构版 File/Edit/View/Help，字体字形、文本宽度及横向菜单节奏不同。菜单位置、箭头样式及灰度也不一致。顶栏背景取样两边均约 #f6f6f6；这不抵消几何差异。
- **交互 D（部分证实）：**重构版菜单点击可路由至 Electron main 的受限原生菜单；返回/前进图示缺少相应行为。此次未逐一打开并验收所有菜单项，原版菜单具体快捷键/功能需要后续单独验证。
- **Demo 判断：**这是实际原生壳内的 React 顶部菜单实现，不是浏览器截图；但部分导航按钮仍只是示意。

### 5.2 左侧主导航

- **结构 A（已证实）：**两边 rail 均约 52px 宽。原版有首页、图像、定时任务、资料库、插件、更多、代码审查、站点及底部头像；重构版只有 Home/Activity/Scheduled/Library/Skills，底部 More/Settings。路由、数量、分组和底部账户入口不同，Activity 的分支图标不能等价为原版“图像”。
- **几何 B（已证实）：**原版首页图标中心 y≈70，重构版 y≈58；后续图标间距原版约 44px，重构版约 38px，越往下错位越大。原版更多位于中上部，重构版放到底部。
- **样式 C（已证实）：**原版首页为实心深色图标，重构版主要为线框；其余图标形状、笔画、灰度与状态不一致。重构版禁用项 opacity 进一步变淡。rail 空白取样原版 #f6f6f6、重构版 #f5f5f5。
- **功能 D（已证实）：**重构版除 Home 外上述入口没有 onSelect，UIA 显示 disabled。底部个人账户入口缺失。原版各入口只确认存在，未声称已做端到端功能测试。
- **Demo 判断：**是缺少 host 行为的导航外壳，不是 CSS 调色即可补齐。

### 5.3 项目与最近会话侧边栏

- **结构 A（已证实）：**原版有 Codex 模式切换、活动通知、搜索、新聊天、置顶、项目树和最近会话；重构版缺少通知入口及等价完整置顶聊天/项目会话结构，仅有 Projects/Recents 空状态及本地只读目录入口。原版项目内容本来就存在，重构版 No projects/No chats 是独立 profile 的实际数据状态。
- **几何 B（已证实）：**原版侧栏从 x≈52 到 x≈290，宽约 238；重构版到 x≈327，宽约 275，宽约 37px。由此主区中心右移约 19px。原版新聊天行 y≈110；重构版 y≈102，并带整行灰色选中背景。项目与最近会话分节的纵向位置不同，但不能把原版已有条目数量造成的高度差都算成间距错误。
- **样式 C（已证实）：**原版侧栏空白约 #fcfcfc，重构版 #f5f5f5；字体、Codex 品牌字重及新聊天图标不同。原版主要中文、重构版分节英文。重构版 Recents 前的细分隔线与原版画面不同。
- **功能 D（部分证实）：**重构版搜索明确禁用；Open local folder 是只读预览，不等价于原版持久化项目/会话管理。已有源码存在部分 pinned-content 支持，不能将其等价为本轮已经验收的原版置顶聊天系统。
- **需人工确认：**原版 238px 是否为用户保存宽度或该版本默认值；下一轮以本组实际 238px 为截图目标，但不要直接断言所有窗口都应使用硬编码宽度。重构版空历史不证明历史组件不存在，加载/持久化仍需独立验证。

### 5.4 会话标题栏及工具栏

- **结构 A（已证实）：**原版空白主页没有“New chat”文本标题及可见整行底部分隔线，仅右上有新建标签页按钮；重构版有 New chat 标题、dots 图示、右侧收起侧边栏按钮和 y≈81 分隔线。主页与进行中会话的工具栏分支不匹配。
- **几何 B（已证实）：**原版空白区域从 y≈44 开始；重构版 36px 顶栏下再占约 46px 的标题工具栏。两边右侧按钮的 x/y、间距、对齐基线不同。
- **样式 C（已证实）：**重构版 New chat 的字号约 13px、较粗文本及底边线是额外视觉元素；按钮图标和灰度不同。原版没有可直接对比的标题文本，不能只说“标题字体不对”。
- **功能 D（已证实/未验收）：**重构版 dots 是 span，title 明示“暂未接通功能”；侧边栏按钮有 handler，但它不能替代原版“新建标签页”。原版新建标签页只确认可访问按钮和截图存在，未打开功能测试。
- **Demo 判断：**存在用占位按钮表达原版行为的外壳结构。

### 5.5 主会话时间线及空白欢迎区

- **结构 A（已证实）：**两边时间线均为空，均展示 Codex 欢迎图标和标题；最终截图没有假消息、工具执行卡或模拟活动。原版“我们要构建什么？”，重构版“What should we build?”，属于语言/内容差异。
- **几何 B（已证实）：**原版图标中心约 (820,327)，重构版约 (840,257)，向右约 20px、向上约 70px。原版标题顶 y≈385，重构版 y≈314，向上约 71px。水平偏移主要受侧栏宽度影响；纵向布局与 Composer 锚点/主页分支需一起调查。
- **样式 C（已证实）：**欢迎图标轮廓接近，但尺寸/线条灰度/位置仍需精调。原版标题可见字形高度约 28px；重构版 CSS 明确使用 20px、font-weight:400。原版精确 CSS 字号/字体家族尚未直接测量，不能用英文与中文的文本宽度反推出字体错误。主内容大面积背景均为 #fff。
- **功能 D（未验收）：**本轮只验空白状态，消息排版、Markdown/代码、流式输出、工具活动、滚动、错误、审批等均未在真实对照中验收。
- **Demo 判断：**当前没有演示时间线；源码入口仍是 demo/App.tsx，包含其他显式 fixture 分支。不能据此声称当前画面运行了那些 fixture，也不能声称已连接正式 Agent。

### 5.6 底部 Composer

- **结构 A（已证实）：**原版有“选择项目/此计算机”的上层上下文条、附件按钮、完全访问、GPT-6.1 Sol 高、麦克风和蓝色语音入口。重构版缺少这条上下文栏和两个语音入口，显示“权限未连接/模型未连接”和灰色发送箭头。当前是真实能力缺口，不能用假模型名或把 disabled 隐藏掉来修图。
- **几何 B（已证实，首要问题）：**原版输入卡约 (451,642,738,99)，底距约 19px；重构版约 (456,355,768,98)，卡片上移约 287px，底距约 307px。两卡高度接近，但重构版宽约 30px，中心右移约 20px。原版上下文条约 y=604；重构版没有对应层。
- **样式 C（已证实）：**两边都是白色圆角卡片和细浅边框，但原版阴影/边缘更柔和，重构版控件文字更小、更淡，权限图标、文字颜色及按钮形态不同。原版占位“随心输入”，重构版 Do anything；精确字体家族及阴影数值未测量。无附件、无输入、无打开菜单的状态已核对。
- **功能 D（已证实）：**重构版模型/权限控件 disabled，发送明确“Agent 未连接”；缺少语音入口。附件仅本地暂存/尚未上传的能力由 UIA 和源码确认；本轮没有实际选择文件或发送请求。原版有对应可见控件，但本轮没有调用语音、修改权限或发消息。
- **原因分层：**home-composer 定位规则可能解释纵向错位；上下文栏缺失是结构/状态映射；模型和权限 unavailable 是 host/backend 能力状态。三者不能合并为一个 CSS bug。本轮不修改 agent-cil。

## 6. 按优先级排列的整改任务及具体文件

以下是下一轮 UI 建议，**本轮未实施 UI 修复；仅修正采集脚本坐标表达式并补回归测试**。路径相对 `packages/codex-frontend-reconstruction`；实际被采集 checkout 在 `packages/codex-frontend-reconstruction`。

| 优先级 | 任务与完成标准 | 下一轮具体组件/文件 |
|---|---|---|
| P0 | 先核对同一原版版本的主页/会话分支，恢复本组“欢迎区居中、上下文条+底部 Composer”的结构；1352×760 下卡片顶边应接近 y=642，而不是 y=355。避免全局套用所有空白主页规则。 | `demo/App.tsx`（isNewChat、demo-home-hero、demo-composer-zone，约 1563/1580/1768），`demo/codexDesktopShell.css`（home 规则 868/887、hero 921），`src/components/CodexComposerLayout.tsx` |
| P0 | 按原版空白主页分支恢复上下文栏，明确项目选择与此计算机状态；缺少 host 行为时明确不可用，不填假状态。 | `demo/App.tsx`，`desktop/preload.cjs`，`desktop/main.cjs`（仅下一轮评审范围，本轮没有改后端） |
| P1 | 侧栏按本组约 238px 对齐；检查持久化宽度而非盲目更改通用默认值，恢复表面分层。 | `demo/App.tsx`（sidebarWidth / ConversationSidebar，约 123/259），`demo/codexDesktopShell.css`（约 22/54），`src/conversation/SourceSidebarResizeModel.ts` |
| P1 | 恢复空白页工具栏：去掉错误分支的标题/底边，按原版提供新建标签页能力；不得仅把按钮藏掉。 | `demo/App.tsx`（约 1565），`demo/codexDesktopShell.css`（约 82） |
| P1 | 按实际版本恢复 rail 目标身份、图标、44px 左右节奏、分组与头像；对待接入入口保留真实不可用状态。 | `demo/App.tsx`（Icon 78 / availableRailDestinations 1509），`src/components/CodexNavigationRail.tsx`，`src/components/codexNavigationRail.css`，`src/conversation/NavigationRailModel.ts` |
| P1 | 将中英文硬编码梳理为一致语言来源，先以本组中文为目标，再评估字号字重；不使用语言不同的文本宽度判断字体。 | `demo/App.tsx`，`demo/codexDesktopShell.css`，`src/components/CodexComposerHostControls.tsx` |
| P1 | 给模型/权限/发送的宿主能力及语音、项目上下文制定独立接入任务；截图中保持真实状态，不能用展示成功掩盖未连接。 | `src/components/CodexComposerHostControls.tsx`（约 204/283），`demo/App.tsx`（约 1851–1855），`desktop/preload.cjs`、`desktop/main.cjs`；agent-cil 本轮及本建议中不直接修改 |
| P2 | 顶部内容起点从 36px 与原版 44px 对照，恢复主表面圆角/留白，并对菜单、返回/前进和 caption insets 分开处理。 | `desktop/windowChrome.cjs`，`desktop/nativeMenu.cjs`，`demo/App.tsx`（约 1524），`demo/codexDesktopShell.css`（约 420） |
| P2 | 几何和语言对齐后再精调图标线宽、背景、边框、阴影、字号和字重；不能只针对差异热图补丁。 | `demo/codexDesktopShell.css`，`demo/styles.css`，`demo/DemoProseMirrorComposerEditor.tsx` |

建议先完成 P0 的主页状态映射与垂直布局，再复采 A。其他功能场景在相应 host 能力可用后另做真实窗口验收。

## 7. 已证实与仍需人工确认

**已证实：**真实窗口身份、1352×760 DWM 边界、同一主显示器坐标、96 DPI、light、空白时间线、无临时覆盖；侧栏/工具栏/欢迎区/Composer 几何错位；图标/语言/表面色差；重构版禁用导航和未连接控件；当前空白页没有演示消息。

**待确认/未验收：**原版 238px 侧栏是否用户偏好；原版 precise CSS 字体/字重/缩放数值；原版与已分析编译源码版本的主页布局差异；原版模型/权限/语音实际可用性及菜单行为；重构版真实消息收发、审批、工具执行、项目/最近会话持久化、跨窗口和深浅色切换。截图没有提供这些功能已经完成的证据。

原版安装包版本为 26.1013.3656.0，重构 CSS 注释引用的源码版本标记为 26.1013.40934；二者版本标记不同是已知事实，其是否造成这组布局差异仍需核对。当前以实际原版截图为唯一视觉标准。

## 8. 采集来源、正式修正与发布授权

本组截图固定于提交 `64b6178600efec3608baed4604130e529e73e7ae` 的重构版；后续只修正采集脚本并增加证据/测试，没有更改截图对应的 UI、Electron 主程序或 agent-cil。原工作区已有未跟踪 package-lock.json，始终保留，发布操作使用仓库外独立 worktree。

实际采集时，原脚本 SelfTest 已通过，但运行至鼠标坐标候选数组时报 `op_Subtraction`。原因是 PowerShell 对未加括号的减法及逗号数组表达式的解析。临时副本只做如下三项修正；本次已同步至正式脚本：

```diff
-  @($screenWidth - 5, 5),
+  @(($screenWidth - 5), 5),
-  @(5, $screenHeight - 5),
+  @(5, ($screenHeight - 5)),
-  @($screenWidth - 5, $screenHeight - 5)
+  @(($screenWidth - 5), ($screenHeight - 5))
```

本机 Windows 工作副本（CRLF 换行）的正式脚本与实际成功采集副本 SHA-256 均为 `549022fad577d7c8cd6e36fd018d5ea017f3656f411e000993776f2c0ba3a06b`。DWM 边界、DPI、选窗、前台校验、尺寸和坐标验证、CopyFromScreen、输出元数据及哈希逻辑均未改变。回归测试通过 PowerShell AST 找到正式脚本的实际赋值并执行，覆盖 1920×1080、640×480、7680×4320；不操作桌面，也不拍摄新的个人内容。该测试先在旧脚本失败，再在修正后通过，并接入 Windows CI。

本机首次 npm 安装遇 ECONNRESET，复用现有依赖后构建成功。Computer Use 的 WGC 预览曾超时；最终由真实 Windows 原生采集而非 Playwright 页面截图生成。初次采集出现自动化指针覆盖，结束该辅助覆盖层后重新采集，最终图片未经过修图、裁剪、缩放、遮盖或内容替换。

**敏感内容及授权：**原版完整窗口包含真实项目名称、历史会话标题、服务器 IP/用户名片段及头像缩写。上传前已暂停并告知用户；用户明确回复“允许将包含上述信息的原图及派生图原样上传到 PR #89”。因此本目录五张 PNG 与本地原始证据逐字节相同。预检中的活动聊天截图、可访问树、用户 profile、机器专用启动脚本、原版编译资源和二进制未上传。

JSON 中仅把绝对 screenshot 路径换成相对文件名，并去除 processId/windowHandle。比较 report 中的路径也转成相对此证据目录的路径。DPI、窗口尺寸、场景、主题、可见/外部窗口坐标、时间和 PNG SHA-256 均保留。文本中的机器绝对路径已移除。

## 9. Chromium 环境问题与复现

本机安装的 Playwright 1.64.1 预期 Chromium revision 1248，但缓存中可用的是 revision 1243 / Chrome for Testing 153.0.8010.12。下载新浏览器当时停滞，故本机通过仓库外 NODE_OPTIONS preload 仅为 chromium.launch 指定已有浏览器 executablePath。它不改变比较工具、阈值、输入 PNG、尺寸或元数据验证。Chromium 仅对原生截图做 canvas 比较，不负责截图。

这属于 Playwright 浏览器缓存与依赖版本不匹配的环境问题，不需要修改 Electron 主程序。正常复现优先安装与当前依赖匹配的 Chromium：

```powershell
# 从 packages/codex-frontend-reconstruction 执行
npm install --no-audit --no-fund
npx playwright install chromium --only-shell
npm run visual:test
npm run visual:capture:windows -- -SelfTest
npm run visual:compare -- --reference reports/visual-acceptance/20261031-A-shell-empty/original-shell-empty.png --actual reports/visual-acceptance/20261031-A-shell-empty/reconstructed-shell-empty.png --reference-meta reports/visual-acceptance/20261031-A-shell-empty/original-shell-empty.png.json --actual-meta reports/visual-acceptance/20261031-A-shell-empty/reconstructed-shell-empty.png.json --out-dir visual-comparison-output/A-shell-empty
```

package.json 的实际命令是 `visual:test`、`visual:compare`、`visual:capture:windows`；没有名为 `visual` 或 `visual:capture` 的脚本。本轮使用现有实际命令完成测试、真实 PNG 重算和 Windows 自检，不为适配缩写而添加多余别名。

重新采集应用窗口仍需先以正常 UI 准备空白新会话、light、Ctrl+0、同一主显示器和无悬浮状态；用正式采集脚本指定 Width=1352、Height=760、X=284、Y=160。不得用 CI fixture 或网页截图覆盖本目录原图。当前证据的语言和历史侧栏数据差异属于报告列出的限制。

## 10. 本轮验证与后续范围

- 图片完整性、SHA-256、JSON 元数据、原图/派生图尺寸及完整文件清单由 [baseline 回归测试](../../../scripts/visual-acceptance-baseline.test.mjs) 校验；同时核对本地源图片字节不变。
- 正式脚本的三个坐标修正由 [Windows 回归测试](../../../scripts/capture-windows-window.test.mjs) 在 Windows PowerShell 5.1 执行验证。
- 使用本轮真实 PNG 与清理路径后的 JSON 重新运行仓库比较命令，元数据匹配，`status=compared`，changedPixels=27813，MAE=4.9862143802553724；与原报告一致。派生 PNG 也与本地原始产物逐字节一致。
- [本地验证记录](verification.json) 与 [SHA-256 文件清单](SHA256SUMS.txt) 随证据提交；新提交的 GitHub Actions 状态以 PR #89 Checks 为准，不能把旧 head 的绿灯当成新提交的结果。
- 历史采集 head 的 [GitHub Actions #41162312906](https://github.com/wwxst/agent-web/actions/runs/41162312906) 是此前 CI 证据；本次新增提交会重新触发 CI。

当前仅完成真实截图证据发布及采集表达式修正。Composer 上移约 287px、侧栏宽约差 37px、主页工具栏、导航/文案/字号、项目上下文栏和语音入口、未连接导航/模型/权限/发送等问题仍未修复；必须按结构、几何、样式、功能与环境分别处理，不能统归 CSS。

本 PR 保持 Draft，不合并 main，不合并 #86/#87/#88，不修改 agent-cil。下一轮对齐几何和主页状态后，以相同真实采集条件复验 A-shell-empty。
