import * as React from "react";
import { createPortal } from "react-dom";
import { CodexComposerLayout } from "../src/components/CodexComposerLayout.js";
import { CodexSourceComposerHostForm } from "../src/components/CodexSourceComposerHostForm.js";
import { DemoProseMirrorComposerEditor } from "./DemoProseMirrorComposerEditor.js";
import { CodexNavigationRail, type CodexRailDestination } from "../src/components/CodexNavigationRail.js";
import { CodexSourceSidebarResizeHandle } from "../src/components/CodexSourceSidebarResizeHandle.js";
import { clampSourceSidebarWidth } from "../src/conversation/SourceSidebarResizeModel.js";
import { projectNavigationDestinations } from "../src/conversation/NavigationRailModel.js";
import type { VirtualizedTurnListApi } from "../src/components/VirtualizedTurnList.js";
import { ConnectedLiveConversationTranscript } from "../src/components/ConnectedLiveConversationTranscript.js";
import { resolveComposerSubmitDecision } from "../src/conversation/ComposerInteractionModel.js";
import { resolveComposerPrimaryAction } from "../src/conversation/ComposerPrimaryActionModel.js";
import { SOURCE_CONVERSATION_ITEM_GAP_PX } from "../src/conversation/SourceConversationLayoutTokens.js";
import { BrowserScrollController } from "./browserScrollController.js";
import { searchSourceThreadLiteralRows, wrapSourceThreadFindOrdinal } from "../src/conversation/SourceThreadFindModel.js";
import { projectDemoThreadFindRows } from "./threadFindProjection.js";
import { buildConversationRenderEntries } from "../src/conversation/ConversationRenderEntriesModel.js";
import { sourceHistoricalTurnQuery } from "../src/conversation/SourceHistoricalTurnContentSource.js";
import { clearDemoThreadFindHighlight, highlightRenderedDemoThreadFindMatch } from "./threadFindRenderedHighlight.js";
import { makeDemoRow, demoProjectionDependencies } from "./adapters.js";
import {
  DEMO_CONVERSATIONS, appendDemoEntries, createDemoSource,
  demoActivityEntry, demoItem, demoMessageEntry, makeLongHistory,
  type DemoConversationId,
} from "./mockConversation.js";

function Icon({ name, size = 18 }: { name: "panel" | "search" | "plus" | "branch" | "dots" | "up" | "stop" | "bottom" | "top" | "play" | "refresh" | "terminal" | "check" | "menu" | "copy" | "folder" | "chevron" | "clock" | "plugin" | "settings" | "sliders" | "window" | "square" | "home" | "library" | "tiles"; size?: number }) {
  const children: Record<typeof name, React.ReactNode> = {
    home: <><path d="m3 11 9-8 9 8v9H3z"/><path d="M9 20v-6h6v6"/></>,
    library: <><path d="M4 5h5v15H4zM10 3h5v17h-5zM16 7h4v13h-4z"/></>,
    tiles: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
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
    folder: <><path d="M3 7.5a2 2 0 0 1 2-2h5l2.2 2.5H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></>,
    chevron: <path d="m7 10 5 5 5-5"/>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></>,
    plugin: <><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3"/><path d="M12 3.5v5.5M12 15v5.5"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M5 12H2m20 0h-3M12 5V2m0 20v-3M5.5 5.5l2.1 2.1m8.8 8.8 2.1 2.1m0-13-2.1 2.1m-8.8 8.8-2.1 2.1"/></>,
    sliders: <><path d="M8 4h12M4 4h0M4 12h12m4 0h0M4 20h4m4 0h8"/><circle cx="6" cy="4" r="2"/><circle cx="18" cy="12" r="2"/><circle cx="10" cy="20" r="2"/></>,
    window: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18"/></>,
    square: <rect x="4" y="4" width="16" height="16" rx="3"/>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children[name]}</svg>;
}

