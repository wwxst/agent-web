import * as React from "react";
import type { VirtualizedTurnListApi } from "../src/components/VirtualizedTurnList.js";
import { ConnectedLiveConversationTranscript } from "../src/components/ConnectedLiveConversationTranscript.js";
import { BrowserScrollController } from "./browserScrollController.js";
import { makeDemoRow, demoProjectionDependencies } from "./adapters.js";
import {
  DEMO_CONVERSATIONS, appendDemoEntries, createDemoSource,
  demoActivityEntry, demoItem, demoMessageEntry, makeLongHistory,
  type DemoConversationId,
} from "./mockConversation.js";

function Icon({ name, size = 18 }: { name: "panel" | "search" | "plus" | "branch" | "dots" | "up" | "stop" | "bottom" | "top" | "play" | "refresh" | "terminal" | "check" | "menu" | "copy"; size?: number }) {
  const children: Record<typeof name, React.ReactNode> = {
    panel: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></>,
    search: <><circle cx="10.8" cy="10.8" r="6.2"/><path d="m16 16 4.5 4.5"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    branch: <><circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><path d="M6 8v8M18 8c0 6-12 1-12 8"/></>,
    dots: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
    up: <><path d="M12 19V5m-7 7 7-7 7 7"/></>,
    stop: <rect x="6" y="6" width="12" height="12" rx="2"/>,
    bottom: <><path d="M12 4v13m-5-5 5 5 5-5M5 21h14"/></>,
    top: <><path d="M12 20V7m-5 5 5-5 5 5M5 3h14"/></>,
    play: <path d="m8 5 11 7-11 7z"/>,
    refresh: <><path d="M20 10a8 8 0 0 0-14-5L3 8m0-5v5h5"/><path d="M4 14a8 8 0 0 0 14 5l3-3m0 5v-5h-5"/></>,
    terminal: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 9 3 3-3 3m6 0h5"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
    copy: <><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children[name]}</svg>;
}

function ConversationSidebar(props: {
  active: DemoConversationId;
  collapsed: boolean;
  onToggle: () => void;
  onSelect: (id: DemoConversationId) => void;
  onReset: () => void;
}) {
  const { active, collapsed, onToggle, onSelect, onReset } = props;
  return <aside className={`demo-sidebar ${collapsed ? "demo-sidebar--collapsed" : ""}`} aria-label="演示会话导航">
    <div className="demo-sidebar-head">
      <div className="demo-logo"><span className="demo-logo-mark">✳</span>{!collapsed && <span>Codex <span className="demo-logo-lab">Preview</span></span>}</div>
      <button className="demo-icon-button" title={collapsed ? "展开侧边栏" : "收起侧边栏"} aria-label={collapsed ? "展开侧边栏" : "收起侧边栏"} onClick={onToggle}><Icon name="panel" /></button>
    </div>
    {collapsed ? <div className="demo-sidebar-min"><button className="demo-icon-button" onClick={onReset} title="重新加载演示"><Icon name="plus" /></button></div> : <>
      <div className="demo-sidebar-actions">
        <button type="button" className="demo-nav-action" onClick={onReset}><Icon name="plus" size={17}/> 新建演示会话</button>
        <div className="demo-nav-action demo-nav-disabled" aria-label="搜索功能尚未接入"><Icon name="search" size={17}/> 搜索（待接入）</div>
      </div>
      <div className="demo-section-heading">最近的会话 <span>DEMO</span></div>
      <nav className="demo-chat-list" aria-label="会话">
        {DEMO_CONVERSATIONS.map((item) => <button type="button" key={item.id} className={`demo-chat-link ${item.id === active ? "is-active" : ""}`} onClick={() => onSelect(item.id)} aria-current={item.id === active ? "page" : undefined}>
          <span className="demo-chat-link-title">{item.title}</span>
          <span className="demo-chat-link-subtitle">{item.subtitle}</span>
        </button>)}
      </nav>
      <div className="demo-sidebar-spacer"/>
      <div className="demo-sidebar-project"><span className="demo-project-box"><Icon name="branch" size={16}/></span><div><strong>agent-web</strong><small>recovery / demo</small></div><Icon name="dots" size={16}/></div>
      <div className="demo-sidebar-foot">只读演示 · 不连接真实 Agent</div>
    </>}
  </aside>;
}

