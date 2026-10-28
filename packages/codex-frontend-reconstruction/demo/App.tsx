import * as React from "react";
import { createPortal } from "react-dom";
import { CodexComposerLayout } from "../src/components/CodexComposerLayout.js";
import {WorkspaceReadOnlyPreviewPanel,
  type WorkspaceReadOnlyPreview} from "./WorkspaceReadOnlyPreviewPanel.js";
import { CodexSourceComposerHostForm } from "../src/components/CodexSourceComposerHostForm.js";
import { CodexSourceScrollToBottomButton } from "../src/components/CodexSourceScrollToBottomButton.js";
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
import { searchSourceThreadLiteralRows, sourceThreadFindUnitIdentity,
  wrapSourceThreadFindOrdinal } from "../src/conversation/SourceThreadFindModel.js";
import {sourceMarkdownVisibleFindOrdinal} from "../src/conversation/SourceMarkdownVisibleFindModel.js";
import { sourceThreadFindSelectedQuery } from "../src/conversation/SourceThreadFindSelectionModel.js";
import { projectDemoThreadFindRows } from "./threadFindProjection.js";
import { buildConversationRenderEntries } from "../src/conversation/ConversationRenderEntriesModel.js";
import { sourceHistoricalTurnQuery } from "../src/conversation/SourceHistoricalTurnContentSource.js";
import { clearDemoThreadFindHighlight, highlightRenderedDemoThreadFindMatch,
  revealCollapsedDemoThreadFindMatch } from "./threadFindRenderedHighlight.js";