/**
 * Browser-only shell adapter. This renders the documented layout of the
 * desktop sidebar; it does not claim to restore Codex's private navigation.
 * Real buttons are wired; undiscovered product actions are plain text.
 */
function ConversationSidebar(props: {
  active: DemoConversationId;
  collapsed: boolean;
  onToggle: () => void;
  onSelect: (id: DemoConversationId) => void;
  onReset: () => void;
  navigationRailEnabled: boolean;
  resizeHandle?:React.ReactNode;
}) {
  const { active, collapsed, onToggle, onSelect, onReset, navigationRailEnabled, resizeHandle } = props;
  return <aside className={`demo-sidebar ${collapsed ? "demo-sidebar--collapsed" : ""}`} aria-label="演示会话导航">
    <div className="demo-sidebar-head">
      <div className="demo-logo">{collapsed ? <Icon name="folder" size={18}/> : <><strong>Codex</strong><Icon name="chevron" size={12}/></>}</div>
      <button className="demo-icon-button" type="button" title="搜索尚未恢复" aria-label="搜索尚未恢复" disabled><Icon name="search" size={17}/></button>
    </div>
    <div className="demo-sidebar-actions">
      <button type="button" className="demo-nav-action" title="新建演示会话" onClick={onReset}><Icon name="plus" size={16}/>{!collapsed && <span>New chat</span>}</button>
      {!collapsed && !navigationRailEnabled && <>
        <div className="demo-nav-action demo-nav-disabled" aria-label="Scheduled 尚未接入"><Icon name="clock" size={15}/> Scheduled</div>
        <div className="demo-nav-action demo-nav-disabled" aria-label="Plugins 尚未接入"><Icon name="plugin" size={15}/> Plugins</div>
      </>}
    </div>
    {!collapsed && <>
      <div className="demo-section-heading">Projects</div>
      <nav className="demo-chat-list" aria-label="会话">
        <div className="demo-project-heading"><Icon name="folder" size={16}/> agent web</div>
        {DEMO_CONVERSATIONS.map((item) => <button type="button" key={item.id} className={`demo-chat-link ${item.id === active ? "is-active" : ""}`} onClick={() => onSelect(item.id)} aria-current={item.id === active ? "page" : undefined}>
          <span className="demo-chat-link-title">{item.title}</span>
        </button>)}
      </nav>
      <div className="demo-sidebar-spacer"/>
      <div className="demo-section-heading demo-recent-heading">Recents</div>
      {!navigationRailEnabled && <div className="demo-sidebar-foot"><Icon name="settings" size={15}/> 预览环境 · 本地模拟数据</div>}
    </>}
    {!collapsed && resizeHandle}
  </aside>;
}