export function App() {
  const [active, setActive] = React.useState<DemoConversationId>("frontend");
  const [generation, setGeneration] = React.useState(0);
  const [collapsed, setCollapsed] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [playing, setPlaying] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);
  const [historyAdded, setHistoryAdded] = React.useState(false);
  const scrollElementRef = React.useRef<HTMLDivElement | null>(null);
  const virtualizerApiRef = React.useRef<VirtualizedTurnListApi | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldFollowRef = React.useRef(true);
  const nextIdRef = React.useRef(0);

  const source = React.useMemo(() => createDemoSource(active), [active, generation]);
  const scrollController = React.useMemo(() => new BrowserScrollController(() => scrollElementRef.current), []);
  const notify = React.useCallback((message: string) => {
    setToast(message);
    if (toastTimerRef.current != null) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3600);
  }, []);
  const DemoRow = React.useMemo(() => makeDemoRow(notify), [notify]);
  const onApiChange = React.useCallback((api: VirtualizedTurnListApi | null) => { virtualizerApiRef.current = api; }, []);
  const scrollToBottom = React.useCallback(() => {
    shouldFollowRef.current = true;
    scrollController.scrollToDistanceFromBottomPx(0, "instant");
  }, [scrollController]);
  const onVisibleContentReady = React.useCallback(() => {
    if (shouldFollowRef.current) scrollToBottom();
  }, [scrollToBottom]);

  React.useEffect(() => {
    shouldFollowRef.current = true;
    const frame = requestAnimationFrame(() => requestAnimationFrame(scrollToBottom));
    return () => {
      cancelAnimationFrame(frame);
      if (timerRef.current != null) clearTimeout(timerRef.current);
      source.dispose();
    };
  }, [scrollToBottom, source]);
  React.useEffect(() => () => {
    if (toastTimerRef.current != null) clearTimeout(toastTimerRef.current);
  }, []);

  function nextId(prefix: string) { return `${prefix}-${++nextIdRef.current}`; }
  function scheduleAppend(entry: ReturnType<typeof demoMessageEntry>, delay = 0) {
    timerRef.current = setTimeout(() => {
      appendDemoEntries(source, [entry]);
      setPlaying(false);
    }, delay);
  }
  function markFollow() { shouldFollowRef.current = scrollController.getLastScrollDistanceFromBottomPx() < 120; }

  function sendMessage() {
    const message = draft.trim();
    if (!message || playing) return;
    markFollow();
    appendDemoEntries(source, [demoMessageEntry("user", nextId("user"), message)]);
    setDraft("");
    setPlaying(true);
    scheduleAppend(demoMessageEntry("assistant", nextId("reply"),
      `**模拟回复**：已收到你的消息。\n\n> ${message.slice(0, 180).replace(/\n/g, "\n> ")}\n\n当前只是在浏览器中验证恢复后的 React 消息渲染链路，**不会请求模型或调用真实 Agent 后端**。`), 700);
  }

  function playSample() {
    if (playing) return;
    markFollow();
    setPlaying(true);
    appendDemoEntries(source, [demoMessageEntry("user", nextId("sample"), "展示一次模拟的 Agent 执行活动和结果。")]);
    timerRef.current = setTimeout(() => {
      appendDemoEntries(source, [demoActivityEntry(nextId("running"), [demoItem(nextId("exec"), "exec", undefined, {
        heading: "模拟执行 npm run test:core", state: "Ready", command: "npm run test:core", output: "模拟输出：140 tests, 140 passed, 0 failed",
      })])]);
      timerRef.current = setTimeout(() => {
        appendDemoEntries(source, [demoMessageEntry("assistant", nextId("sample-answer"), "模拟流程完成。真实测试结果请以本机 `npm run test:core` 输出为准。")]);
        setPlaying(false);
      }, 900);
    }, 650);
  }
  function stopSample() {
    if (timerRef.current != null) clearTimeout(timerRef.current);
    timerRef.current = null;
    setPlaying(false);
    appendDemoEntries(source, [demoMessageEntry("assistant", nextId("stopped"), "模拟执行已停止。此操作没有向后端发送停止指令。")]);
    notify("模拟流程已停止");
  }
  function injectHistory() {
    if (historyAdded) return;
    markFollow();
    appendDemoEntries(source, makeLongHistory());
    setHistoryAdded(true);
    notify("已加入 45 条模拟消息。可滚动检查虚拟列表。");
  }
  function reset() {
    if (timerRef.current != null) clearTimeout(timerRef.current);
    timerRef.current = null;
    setPlaying(false);
    setHistoryAdded(false);
    setDraft("");
    setGeneration((value) => value + 1);
  }
  function switchConversation(id: DemoConversationId) {
    if (id === active) return;
    if (timerRef.current != null) clearTimeout(timerRef.current);
    timerRef.current = null;
    setPlaying(false);
    setHistoryAdded(false);
    setDraft("");
    setActive(id);
  }

  return <div className="demo-app">
    <ConversationSidebar active={active} collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} onSelect={switchConversation} onReset={reset}/>
    <div className="demo-main">
      <header className="demo-header">
        <div className="demo-header-location"><span className="demo-header-folder">agent-web</span><span className="demo-breadcrumb">/</span><strong>{DEMO_CONVERSATIONS.find((c) => c.id === active)?.title}</strong><span className="demo-header-chevron">⌄</span></div>
        <div className="demo-header-actions"><span className="demo-header-badge"><span className="demo-online-dot" /> MOCK DATA</span><button type="button" className="demo-icon-button" title="重置演示" onClick={reset}><Icon name="refresh" size={17}/></button></div>
      </header>
      <div className="demo-banner"><span>预览版</span> 正在使用已恢复的会话组件与模拟数据。不是 Codex 官方 UI，也尚未接入真实 Agent / Electron。</div>
      <div className="demo-toolbar">
        <button type="button" onClick={playSample} disabled={playing}><Icon name="play" size={15}/> 模拟运行</button>
        <button type="button" onClick={injectHistory} disabled={historyAdded}><Icon name="plus" size={15}/> 添加 45 条历史</button>
        <button type="button" onClick={() => void virtualizerApiRef.current?.scrollToKey(`history-content:turn:${source.getSnapshot().entries[0]?.turnId ?? ""}`, undefined, {align:"top"})}><Icon name="top" size={15}/> 跳到开头</button>
        <button type="button" onClick={scrollToBottom}><Icon name="bottom" size={15}/> 跳到最新</button>
      </div>
      <div className="demo-scroll-region" ref={scrollElementRef} onScroll={() => {
        scrollController.notifyScroll();
        shouldFollowRef.current = scrollController.getLastScrollDistanceFromBottomPx() < 120;
      }} data-testid="transcript-scroll">
        <div className="demo-transcript-column">
          <div className="demo-conversation-intro"><span className="demo-intro-symbol">⌘</span><h1>{DEMO_CONVERSATIONS.find((c) => c.id === active)?.title}</h1><p>agent-web · React / TypeScript 集成预览</p></div>
          <ConnectedLiveConversationTranscript
            key={`${active}-${generation}`}
            source={source}
            projectionDependencies={demoProjectionDependencies}
            RowComponent={DemoRow}
            scrollController={scrollController}
            gapPx={22}
            overscanCount={4}
            onApiChange={onApiChange}
            onVisibleContentReady={onVisibleContentReady}
            LoadingView={() => <div>加载中…</div>}
            DisconnectedView={() => <div>数据源已断开。</div>}
          />
          <div className="demo-thread-end" aria-hidden="true"/>
        </div>
      </div>
      <div className="demo-composer-zone">
        <div className="demo-composer-wrap">
          <div className="demo-composer-label"><span className="demo-git-icon"><Icon name="branch" size={14}/></span> agent-web <span className="demo-composer-separator">·</span> <span className="demo-muted">本地模拟会话</span></div>
          <div className="demo-composer">
            <textarea aria-label="演示消息输入" data-testid="composer" placeholder="发送消息…（演示模式，不调用真实 Agent）" rows={2} value={draft} onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setDraft(event.target.value)} onKeyDown={(event: React.KeyboardEvent<HTMLTextAreaElement>) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); sendMessage(); }
            }}/>
            <div className="demo-composer-controls"><div className="demo-composer-options"><span className="demo-composer-model">✳ Demo Agent <span>⌄</span></span><span className="demo-composer-model">模拟 · 无后端</span></div>
              <button type="button" data-testid="send-button" aria-label={playing ? "停止模拟" : "发送模拟消息"} title={playing ? "停止模拟" : "发送模拟消息"} className="demo-send-button" disabled={!playing && !draft.trim()} onClick={playing ? stopSample : sendMessage}><Icon name={playing ? "stop" : "up"} size={17}/></button>
            </div>
          </div>
          <div className="demo-composer-hint">Enter 发送 · Shift+Enter 换行　|　所有输出均为模拟，不会执行命令或写入文件</div>
        </div>
      </div>
    </div>
    {toast && <div className="demo-toast" role="status"><Icon name="check" size={17}/>{toast}</div>}
  </div>;
}