import { makeDemoRow, demoProjectionDependencies } from "./adapters.js";
import {
  DEMO_CONVERSATIONS, appendDemoEntries, createDemoSource,
  demoActivityEntry, demoItem, demoMessageEntry, makeLongHistory,
  demoStreamingCodeEntry, updateDemoStreamingCodeEntry,
  demoAutomaticReviewEntry, updateDemoAutomaticReviewEntry,
  demoMcpApprovalEntry, demoComputerUseApprovalEntry, demoBrowserWebsiteApprovalEntry, demoUrlActionEntry, demoToolSuggestionEntry, demoUserVerificationEntry, demoUnsupportedOpenAIFormEntry, demoTextFormElicitationEntry,
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
  const [draftHydrated,setDraftHydrated]=React.useState(()=>
    typeof window==="undefined" || window.agentWebDesktopHost==null);
  const activeConversationRef=React.useRef(active);
  activeConversationRef.current=active;
  const pendingDraftSaves=React.useRef(new Map<DemoConversationId,ReturnType<typeof setTimeout>>());
  const saveDraftNow=React.useCallback((id:DemoConversationId,text:string)=>{
    const pending=pendingDraftSaves.current.get(id);
    if(pending!=null)clearTimeout(pending);
    pendingDraftSaves.current.delete(id);
    const host=window.agentWebDesktopHost;
    if(host!=null)void host.setComposerDraft(id,text).catch(()=>{});
  },[]);
  const scheduleDraftSave=React.useCallback((id:DemoConversationId,text:string)=>{
    const host=window.agentWebDesktopHost;
    if(host==null)return;
    const old=pendingDraftSaves.current.get(id);
    if(old!=null)clearTimeout(old);
    pendingDraftSaves.current.set(id,setTimeout(()=>saveDraftNow(id,text),120));
  },[saveDraftNow]);
  React.useEffect(()=>{
    const host=window.agentWebDesktopHost;
    if(host==null)return;
    let live=true;
    void host.getComposerDrafts().then(saved=>{
      if(!live)return;
      for(const id of ["frontend","review"] as const){
        const value=saved[id];
        if(typeof value==="string")draftByConversationRef.current.set(id,value);
      }
      setDraft(draftByConversationRef.current.get(activeConversationRef.current)??"");
      setDraftHydrated(true);
    }).catch(()=>{if(live)setDraftHydrated(true);});
    return ()=>{live=false;};
  },[]);
  React.useEffect(()=>()=> {
    // A route switch flushes the active draft synchronously through the
    // host API; app teardown also sends any still-debounced updates.
    for(const [id,timeout] of pendingDraftSaves.current){
      clearTimeout(timeout);
      const value=draftByConversationRef.current.get(id)??"";
      void window.agentWebDesktopHost?.setComposerDraft(id,value).catch(()=>{});
    }
    pendingDraftSaves.current.clear();
  },[]);
  // Preserve canonical conversation sources through navigation. Original Y
  // projects keyed turns; remounting the virtualizer must not recreate or
  // silently discard its host-owned source snapshot.
  const sessionSourcesRef = React.useRef(new Map<DemoConversationId, ReturnType<typeof createDemoSource>>());
  const draftByConversationRef = React.useRef(new Map<DemoConversationId,string>());
  const historyByConversationRef = React.useRef(new Set<DemoConversationId>());
  const updateDraft = React.useCallback((text:string)=>{
    draftByConversationRef.current.set(active,text);
    setDraft(text);
    scheduleDraftSave(active,text);
  },[active,scheduleDraftSave]);
  const [playing, setPlaying] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);
  const [historyAdded, setHistoryAdded] = React.useState(false);
  const [showDemoTools, setShowDemoTools] = React.useState(false);
  const [workspacePreview,setWorkspacePreview]=React.useState<WorkspaceReadOnlyPreview|null>(null);
  const workspaceGrantRef=React.useRef(false);
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
  // Hold an independent scroll distance for each already-retained thread.
  // Source thread-scroll-layout exposes getLastScrollDistanceFromBottomPx,
  // scrollToDistanceFromBottomPx and holdViewport; preserve the existing
  // BrowserScrollController/VirtualizedTurnList rather than adding a scroller.
  const threadViewportDistanceRef=React.useRef(new Map<DemoConversationId,number>());
  const pendingViewportRestoreRef=React.useRef<{id:DemoConversationId;distance:number}|null>(null);
  const viewportSettleTimeoutRef=React.useRef<ReturnType<typeof setTimeout>|null>(null);
  const finishViewportRestore=React.useCallback((pending:{id:DemoConversationId;distance:number})=>{
    if(viewportSettleTimeoutRef.current!=null)clearTimeout(viewportSettleTimeoutRef.current);
    viewportSettleTimeoutRef.current=setTimeout(()=>{
      if(pendingViewportRestoreRef.current!==pending)return;
      // Allow the mounted source virtualizer to finish its height corrections.
      scrollElementRef.current?.scrollTo({
        top:Math.max(0,(scrollElementRef.current?.scrollHeight??0)-
          (scrollElementRef.current?.clientHeight??0)-pending.distance),behavior:"instant",
      });
      pendingViewportRestoreRef.current=null;
      viewportSettleTimeoutRef.current=null;
    },650);
  },[]);
  React.useEffect(()=>()=>{if(viewportSettleTimeoutRef.current!=null)clearTimeout(viewportSettleTimeoutRef.current);},[]);
  const cancelPendingViewportOnUserScroll=React.useCallback(()=>{
    if(pendingViewportRestoreRef.current==null)return;
    pendingViewportRestoreRef.current=null;
    if(viewportSettleTimeoutRef.current!=null)clearTimeout(viewportSettleTimeoutRef.current);
    viewportSettleTimeoutRef.current=null;
  },[]);
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
  const openWorkspaceAttachment=React.useCallback(async(
    request:{path:string;line?:number},
  )=>{
    const host=window.agentWebDesktopHost;
    if(host==null)return;
    try{
      if(!workspaceGrantRef.current){
        // Real native folder consent, never inferred from a transcript path.
        const grant=await host.selectWorkspaceDirectory();
        if(!grant.selected)return;
        workspaceGrantRef.current=true;
      }
      const file=await host.readWorkspaceTextFile(request);
      setWorkspacePreview(file);
    }catch(error){
      notify("本地文件无法预览：请选择包含该文件的工作区，或检查权限与格式。");
    }
  },[notify]);
  // Reset creates a new demo host lifetime. Switching conversations only
    // remounts virtual rows, so historical Rk choices remain host-owned.
    const DemoRow = React.useMemo(() => makeDemoRow(notify,openWorkspaceAttachment),
      [notify,openWorkspaceAttachment,generation]);
    React.useEffect(() => () => DemoRow.dispose(), [DemoRow]);
    // On real native host pending/settled events, mutate this SAME source
    // consumed by ConnectedLiveConversationTranscript and its virtualizer.
    React.useEffect(()=>DemoRow.bindHostElicitations(source,active),
      [DemoRow,source,active]);
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
  // Preserve the selected source turn after the Find bar closes. Otherwise
  // closing Find immediately releases the only retained virtual row before
  // an already-open historical review/diff disclosure can finish mounting.
  // The pin is limited to one canonical turn key and disappears when the
  // query/result or conversation changes; no duplicate transcript is made.
  const retainedFindTurnKeys=React.useMemo<readonly string[]>(()=>{
    const target=findMatches[currentFindOrdinal];
    return target==null?[]:[target.turnKey];
  },[findMatches,currentFindOrdinal]);

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
      .filter(candidate=>candidate.turnKey===match.turnKey &&
        candidate.unitKey===match.unitKey).length;
    const expectedRowMatches=findResult.totalByTurn.get(match.turnKey)??0;
    const expectedUnitMatches=match.unitKey==null?undefined:
      findResult.totalByUnit.get(sourceThreadFindUnitIdentity(
        match.turnKey,match.unitKey,
      ))??0;
    const sourceText=match.unitKey==null?undefined:findRows.find(row=>
      row.turnKey===match.turnKey)?.units?.find(unit=>
        unit.unitKey===match.unitKey)?.text;
    // A source match in an invisible Markdown link URL must not unfold
    // a different visible label in this message.
    const mappedVisible=sourceText==null?undefined:sourceMarkdownVisibleFindOrdinal({
      text:sourceText,query:findQuery,offset:match.offset,length:match.length,
    });
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
          const target={
            viewport:scrollElementRef.current,turnKey:match.turnKey,query:findQuery,
            ordinalWithinTurn,expectedRowMatches,
            ...(match.unitKey==null?{}:{
              unitKey:match.unitKey,expectedUnitMatches,
            }),
            ...(sourceText==null?{}:{
              sourceText,sourceOffset:match.offset,sourceLength:match.length,
            }),
          };
          // Original _u's registered reveal callback expands the user
          // content for the exact matched raw offset before finding its DOM
          // text range. Unrelated activity/assistant matches remain unchanged.
          if(mappedVisible!==null){
            revealCollapsedDemoThreadFindMatch({
              viewport:target.viewport,turnKey:target.turnKey,query:target.query,
              sourceOffset:match.offset,sourceLength:match.length,
              ...(match.unitKey==null?{}:{unitKey:match.unitKey}),
            });
          }
          highlightRenderedDemoThreadFindMatch(target);
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
      // Original app-primary cFt: a focused text control owns its selection.
      // Otherwise use the document selection. CR/LF clears the current query;
      // no selection preserves it. This is the actual mounted Find action.
      const focused=document.activeElement;
      const control=focused instanceof HTMLInputElement ||
        focused instanceof HTMLTextAreaElement ? focused : null;
      const selected=sourceThreadFindSelectedQuery(
        control,control==null?window.getSelection()?.toString():null);
      if(selected!==undefined)setFindQuery(selected);
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
  // Source Ae: with no private response spacer, show the floating footer
  // button only when the canonical scroll controller is >24px from bottom.
  const [showScrollToBottom,setShowScrollToBottom]=React.useState(false);
  const updateScrollToBottomVisibility=React.useCallback(()=>{
    setShowScrollToBottom(scrollController.getLastScrollDistanceFromBottomPx()>24);
  },[scrollController]);
  const scrollToLatest=React.useCallback(()=>{
    // Explicit navigation must supersede an unfinished route viewport hold.
    cancelPendingViewportOnUserScroll();
    shouldFollowRef.current=true;
    scrollController.scrollToBottomFromSource();
  },[scrollController,cancelPendingViewportOnUserScroll]);

  const onApiChange = React.useCallback((api: VirtualizedTurnListApi | null) => { virtualizerApiRef.current = api; }, []);
  const scrollToBottom = React.useCallback(() => {
    scrollController.cancelSourceScrollToBottomAnimation();
    shouldFollowRef.current = true;
    scrollController.scrollToDistanceFromBottomPx(0, "instant");
    setShowScrollToBottom(false);
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
  // The recovered virtualizer changes the scroll content height when its
  // mounted Markdown/tool rows finish ResizeObserver measurement. Keep the
  // source bottom-distance hold active across those actual DOM layout
  // corrections rather than releasing it after one arbitrary timer tick.
  React.useEffect(()=>{
    const content=scrollElementRef.current?.querySelector("[data-source-thread-scroll-content]");
    if(content==null||typeof ResizeObserver==="undefined")return;
    const observer=new ResizeObserver(()=>{
      const pending=pendingViewportRestoreRef.current;
      if(pending?.id===active){
        scrollController.scrollToDistanceFromBottomPx(pending.distance,"instant");
        finishViewportRestore(pending);
      }
      // Virtualized row measurements change scrollHeight without scroll.
      updateScrollToBottomVisibility();
    });
    observer.observe(content);
    return ()=>observer.disconnect();
  },[active,scrollController,finishViewportRestore,updateScrollToBottomVisibility]);
  const onVisibleContentReady = React.useCallback(() => {
    const pending=pendingViewportRestoreRef.current;
    if(pending?.id===active){
      scrollController.scrollToDistanceFromBottomPx(pending.distance,"instant");
      finishViewportRestore(pending);
      updateScrollToBottomVisibility();
      return;
    }
    updateScrollToBottomVisibility();
    // The one retained canonical Find target continues to own the viewport
    // while its historic activity or full-file review is being inspected,
    // even if the search bar itself has been dismissed.
    if(retainedFindTurnKeys.length>0)return;
    if (shouldFollowRef.current) scrollToBottom();
  }, [active,scrollController,scrollToBottom,finishViewportRestore,
      retainedFindTurnKeys,updateScrollToBottomVisibility]);

  React.useEffect(() => {
    const pending=pendingViewportRestoreRef.current;
    const requested=pending?.id===active?pending.distance:0;
    shouldFollowRef.current=requested<120;
    // The recovered virtualizer publishes its viewport after the next layout.
    // Re-apply when mounted rows have been projected, not while the previous
    // thread's DOM and scrollHeight are still attached to the scroll element.
    let secondFrame:number|null=null;
    const frame=requestAnimationFrame(()=>{
      secondFrame=requestAnimationFrame(()=>{
        if(pending?.id===active){
          scrollController.scrollToDistanceFromBottomPx(requested,"instant");
          finishViewportRestore(pending);
        }else scrollToBottom();
      });
    });
    return () => {
      cancelAnimationFrame(frame);
      if(secondFrame!=null)cancelAnimationFrame(secondFrame);
      if (timerRef.current != null) clearTimeout(timerRef.current);
    };
  }, [active,scrollController,scrollToBottom,source,finishViewportRestore]);
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
  function playStreamingCodeFixture() {
    if(playing)return;
    markFollow();
    setPlaying(true);
    const id=nextId("streaming-code");
    // DEMO-ONLY source updates, not a fake Agent transport. The same item
    // remains mounted in the canonical virtualizer across all revisions.
    const fence="```ts";
    const prefix="const sourceStreaming = 1;";
    const code=(lines:readonly string[])=>
      [fence,...lines,"```"].join("\n");
    appendDemoEntries(source,[demoStreamingCodeEntry(id,code([prefix]))]);
    timerRef.current=setTimeout(()=>{
      updateDemoStreamingCodeEntry(source,id,
        code([prefix,"const continued = 'source_' + sourceStreaming;"]));
      timerRef.current=setTimeout(()=>{
        updateDemoStreamingCodeEntry(source,id,
          code([prefix,"const continued = 'source_' + sourceStreaming;",
            "console.log(continued);"]));
        timerRef.current=setTimeout(()=>{
          updateDemoStreamingCodeEntry(source,id,
            code([prefix,"const continued = 'source_' + sourceStreaming;",
              "console.log(continued);"]),true);
          timerRef.current=null;
          setPlaying(false);
        },900);
      },90);
    },150);
  }

  function playAutomaticReviewFixture(){
    if(playing)return;
    markFollow();
    setPlaying(true);
    const id=nextId("automatic-review");
    // DEMO ONLY: exercise the original automatic-review status view using
    // immutable updates to the same canonical activity turn. This is not
    // an approval submission or backend permission request.
    appendDemoEntries(source,[demoAutomaticReviewEntry(id,"inProgress")]);
    timerRef.current=setTimeout(()=>{
      updateDemoAutomaticReviewEntry(source,id,"denied");
      timerRef.current=null;
      setPlaying(false);
    },2200);
  }

  function playMcpApprovalFixture() {
    if(playing)return;
    markFollow();
    const id=nextId("mcp-approval");
    // Test-only pending MCP request in *one canonical conversation source*;
    // even a clicked Allow action can only get a rejected host Promise.
    appendDemoEntries(source,[
      demoMcpApprovalEntry(id+"-disabled",true),
      demoMcpApprovalEntry(id),
    ]);
  }

  function playBrowserWebsiteApprovalFixture() {
    if(playing)return;
    markFollow();
    const id=nextId("browser-website-approval");
    // Synthetic pending requests exercise the existing canonical transcript.
    // Electron main rejects all replies while Agent authorization is absent.
    appendDemoEntries(source,[
      demoBrowserWebsiteApprovalEntry(id+"-policy-denied",false),
      demoBrowserWebsiteApprovalEntry(id+"-all-sites",true),
    ]);
  }

  function playTextFormFixture() {
    if(playing)return;
    markFollow();
    appendDemoEntries(source,[
      demoTextFormElicitationEntry(nextId("text-form-elicitation")),
    ]);
  }

  function playUnsupportedFormFixture() {
    if(playing)return;
    markFollow();
    appendDemoEntries(source,[
      demoUnsupportedOpenAIFormEntry(nextId("unsupported-openai-form")),
    ]);
  }

  function playUserVerificationFixture() {
    if(playing)return;
    markFollow();
    appendDemoEntries(source,[
      demoUserVerificationEntry(nextId("user-verification")),
    ]);
  }

  function playToolSuggestionFixture() {
    if(playing)return;
    markFollow();
    appendDemoEntries(source,[
      demoToolSuggestionEntry(nextId("tool-suggestion"),"connector","install"),
    ]);
  }

  function playUrlActionFixture() {
    if(playing)return;
    markFollow();
    // Original URL-action two-stage flow, explicitly synthetic request.
    appendDemoEntries(source,[demoUrlActionEntry(nextId("url-action"))]);
  }

  function playChromeWebsiteApprovalFixture() {
    if(playing)return;
    markFollow();
    // Standalone policy-denied Chrome request for the latest virtualized turn;
    // it uses the SAME host classifier and fail-closed reply callback.
    appendDemoEntries(source,[
      demoBrowserWebsiteApprovalEntry(nextId("browser-website-policy-denied"),false),
    ]);
  }

  function playComputerUseApprovalFixture() {
    if(playing)return;
    markFollow();
    const id=nextId("computer-use-approval");
    // Both requests live in the same canonical transcript. The real
    // Electron main process fails closed; no app permission is modified.
    appendDemoEntries(source,[
      demoComputerUseApprovalEntry(id+"-high-risk",true),
      demoComputerUseApprovalEntry(id),
    ]);
  }

  function playUserFileAttachmentsFixture(){
    if(playing)return;
    markFollow();
    const id=nextId("user-file-attachments");
    appendDemoEntries(source,[
      demoMessageEntry("user",id,
        "Synthetic request with host-provided file attachments. No real files are opened.",{
          attachments:[
            {path:"/projects/agent-web/src/App.tsx",
              fsPath:"/projects/agent-web/src/App.tsx",
              label:"App.tsx (14-28)",startLine:14,endLine:28},
            {path:"",label:"Detached attachment"},
          ],
          uploadedFileAttachments:[
            {upload:{fileName:"reference-notes.pdf"}},
            {upload:{fileName:"clipboard.txt"},preview:"Pasted code snippets from a test fixture"},
            {upload:{fileName:"empty-clipboard.txt"},preview:""},
          ],
        }),
    ]);
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
    scrollController.cancelSourceScrollToBottomAnimation();
    if (timerRef.current != null) clearTimeout(timerRef.current);
    timerRef.current = null;
    // Explicit reset is the only UI path that replaces the active source.
    // Switching threads never drops existing turn snapshots or drafts.
    sessionSourcesRef.current.get(active)?.dispose();
    sessionSourcesRef.current.delete(active);
    draftByConversationRef.current.delete(active);
    saveDraftNow(active,"");
    historyByConversationRef.current.delete(active);
    // Reset must not revive a viewport from a previous lifetime of this turn.
    threadViewportDistanceRef.current.delete(active);
    pendingViewportRestoreRef.current={id:active,distance:0};
    setShowScrollToBottom(false);
    setPlaying(false);
    setHistoryAdded(false);
    setDraft("");
    setGeneration((value) => value + 1);
  }
  function switchConversation(id: DemoConversationId) {
    if (id === active) return;
    scrollController.cancelSourceScrollToBottomAnimation();
    // Snapshot the existing controller before React remounts the source
    // virtualizer. The outgoing viewport and its follow policy are owned by
    // its thread identity, not a global scrollTop from the incoming thread.
    const outgoing=scrollController.getLastScrollDistanceFromBottomPx();
    threadViewportDistanceRef.current.set(active,outgoing);
    const incoming=threadViewportDistanceRef.current.get(id)??0;
    pendingViewportRestoreRef.current={id,distance:incoming};
    shouldFollowRef.current=incoming<120;
    setShowScrollToBottom(incoming>24);
    // Preserve the current editor value before ProseMirror is replaced.
    saveDraftNow(active,draftByConversationRef.current.get(active)??"");
    if (timerRef.current != null) clearTimeout(timerRef.current);
    timerRef.current = null;
    setPlaying(false);
    setHistoryAdded(historyByConversationRef.current.has(id));
    setDraft(draftByConversationRef.current.get(id)??"");
    setActive(id);
    setWorkspacePreview(null);
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
      {showDemoTools && <div className="demo-tools-popover" data-testid="demo-tools"
        onClick={event=>{
          // Fixtures append to the real virtualized conversation. Keeping this
          // demo-only overlay open obscures its newly mounted controls and
          // prevents actual pointer interaction in Chromium and Electron.
          // Close only for a selected tool, not for explanatory text clicks.
          if(event.target instanceof Element&&event.target.closest("button"))
            setShowDemoTools(false);
        }}
        onKeyDown={event=>{
          if(event.key==="Escape"){
            event.stopPropagation();
            setShowDemoTools(false);
          }
        }}>
        <p>本地演示工具 · 不执行真实 Agent 请求</p>
        <div className="demo-toolbar">
          <button type="button" onClick={playSample} disabled={playing}><Icon name="play" size={15}/> 模拟运行</button>
          <button type="button" onClick={playStreamingCodeFixture} disabled={playing}
            data-testid="demo-source-streaming-code"><Icon name="play" size={15}/> 演示流式代码（模拟）</button>
          <button type="button" onClick={playAutomaticReviewFixture} disabled={playing}
            data-testid="demo-automatic-review-transition"><Icon name="check" size={15}/> 演示自动审阅状态（模拟）</button>
          <button type="button" onClick={playMcpApprovalFixture}
            data-testid="demo-mcp-approval-request"><Icon name="check" size={15}/> 演示 MCP 审批请求（模拟）</button>
          <button type="button" onClick={playBrowserWebsiteApprovalFixture}
            data-testid="demo-browser-website-approval-request">
            <Icon name="panel" size={15}/> 演示 Browser 网站授权请求（模拟）
          </button>
          <button type="button" onClick={playTextFormFixture}
            data-testid="demo-text-form-elicitation-request">
            <Icon name="panel" size={15}/> 演示 MCP 文本表单（模拟）
          </button>
          <button type="button" onClick={playUnsupportedFormFixture}
            data-testid="demo-unsupported-openai-form-request">
            <Icon name="panel" size={15}/> 演示不支持的 MCP 表单（模拟）
          </button>
          <button type="button" onClick={playUserVerificationFixture}
            data-testid="demo-user-verification-request">
            <Icon name="check" size={15}/> 演示身份验证请求（模拟）
          </button>
          <button type="button" onClick={playToolSuggestionFixture}
            data-testid="demo-tool-suggestion-request">
            <Icon name="plugin" size={15}/> 演示工具安装建议（模拟）
          </button>
          <button type="button" onClick={playUrlActionFixture}
            data-testid="demo-url-action-request">
            <Icon name="plugin" size={15}/> 演示 URL action 请求（模拟）
          </button>
          <button type="button" onClick={playChromeWebsiteApprovalFixture}
            data-testid="demo-chrome-website-approval-request">
            <Icon name="panel" size={15}/> 演示 Chrome 网站授权请求（模拟）
          </button>
          <button type="button" onClick={playComputerUseApprovalFixture}
            data-testid="demo-computer-use-approval-request">
            <Icon name="panel" size={15}/> 演示 Computer Use 授权请求（模拟）
          </button>
          <button type="button" onClick={playUserFileAttachmentsFixture}
            data-testid="demo-source-user-file-attachments">
            <Icon name="folder" size={15}/> 演示用户文件附件（合成数据）
          </button>
          <button type="button" onClick={injectHistory} disabled={historyAdded}><Icon name="plus" size={15}/> 添加 45 条历史</button>
          <button type="button" onClick={() => void virtualizerApiRef.current?.scrollToKey(`history-content:turn:${source.getSnapshot().entries[0]?.turnId ?? ""}`, undefined, {align:"top"})}><Icon name="top" size={15}/> 跳到开头</button>
          <button type="button" onClick={scrollToBottom}><Icon name="bottom" size={15}/> 跳到最新</button>
          <button type="button" onClick={reset}><Icon name="refresh" size={15}/> 重置</button>
        </div>
      </div>}
      <div className="demo-scroll-region" ref={scrollElementRef}
        role="region" tabIndex={0} aria-label="对话"
        data-thread-scroll-viewport=""
        // Original scrollToDistanceFromBottomPx(source:"user"|"programmatic")
        // distinguishes user intent from the automatic route hold. Never
        // override a real wheel operation with a stale pending restore.
        onWheel={event=>{
          if(event.deltaY===0)return;
          scrollController.cancelSourceScrollToBottomAnimation();
          cancelPendingViewportOnUserScroll();
          shouldFollowRef.current=false;
        }}
        onScroll={() => {
        scrollController.notifyScroll();
        updateScrollToBottomVisibility();
        // Mount/measurement scroll events during a thread handoff are NOT a
        // user request to follow the new thread's bottom.
        if(pendingViewportRestoreRef.current?.id!==active){
          shouldFollowRef.current = scrollController.getLastScrollDistanceFromBottomPx() < 120;
        }
      }} data-testid="transcript-scroll">
        <div className="demo-thread-scroll-content" data-source-thread-scroll-content="">
        <div className="demo-transcript-column">
          <div className="demo-conversation-intro"><h1>{DEMO_CONVERSATIONS.find((c) => c.id === active)?.title}</h1></div>
          <ConnectedLiveConversationTranscript
            key={`${active}-${generation}`}
            source={source}
            projectionDependencies={demoProjectionDependencies}
            RowComponent={DemoRow}
            scrollController={scrollController}
            gapPx={SOURCE_CONVERSATION_ITEM_GAP_PX}
            overscanCount={4}
            retainedTurnKeys={retainedFindTurnKeys}
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
        <CodexSourceScrollToBottomButton
          visible={showScrollToBottom} onClick={scrollToLatest}/>
        <CodexSourceComposerHostForm className="demo-composer-wrap"
          integratedVoiceModeActive={false} hasUploadPolicy={false}
          onSubmit={() => { if (composerAction.kind === "send") sendMessage(); }}>
          <CodexComposerLayout
            className="demo-composer"
            layout="multiline"
            density="comfortable"
            radiusVariant="default"
            surfaceVariant="default"
            input={draftHydrated ? <DemoProseMirrorComposerEditor key={active}
              value={draft}
              onChange={updateDraft}
              onSubmit={sendMessage}
              onPastedImages={() => notify("演示模式：图片上传尚未接入。")}
              onPastedFiles={() => notify("演示模式：文件上传尚未接入。")}
              onPastedText={() => false}
            /> : <div data-composer-draft-hydrating="true" aria-live="polite">恢复输入内容中…</div>}
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
    {workspacePreview!=null?
      <WorkspaceReadOnlyPreviewPanel preview={workspacePreview}
        onClose={()=>setWorkspacePreview(null)}/>:null}
    {toast && <div className="demo-toast" role="status"><Icon name="check" size={17}/>{toast}</div>}
  </div></div>;
}