export function App() {
  const [active, setActive] = React.useState<DemoConversationId>("frontend");
  const [generation, setGeneration] = React.useState(0);
  // The host owns this feature flag. The preview chooses rail-enabled mode
  // to exercise the independently reconstructed original navigation layout.
  const navigationRailEnabled = true;
  const [collapsed, setCollapsed] = React.useState(false);
  const [sidebarWidth,setSidebarWidth]=React.useState(275);
  const [availableWidth,setAvailableWidth]=React.useState(()=>
    typeof window==="undefined"?1352:window.innerWidth);
  React.useEffect(()=>{
    const update=()=>{
      const width=window.innerWidth;
      setAvailableWidth(width);
      setSidebarWidth(current=>clampSourceSidebarWidth(current,width));
    };
    window.addEventListener("resize",update);
    return ()=>window.removeEventListener("resize",update);
  },[]);
  // Source JFu/YFu writes the preference to documentElement: the original
  // --spacing-token-sidebar is defined on :root and evaluated there.
  // Overriding only an App descendant leaves the inherited width stale.
  React.useLayoutEffect(()=>{
    const root=document.documentElement;
    root.style.setProperty("--codex-sidebar-preferred-width",`${sidebarWidth}px`);
    return ()=>{root.style.removeProperty("--codex-sidebar-preferred-width");};
  },[sidebarWidth]);
  const [measuredRailWidth, setMeasuredRailWidth] = React.useState(52);
  const [draft, setDraft] = React.useState("");
  // Preserve canonical conversation sources through navigation. Original Y
  // projects keyed turns; remounting the virtualizer must not recreate or
  // silently discard its host-owned source snapshot.
  const sessionSourcesRef = React.useRef(new Map<DemoConversationId, ReturnType<typeof createDemoSource>>());
  const draftByConversationRef = React.useRef(new Map<DemoConversationId,string>());
  const historyByConversationRef = React.useRef(new Set<DemoConversationId>());
  const updateDraft = React.useCallback((text:string)=>{
    draftByConversationRef.current.set(active,text);
    setDraft(text);
  },[active]);
  const [playing, setPlaying] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);
  const [historyAdded, setHistoryAdded] = React.useState(false);
  const [showDemoTools, setShowDemoTools] = React.useState(false);
  const [findOpen,setFindOpen]=React.useState(false);
  const [findQuery,setFindQuery]=React.useState("");
  const [findOrdinal,setFindOrdinal]=React.useState(0);
  const findInputRef=React.useRef<HTMLInputElement | null>(null);
  const scrollElementRef = React.useRef<HTMLDivElement | null>(null);
  const composerFooterRef = React.useRef<HTMLDivElement | null>(null);
  const virtualizerApiRef = React.useRef<VirtualizedTurnListApi | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldFollowRef = React.useRef(true);
  const nextIdRef = React.useRef(0);

  const source = React.useMemo(() => {
    const sessions=sessionSourcesRef.current;
    const existing=sessions.get(active);
    if(existing!=null)return existing;
    const created=createDemoSource(active);
    sessions.set(active,created);
    return created;
  },[active,generation]);
  React.useEffect(() => () => {
    for(const existing of sessionSourcesRef.current.values())existing.dispose();
    sessionSourcesRef.current.clear();
  },[]);
  const notify = React.useCallback((message: string) => {
      setToast(message);
      if (toastTimerRef.current != null) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setToast(null), 3600);
    }, []);
  // Reset creates a new demo host lifetime. Switching conversations only
    // remounts virtual rows, so historical Rk choices remain host-owned.
    const DemoRow = React.useMemo(() => makeDemoRow(notify), [notify, generation]);
    React.useEffect(() => () => DemoRow.dispose(), [DemoRow]);
  // Search the SAME source-Y-projected entries as the mounted virtualizer.
  // The canonical historical-turn source belongs to DemoRow's existing host
  // event bridge; its subscription survives virtual row unmount and clears
  // results after a real source cache invalidation.
  const findSnapshot=React.useSyncExternalStore(source.subscribe,source.getSnapshot,source.getSnapshot);
  const findHistory=DemoRow.findHistory;
  const findHistorySnapshot=React.useSyncExternalStore(
    findHistory.source.subscribe,findHistory.source.getSnapshot,findHistory.source.getSnapshot,
  );
  const findEntries=React.useMemo(()=>buildConversationRenderEntries({
    ...findSnapshot.projection,baseEntries:[...findSnapshot.entries],
  },demoProjectionDependencies).entries,[findSnapshot]);
  const findRows=React.useMemo(()=>projectDemoThreadFindRows(findEntries,entry=>{
    const query=sourceHistoricalTurnQuery(entry);
    return query!=null&&query.hostId===findHistory.query.hostId&&
      query.threadId===findHistory.query.threadId&&query.entityKey===findHistory.query.entityKey
      ?findHistorySnapshot:null;
  }),[findEntries,findHistory,findHistorySnapshot]);
  const findResult=React.useMemo(()=>searchSourceThreadLiteralRows(findRows,findQuery),[findRows,findQuery]);
  const findMatches=findResult.matches;
  const currentFindOrdinal=Math.min(findOrdinal,Math.max(0,findMatches.length-1));
  React.useEffect(()=>{
    if(!findOpen)return;
    const id=window.requestAnimationFrame(()=>{findInputRef.current?.focus();findInputRef.current?.select();});
    return ()=>window.cancelAnimationFrame(id);
  },[findOpen]);
  React.useEffect(()=>{
    if(!findOpen||!findQuery.trim()||findMatches.length===0){
      clearDemoThreadFindHighlight();
      return;
    }
    const match=findMatches[currentFindOrdinal];
    if(match==null)return;
    const controller=new AbortController();
    let frame:number|null=null;
    const ordinalWithinTurn=findMatches.slice(0,currentFindOrdinal)
      .filter(candidate=>candidate.turnKey===match.turnKey).length;
    const expectedRowMatches=findResult.totalByTurn.get(match.turnKey)??0;
    // Keep the existing source virtualizer's scroll-to-key. After the target
    // mounts, identify the precise visible Markdown occurrence. The compiled
    // search worker/highlighter is private; collapsed or unmatched source
    // fields intentionally do NOT produce a fabricated visual highlight.
    void (async()=>{
      try{
        await virtualizerApiRef.current?.scrollToKey(match.turnKey,undefined,{
          align:"center",signal:controller.signal,
        });
        if(controller.signal.aborted)return;
        frame=window.requestAnimationFrame(()=>{
          if(controller.signal.aborted||scrollElementRef.current==null)return;
          highlightRenderedDemoThreadFindMatch({
            viewport:scrollElementRef.current,turnKey:match.turnKey,query:findQuery,
            ordinalWithinTurn,expectedRowMatches,
          });
        });
      }catch{/* A replaced/removed virtual row must not crash Find. */}
    })();
    return ()=>{
      controller.abort();
      if(frame!=null)window.cancelAnimationFrame(frame);
      clearDemoThreadFindHighlight();
    };
  },[findOpen,findQuery,findMatches,currentFindOrdinal]);
  function openFind(){
    if(!findOpen){
      const selected=window.getSelection()?.toString().trim()??"";
      if(selected.length>0 && !/[\\r\\n]/.test(selected))setFindQuery(selected);
      setFindOrdinal(0);
      setFindOpen(true);
    } else {
      window.requestAnimationFrame(()=>{findInputRef.current?.focus();findInputRef.current?.select();});
    }
  }
  function closeFind(){setFindOpen(false);}
  function navigateFind(direction:"next"|"previous"){
    setFindOrdinal(index=>wrapSourceThreadFindOrdinal(index,findMatches.length,direction));
  }
  const scrollController = React.useMemo(() => new BrowserScrollController(() => scrollElementRef.current), []);

  const onApiChange = React.useCallback((api: VirtualizedTurnListApi | null) => { virtualizerApiRef.current = api; }, []);
  const scrollToBottom = React.useCallback(() => {
    shouldFollowRef.current = true;
    scrollController.scrollToDistanceFromBottomPx(0, "instant");
  }, [scrollController]);
  // Original thread-scroll-layout (Wt/Gt) measures the default footer and
  // writes its real height + 16px onto the active scroll container.
  // Preserve the existing BrowserScrollController and virtualizer; do not
  // introduce a second scroll host or imitate a fake Electron footer.
  React.useLayoutEffect(() => {
    const footer = composerFooterRef.current;
    const scroll = scrollElementRef.current;
    if (footer == null || scroll == null) return;
    let frame: number | null = null;
    const update = () => {
      const height = footer.getBoundingClientRect().height;
      const next = `${height + 16}px`;
      if (scroll.style.getPropertyValue("--thread-scroll-padding-bottom") === next) return;
      const wasFollowing = shouldFollowRef.current;
      scroll.style.setProperty("--thread-scroll-padding-bottom", next);
      // The source preserves bottom-following on Footer resize. The
      // browser-only host exposes a synchronous equivalent controller.
      if (wasFollowing) {
        if (frame != null) window.cancelAnimationFrame(frame);
        frame = window.requestAnimationFrame(() =>
          scrollController.scrollToDistanceFromBottomPx(0, "instant"));
      }
    };
    const observer = new ResizeObserver(update);
    observer.observe(footer);
    update();
    return () => {
      observer.disconnect();
      if (frame != null) window.cancelAnimationFrame(frame);
      scroll.style.removeProperty("--thread-scroll-padding-bottom");
    };
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

  // Source YMt Ti/wi/Ci presentation. These values are supplied by this
  // synthetic browser host only; no backend stop/send state is inferred.
  const composerAction = resolveComposerPrimaryAction({
    isStopping: false,
    isSubmitting: false,
    hasSubmissionMarker: false,
    isWaitingForFileUploads: false,
    canStopWhileSubmitting: false,
    isStreaming: playing,
    streamState: playing ? "streaming" : "ready",
    hasHostStopSignal: false,
    isSteeringEnabled: false,
    canQueueNativeAnswerSubmission: false,
    hasUploadPolicy: false,
    hasText: draft.trim().length > 0,
    hasAttachments: false,
    hostSendDisabled: draft.trim().length === 0,
    submitLoading: false,
  });

  function sendMessage() {
    const message = draft.trim();
    if (!message) return;
    // Demo host mapping only: "playing" means a mock action is pending. The
    // original controller/voice/conversation state remains host-owned.
    const submitDecision = resolveComposerSubmitDecision({
      controllerReady: true,
      inputDisabled: false,
      isDictating: false,
      voiceInputEnabled: false,
      submissionBlocked: false,
      voiceSessionStatus: "idle",
      conversationDisabled: false,
      pendingActionCount: playing ? 1 : 0,
      requiresWorkHomePolicyAcceptance: false,
      hasWorkHomePolicyAcceptance: true,
    });
    if (submitDecision.kind !== "submit") return;
    markFollow();
    appendDemoEntries(source, [demoMessageEntry("user", nextId("user"), message)]);
    updateDraft("");
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
    historyByConversationRef.current.add(active);
    setHistoryAdded(true);
    notify("已加入 45 条模拟消息。可滚动检查虚拟列表。");
  }
  function reset() {
    if (timerRef.current != null) clearTimeout(timerRef.current);
    timerRef.current = null;
    // Explicit reset is the only UI path that replaces the active source.
    // Switching threads never drops existing turn snapshots or drafts.
    sessionSourcesRef.current.get(active)?.dispose();
    sessionSourcesRef.current.delete(active);
    draftByConversationRef.current.delete(active);
    historyByConversationRef.current.delete(active);
    setPlaying(false);
    setHistoryAdded(false);
    setDraft("");
    setGeneration((value) => value + 1);
  }
  function switchConversation(id: DemoConversationId) {
    if (id === active) return;
    if (timerRef.current != null) clearTimeout(timerRef.current);
    timerRef.current = null;
    draftByConversationRef.current.set(active,draft);
    setPlaying(false);
    setHistoryAdded(historyByConversationRef.current.has(id));
    setDraft(draftByConversationRef.current.get(id)??"");
    setActive(id);
    // Never retain result offsets from an unrelated demo conversation.
    setFindOrdinal(0);
  }

  // Original D0e routes native Toggle Sidebar / previousThread / nextThread
  // through renderer commands. Our standalone host maps only these proven
  // commands onto EXISTING sidebar/conversation state (demo routes, not
  // the private Codex navigation/history store).
  React.useEffect(() => {
    const host=window.agentWebDesktopHost;
    if(host==null)return;
    return host.subscribeUiCommands(command=>{
      if(command==="toggle-sidebar"){
        setCollapsed(value=>!value);
        return;
      }
      if(command==="find-in-thread"){openFind();return;}
      if(command==="find-next-in-thread"){navigateFind("next");return;}
      if(command==="find-previous-in-thread"){navigateFind("previous");return;}
      const index=DEMO_CONVERSATIONS.findIndex(entry=>entry.id===active);
      if(index<0)return;
      const destination=command==="previous-thread"?index-1:index+1;
      if(destination>=0&&destination<DEMO_CONVERSATIONS.length){
        const id=DEMO_CONVERSATIONS[destination]?.id;
        if(id!=null)switchConversation(id);
      }
    });
  },[active,findOpen,findMatches.length]);

  // The direct/more identity projection is sourced from original GZc/QZc;
  // routing/feature flags are supplied explicitly by this mock host.
  const availableRailDestinations: CodexRailDestination[] = [
    { id: "builtin:home", label: "Home", icon: <Icon name="home" size={18}/>, isCurrentDestination: true, onSelect: () => switchConversation("frontend") },
    { id: "builtin:activity", label: "Activity", icon: <Icon name="branch" size={18}/> },
    { id: "builtin:automations", label: "Scheduled", icon: <Icon name="clock" size={18}/> },
    { id: "builtin:library", label: "Library", icon: <Icon name="library" size={18}/> },
    { id: "builtin:skills", label: "Skills", icon: <Icon name="tiles" size={18}/> },
  ];
  const destinationProjection = projectNavigationDestinations(availableRailDestinations, {
    navigationRailEnabled,
    directDestinationIds: ["builtin:home", "builtin:activity", "builtin:automations", "builtin:library", "builtin:skills"],
  });
  const railDestinations = destinationProjection.railDestinations.map((item) =>
    availableRailDestinations.find((candidate) => candidate.id === item.id)!,
  );

  return <div className="demo-desktop" data-app-shell-frame="true" data-independent-electron={window.agentWebDesktopHost != null} data-app-shell-feature-navigation={navigationRailEnabled} data-app-shell-sidebar-open={!collapsed} data-app-shell-application-menu-bar="true" style={{ "--app-shell-navigation-rail-width": navigationRailEnabled ? `${measuredRailWidth}px` : "0px" } as React.CSSProperties}>
    <div className="demo-window-menu" aria-label={window.agentWebDesktopHost != null ? "Electron 原生标题栏拖拽区域" : "桌面窗口示意（浏览器内，不是原生 Electron）"}>
      <span className="demo-menubar-back" aria-hidden="true">‹</span><span className="demo-menubar-back" aria-hidden="true">›</span>
      <span className="demo-menubar-panel" aria-hidden="true"><Icon name="panel" size={15}/></span>
      {window.agentWebDesktopHost != null ? (
        <div className="demo-native-application-menus" aria-label="Electron 原生应用菜单">
          {(["file","edit","view","help"] as const).map((id) => (
            <button key={id} type="button" data-desktop-menu={id}
              aria-label={`${id[0]!.toUpperCase()}${id.slice(1)} 菜单`}
              onClick={(event) => {
                const box=event.currentTarget.getBoundingClientRect();
                void window.agentWebDesktopHost?.openMenu(id,{x:box.left,y:box.bottom});
              }}>{id[0]!.toUpperCase()}{id.slice(1)}</button>
          ))}
        </div>
      ) : <><span>File</span><span>Edit</span><span>View</span><span>Help</span></>}
      <span className="demo-window-buttons" aria-hidden="true">─　□　×</span>
    </div>
    <div className="demo-app" data-codex-shell-preview="light">
    {navigationRailEnabled && <CodexNavigationRail
      destinations={railDestinations}
      onMeasuredWidthChange={setMeasuredRailWidth}
      footer={<>
        <button type="button" disabled aria-label="More（尚未接入）" title="更多导航尚未接入"><Icon name="dots" size={18}/></button>
        <button type="button" disabled aria-label="Settings（尚未接入）" title="设置尚未接入"><Icon name="settings" size={18}/></button>
      </>}
    />}
    <ConversationSidebar active={active} collapsed={collapsed} navigationRailEnabled={navigationRailEnabled} onToggle={() => setCollapsed((v) => !v)} onSelect={switchConversation} onReset={reset}
      resizeHandle={<CodexSourceSidebarResizeHandle
        width={sidebarWidth} availableWidth={availableWidth}
        onWidthChange={setSidebarWidth}/>}/>
    <div className="demo-main" data-app-shell-main-surface="default"
      data-thread-scroll-layout="default">
      <header className="demo-header" data-app-shell-main-titlebar="true">
        <div className="demo-titlebar-toolbar" role="toolbar" aria-label="聊天工具栏"
          data-app-shell-focus-area="main">
        <div className="demo-header-location" data-app-shell-titlebar-content="true">
          <span className="demo-header-folder"><Icon name="folder" size={17}/></span><strong>{DEMO_CONVERSATIONS.find((c) => c.id === active)?.title}</strong></div>
        <div className="demo-header-actions">
          <span className="demo-header-static" title="原版桌面按钮布局参考，暂未接通功能"><Icon name="dots" size={17}/></span>
          <button type="button" className="demo-icon-button" title={showDemoTools ? "收起演示工具" : "打开演示工具"} aria-label={showDemoTools ? "收起演示工具" : "打开演示工具"} aria-expanded={showDemoTools} onClick={() => setShowDemoTools((value) => !value)}><Icon name="sliders" size={17}/></button>
          <button type="button" className="demo-icon-button demo-collapse-toggle" aria-label={collapsed ? "展开侧边栏" : "收起侧边栏"} onClick={() => setCollapsed((value) => !value)}><Icon name="panel" size={17}/></button>
        </div>
        </div>
      </header>
      {findOpen && createPortal(<div className="demo-thread-find-portal" data-source-thread-find-portal="true">
        <div className="demo-thread-find-bar" data-content-search-bar="true"
        role="search" aria-label="会话内查找（当前演示仅搜索已加载会话文本）">
        <input ref={findInputRef} type="search" aria-label="Find in chat"
          placeholder="Search chat…" value={findQuery}
          onChange={event=>{setFindQuery(event.target.value);setFindOrdinal(0);}}
          onKeyDown={event=>{
            if(event.key==="Escape"){event.preventDefault();closeFind();}
            else if(event.key==="Enter"){event.preventDefault();navigateFind(event.shiftKey?"previous":"next");}
          }}/>
        <button type="button" title="Previous result" aria-label="Previous result"
          onClick={()=>navigateFind("previous")} disabled={findMatches.length===0}>↑</button>
        <button type="button" title="Next result" aria-label="Next result"
          onClick={()=>navigateFind("next")} disabled={findMatches.length===0}>↓</button>
        <span className="demo-find-results" role="status" aria-live="polite">
          {findQuery.trim()?findMatches.length===0?"0 results":
            `${currentFindOrdinal+1} / ${findResult.totalMatches}${findResult.isCapped?"+":""} results`:""}
        </span>
        <button type="button" aria-label="Close find" title="Close find"
          onClick={closeFind}>×</button>
        </div>
      </div>,document.body)}
      {showDemoTools && <div className="demo-tools-popover" data-testid="demo-tools">
        <p>本地演示工具 · 不执行真实 Agent 请求</p>
        <div className="demo-toolbar">
          <button type="button" onClick={playSample} disabled={playing}><Icon name="play" size={15}/> 模拟运行</button>
          <button type="button" onClick={injectHistory} disabled={historyAdded}><Icon name="plus" size={15}/> 添加 45 条历史</button>
          <button type="button" onClick={() => void virtualizerApiRef.current?.scrollToKey(`history-content:turn:${source.getSnapshot().entries[0]?.turnId ?? ""}`, undefined, {align:"top"})}><Icon name="top" size={15}/> 跳到开头</button>
          <button type="button" onClick={scrollToBottom}><Icon name="bottom" size={15}/> 跳到最新</button>
          <button type="button" onClick={reset}><Icon name="refresh" size={15}/> 重置</button>
        </div>
      </div>}
      <div className="demo-scroll-region" ref={scrollElementRef}
        role="region" tabIndex={0} aria-label="对话"
        data-thread-scroll-viewport=""
        onScroll={() => {
        scrollController.notifyScroll();
        shouldFollowRef.current = scrollController.getLastScrollDistanceFromBottomPx() < 120;
      }} data-testid="transcript-scroll">
        <div className="demo-thread-scroll-content" data-source-thread-scroll-content="">
        <div className="demo-transcript-column">
          <div className="demo-conversation-intro"><h1>{DEMO_CONVERSATIONS.find((c) => c.id === active)?.title}</h1><div className="demo-worked-label">Worked for 2m 11s <Icon name="chevron" size={12}/><span> · mock</span></div></div>
          <ConnectedLiveConversationTranscript
            key={`${active}-${generation}`}
            source={source}
            projectionDependencies={demoProjectionDependencies}
            RowComponent={DemoRow}
            scrollController={scrollController}
            gapPx={SOURCE_CONVERSATION_ITEM_GAP_PX}
            overscanCount={4}
            onApiChange={onApiChange}
            onVisibleContentReady={onVisibleContentReady}
            LoadingView={() => <div>加载中…</div>}
            DisconnectedView={() => <div>数据源已断开。</div>}
          />
          <div className="demo-thread-end" aria-hidden="true"/>
        </div>
        <div className="demo-thread-footer-clearance" data-thread-footer-clearance="" aria-hidden="true">
          <div className="demo-thread-footer-fade" data-thread-footer-background-part="fade"/>
        </div>
        </div>
      </div>
      <div className="demo-composer-zone" ref={composerFooterRef}
        data-thread-scroll-footer="true" data-thread-footer-placement="bottom">
        <div className="demo-thread-footer-surface" data-thread-footer-background-part="surface" aria-hidden="true"/>
        <CodexSourceComposerHostForm className="demo-composer-wrap"
          integratedVoiceModeActive={false} hasUploadPolicy={false}
          onSubmit={() => { if (composerAction.kind === "send") sendMessage(); }}>
          <CodexComposerLayout
            className="demo-composer"
            layout="multiline"
            density="comfortable"
            radiusVariant="default"
            surfaceVariant="default"
            input={<DemoProseMirrorComposerEditor key={active}
              value={draft}
              onChange={updateDraft}
              onSubmit={sendMessage}
              onPastedImages={() => notify("演示模式：图片上传尚未接入。")}
              onPastedFiles={() => notify("演示模式：文件上传尚未接入。")}
              onPastedText={() => false}
            />}
            leadingControls={<div className="demo-composer-options">
              <button type="button" className="demo-composer-plus" title="附件尚未恢复" disabled aria-label="附件尚未恢复"><Icon name="plus" size={20}/></button>
              <span className="demo-composer-permission" title="演示模式，无真实权限授予">♧ Full access <span>· mock</span></span>
            </div>}
            trailingControls={<div className="demo-composer-right">
              <span className="demo-composer-model">Demo Agent <span>Medium</span> <Icon name="chevron" size={12}/></span>
              <button type={composerAction.type} data-testid="send-button" data-composer-action={composerAction.kind} aria-busy={composerAction.loading} aria-label={composerAction.kind === "stop" ? "停止模拟" : "发送模拟消息"} title={composerAction.kind === "stop" ? "停止模拟" : "发送模拟消息"} className="demo-send-button" disabled={composerAction.disabled} onClick={composerAction.kind === "stop" ? stopSample : undefined}><Icon name={composerAction.kind === "stop" ? "stop" : "up"} size={16}/></button>
            </div>}
          />
        </CodexSourceComposerHostForm>
      </div>
    </div>
    {toast && <div className="demo-toast" role="status"><Icon name="check" size={17}/>{toast}</div>}
  </div></div>;
}
