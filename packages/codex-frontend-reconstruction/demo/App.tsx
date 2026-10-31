import * as React from "react";
import { createPortal } from "react-dom";
import { CodexComposerLayout } from "../src/components/CodexComposerLayout.js";
import {
  CodexComposerModelReasoningControl,CodexComposerPermissionModeControl,
  useCodexComposerControls,
} from "../src/components/CodexComposerHostControls.js";
import {CodexComposerDraftAttachmentTray} from "../src/components/CodexComposerDraftAttachmentTray.js";
import {
  appendComposerDraftAttachments,removeComposerDraftAttachment,
  toLocalPreviewOnlyMessageAttachments,
  type ComposerDraftAttachment,
} from "../src/conversation/ComposerDraftAttachmentsModel.js";
import {SourceLocalSubagentsPanel} from "../src/components/SourceLocalSubagentsPanel.js";
import type {SourceLocalSubagent} from "../src/conversation/SourceLocalSubagentsPanelModel.js";
import {makeSyntheticSubagentsFixture} from "./demoSubagentsFixture.js";
import {DemoSubagentTranscript} from "./DemoSubagentTranscript.js";
import "./subagentsDemoShell.css";
import {WorkspaceReadOnlyPreviewPanel,
  type WorkspaceReadOnlyPreview} from "./WorkspaceReadOnlyPreviewPanel.js";
import {
  sourceReviewFileTabId,sourceEmptyLocalReadOnlyTabState,
  sourceOpenLocalReadOnlyFileTab,sourceSelectLocalReadOnlyFileTab,
  sourceCloseLocalReadOnlyFileTab,
  sourceCloseOtherLocalReadOnlyFileTabs,sourceCloseLocalReadOnlyTabsToRight,
  sourceKeepLocalReadOnlyFileTab,
  type SourceLocalReadOnlyTabState,
} from "../src/conversation/SourceReviewFileTabModel.js";
import {sourceOpenLocationRequest} from "../src/conversation/SourceOpenLocationModel.js";
import {
  SOURCE_PINNED_CONTENT_TABS_STORAGE_KEY,
  SOURCE_PINNED_CONTENT_TAB_PRESENTATION_STORAGE_KEY,
  SOURCE_UNIFIED_SIDEBAR_PINNED_ORDER_STORAGE_KEY,
  sourceEmptyPinnedContentTabsState,
  sourceParsePinnedContentTabs,
  sourceSerializePinnedContentTabs,
  sourcePinnedContentTabId,
  sourcePinContentTab,
  sourceUnpinContentTab,
  sourceSetPinnedContentTabPresentation,
  sourceMarkPinnedContentTabUnavailable,
  sourcePinnedContentTabsInDisplayOrder,
  sourcePinnedContentTabDisplayRow,
  type SourcePinnedContentTabsState,
} from "../src/conversation/SourcePinnedContentTabsModel.js";
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
  demoMcpApprovalEntry, demoComputerUseApprovalEntry, demoBrowserWebsiteApprovalEntry, demoUrlActionEntry, demoToolSuggestionEntry, demoUserVerificationEntry, demoUnsupportedOpenAIFormEntry, demoTextFormElicitationEntry, demoMixedFormElicitationEntry, demoChoiceFormElicitationEntry, demoCustomSuggestionFormEntry, demoMultiCustomSuggestionFormEntry,
  type DemoConversationId,
} from "./mockConversation.js";

function Icon({ name, size = 18 }: { name: "panel" | "search" | "plus" | "branch" | "dots" | "up" | "stop" | "bottom" | "top" | "play" | "refresh" | "terminal" | "check" | "menu" | "copy" | "folder" | "file" | "chevron" | "clock" | "plugin" | "settings" | "sliders" | "window" | "square" | "home" | "library" | "tiles" | "square-plus" | "computer"; size?: number }) {
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
    file: <><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></>,
    chevron: <path d="m7 10 5 5 5-5"/>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></>,
    plugin: <><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3"/><path d="M12 3.5v5.5M12 15v5.5"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M5 12H2m20 0h-3M12 5V2m0 20v-3M5.5 5.5l2.1 2.1m8.8 8.8 2.1 2.1m0-13-2.1 2.1m-8.8 8.8-2.1 2.1"/></>,
    sliders: <><path d="M8 4h12M4 4h0M4 12h12m4 0h0M4 20h4m4 0h8"/><circle cx="6" cy="4" r="2"/><circle cx="18" cy="12" r="2"/><circle cx="10" cy="20" r="2"/></>,
    window: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18"/></>,
    square: <rect x="4" y="4" width="16" height="16" rx="3"/>,
    "square-plus": <><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M12 8v8M8 12h8"/></>,
    computer: <><rect x="3" y="4" width="18" height="13" rx="1.5"/><path d="M8 21h8M12 17v4"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children[name]}</svg>;
}

/**
 * Browser-only shell adapter. This renders the documented layout of the
 * desktop sidebar; it does not claim to restore Codex's private navigation.
 * Real buttons are wired; undiscovered product actions are plain text.
 */
interface PinnedSidebarItem{
  id:string;
  title:string;
  subtitle:string;
  unavailable:boolean;
  isActive:boolean;
}
type SidebarSectionKey="pinned"|"projects"|"recents";

function SidebarSection(props:{
  sectionId:SidebarSectionKey;
  title:string;
  collapsed:boolean;
  onToggle:()=>void;
  actions?:React.ReactNode;
  children:React.ReactNode;
}) {
  const {sectionId,title,collapsed,onToggle,actions,children}=props;
  const contentId=`demo-sidebar-${sectionId}-content`;
  return <section className="demo-sidebar-section"
    data-app-action-sidebar-section=""
    data-app-action-sidebar-section-collapsed={String(collapsed)}
    data-app-action-sidebar-section-heading={title}>
    <div className="demo-sidebar-section__header">
      <button type="button"
        className="demo-sidebar-section__toggle"
        data-app-action-sidebar-section-toggle=""
        data-testid={`sidebar-section-${sectionId}-toggle`}
        aria-expanded={!collapsed}
        aria-controls={contentId}
        onClick={onToggle}>
        <span className="demo-sidebar-section__label">{title}</span>
        <span className={`demo-sidebar-section__chevron ${collapsed?"is-collapsed":""}`}>
          <Icon name="chevron" size={12}/>
        </span>
      </button>
      {actions!=null&&<div className="demo-sidebar-section__actions">{actions}</div>}
    </div>
    <div id={contentId} className="demo-sidebar-section__content" hidden={collapsed}>
      {children}
    </div>
  </section>;
}

function ConversationSidebar(props: {
  active: DemoConversationId;
  collapsed: boolean;
  onToggle: () => void;
  onSelect: (id: DemoConversationId) => void;
  onNewChat: () => void;
  workspaceProjectName:string|null;
  workspaceProjectBusy:boolean;
  workspaceProjectAvailable:boolean;
  onOpenWorkspaceProject:()=>void;
  onClearWorkspaceProject:()=>void;
  navigationRailEnabled: boolean;
  pinnedItems:readonly PinnedSidebarItem[];
  onSelectPinned:(pinId:string)=>void;
  onUnpinPinned:(pinId:string)=>void;
  resizeHandle?:React.ReactNode;
}) {
  const {
    active,collapsed,onSelect,onNewChat,navigationRailEnabled,
    workspaceProjectName,workspaceProjectBusy,workspaceProjectAvailable,
    onOpenWorkspaceProject,onClearWorkspaceProject,
    pinnedItems,onSelectPinned,onUnpinPinned,resizeHandle,
  } = props;
  const [collapsedSections,setCollapsedSections]=React.useState<Record<SidebarSectionKey,boolean>>({
    pinned:false,projects:false,recents:false,
  });
  const toggleSection=(section:SidebarSectionKey)=>
    setCollapsedSections(current=>({...current,[section]:!current[section]}));
  const projectAction=<button type="button" className="demo-sidebar-project-add"
    data-app-action-sidebar-project-create=""
    aria-label="Open local folder" title={workspaceProjectAvailable
      ?"Choose a local folder (read-only preview)"
      :"Local folder selection requires the Electron desktop host"}
    disabled={!workspaceProjectAvailable||workspaceProjectBusy}
    onClick={props.onOpenWorkspaceProject}>
    <Icon name="plus" size={15}/>
  </button>;
  const isHome=active==="visual-empty";

  return <aside className={`demo-sidebar ${collapsed ? "demo-sidebar--collapsed" : ""}`}
    aria-label="Conversation sidebar">
    <div className="demo-sidebar-head">
      <div className="demo-logo" aria-label="Codex">
        {collapsed ? <Icon name="folder" size={18}/> : <><strong>Codex</strong><Icon name="chevron" size={12}/></>}
      </div>
      <button className="demo-icon-button" type="button"
        title="Search" aria-label="Search" data-testid="sidebar-search-unavailable"
        disabled><Icon name="search" size={17}/></button>
    </div>
    <div className="demo-sidebar-actions">
      <button type="button"
        className={`demo-nav-action ${isHome ? "is-active" : ""}`}
        title="New chat"
        aria-current={isHome ? "page" : undefined}
        onClick={onNewChat}>
        <Icon name="plus" size={16}/>{!collapsed && <span>New chat</span>}
      </button>
      {!collapsed && !navigationRailEnabled && <>
        <div className="demo-nav-action demo-nav-disabled" aria-label="Scheduled unavailable"><Icon name="clock" size={15}/> Scheduled</div>
        <div className="demo-nav-action demo-nav-disabled" aria-label="Plugins unavailable"><Icon name="plugin" size={15}/> Plugins</div>
      </>}
    </div>
    <div className="demo-sidebar-scroll"
      data-app-action-sidebar-scroll=""
      data-sidebar-navigation-scroll="true">
      {!collapsed && <>
        {pinnedItems.length>0&&<SidebarSection sectionId="pinned"
          title="Pinned" collapsed={collapsedSections.pinned}
          onToggle={()=>toggleSection("pinned")}>
          <nav className="demo-pinned-list" aria-label="Pinned content tabs">
            {pinnedItems.map(item=><div key={item.id}
              className="demo-pinned-item"
              data-pinned-content-tab-id={item.id}
              data-pinned-content-tab-unavailable={item.unavailable?"true":"false"}
              data-pinned-content-tab-active={item.isActive?"true":"false"}>
              <button type="button" className="demo-pinned-item__reveal"
                title={item.unavailable
                  ?`${item.title} · Preview unavailable`
                  :item.subtitle}
                aria-current={item.isActive?"page":undefined}
                onClick={()=>onSelectPinned(item.id)}>
                <Icon name="file" size={14}/>
                <span className="demo-pinned-item__labels">
                  <span className="demo-pinned-item__title">{item.title}</span>
                  <small>{item.unavailable?"Preview unavailable":item.subtitle}</small>
                </span>
              </button>
              <button type="button" className="demo-pinned-item__unpin"
                aria-label="Unpin tab" title="Unpin tab"
                onClick={()=>onUnpinPinned(item.id)}>×</button>
            </div>)}
          </nav>
        </SidebarSection>}
        <SidebarSection sectionId="projects" title="Projects"
          collapsed={collapsedSections.projects}
          onToggle={()=>toggleSection("projects")}
          actions={projectAction}>
          {isHome
            ? workspaceProjectName==null
              ? <div className="demo-sidebar-empty">No projects</div>
              : <div className="demo-sidebar-local-project" data-local-workspace-project="">
                  <button type="button" className="demo-sidebar-local-project__name"
                    aria-label="Change local folder" title="Change read-only local folder"
                    onClick={onOpenWorkspaceProject} disabled={workspaceProjectBusy}>
                    <Icon name="folder" size={15}/>
                    <span>{workspaceProjectName}</span>
                    <small>Read-only</small>
                  </button>
                  <button type="button" className="demo-sidebar-local-project__clear"
                    aria-label="Clear local folder" title="Revoke folder access"
                    onClick={onClearWorkspaceProject} disabled={workspaceProjectBusy}>×</button>
                </div>
            : <nav className="demo-chat-list" aria-label="Projects">
                <div className="demo-project-heading"><Icon name="folder" size={16}/> agent web</div>
              </nav>}
        </SidebarSection>
        <SidebarSection sectionId="recents" title="Recents"
          collapsed={collapsedSections.recents}
          onToggle={()=>toggleSection("recents")}>
          {isHome
            ? <div className="demo-sidebar-empty">No chats</div>
            : <nav className="demo-chat-list" aria-label="Recent chats">
                {DEMO_CONVERSATIONS.filter(item=>item.sidebarVisible!==false).map(item=>
                  <button type="button" key={item.id}
                    className={`demo-chat-link demo-recent-chat-link ${item.id===active?"is-active":""}`}
                    onClick={()=>onSelect(item.id)}
                    aria-current={item.id===active?"page":undefined}>
                    <span className="demo-chat-link-title">{item.title}</span>
                  </button>)}
              </nav>}
        </SidebarSection>
        {!navigationRailEnabled&&<div className="demo-sidebar-foot"><Icon name="settings" size={15}/> 预览环境 · 本地模拟数据</div>}
      </>}
    </div>
    {!collapsed && resizeHandle}
  </aside>;
}

export function App() {
  // Explicit fixture routing is limited to a test URL or a Playwright-only
  // Vite dev server. Normal browser and packaged Electron starts are empty.
  // The original standalone demo records are never a production default.
  const launchParams=typeof window==="undefined"?new URLSearchParams():
    new URLSearchParams(window.location.search);
  const isVisualShellScenario=launchParams.get("visualScenario")==="shell-empty";
  const explicitDemoScenario=launchParams.get("demoScenario");
  const devTestFixtures=import.meta.env.DEV&&
    import.meta.env.VITE_AGENT_WEB_DEMO_FIXTURES==="1";
  const demoFixtureEnabled=devTestFixtures||
    explicitDemoScenario==="frontend"||explicitDemoScenario==="review";
  const initialDemoConversation:DemoConversationId=
    explicitDemoScenario==="review"?"review":"frontend";
  const [active, setActive] = React.useState<DemoConversationId>(()=>
    isVisualShellScenario?"visual-empty":
      demoFixtureEnabled?initialDemoConversation:"visual-empty");
  const isNewChat = active === "visual-empty";
  const composerControlsHost=typeof window==="undefined"
    ?undefined:window.agentWebDesktopHost;
  const composerControls=useCodexComposerControls(composerControlsHost,active);
  const [generation, setGeneration] = React.useState(0);
  // The host owns this feature flag. The preview chooses rail-enabled mode
  // to exercise the independently reconstructed original navigation layout.
  const navigationRailEnabled = true;
  const [collapsed, setCollapsed] = React.useState(false);
  // The real A-shell-empty reference was captured with the original sidebar
  // at its 240px minimum. Keep the normal app default (275px) unchanged.
  const [sidebarWidth,setSidebarWidth]=React.useState(isVisualShellScenario?240:275);
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
  const [composerAttachments,setComposerAttachments]=React.useState<
    readonly ComposerDraftAttachment[]
  >([]);
  const composerAttachmentsRef=React.useRef<readonly ComposerDraftAttachment[]>([]);
  const composerAttachmentsByConversationRef=React.useRef(
    new Map<DemoConversationId,readonly ComposerDraftAttachment[]>(),
  );
  const composerFileInputRef=React.useRef<HTMLInputElement|null>(null);
  const composerPhotoInputRef=React.useRef<HTMLInputElement|null>(null);
  const composerFolderInputRef=React.useRef<HTMLInputElement|null>(null);
  const composerAttachmentTriggerRef=React.useRef<HTMLButtonElement|null>(null);
  const composerAttachmentMenuRef=React.useRef<HTMLDivElement|null>(null);
  const [composerAttachmentMenuOpen,setComposerAttachmentMenuOpen]=React.useState(false);
  React.useEffect(()=>setComposerAttachmentMenuOpen(false),[active]);
  React.useEffect(()=>{
    if(!composerAttachmentMenuOpen)return;
    const onOutside=(event:PointerEvent)=>{
      const node=event.target as Node|null;
      if(node!=null&&!composerAttachmentMenuRef.current?.contains(node)&&
        !composerAttachmentTriggerRef.current?.contains(node))
        setComposerAttachmentMenuOpen(false);
    };
    const onEscape=(event:KeyboardEvent)=>{
      if(event.key!=="Escape")return;
      event.preventDefault();
      setComposerAttachmentMenuOpen(false);
      composerAttachmentTriggerRef.current?.focus();
    };
    document.addEventListener("pointerdown",onOutside);
    document.addEventListener("keydown",onEscape);
    return ()=>{
      document.removeEventListener("pointerdown",onOutside);
      document.removeEventListener("keydown",onEscape);
    };
  },[composerAttachmentMenuOpen]);
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
    if(id!=="visual-empty"&&host!=null)
      void host.setComposerDraft(id,text).catch(()=>{});
  },[]);
  const scheduleDraftSave=React.useCallback((id:DemoConversationId,text:string)=>{
    if(id==="visual-empty")return;
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
      if(id!=="visual-empty")
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
  // Host-owned background agents; synthetic records are loaded only by demo tools.
  const [subagentFixture,setSubagentFixture]=React.useState<readonly SourceLocalSubagent[]|null>(null);
  const [showSubagentsPanel,setShowSubagentsPanel]=React.useState(false);
  const [selectedSubagent,setSelectedSubagent]=React.useState<string|null>(null);
  const [requestedSubagentName,setRequestedSubagentName]=React.useState<string|null>(null);
  const [workspaceTabs,setWorkspaceTabs]=React.useState<
    SourceLocalReadOnlyTabState<WorkspaceReadOnlyPreview>
  >(sourceEmptyLocalReadOnlyTabState);
  const [pinnedContentTabs,setPinnedContentTabs]=React.useState<
    SourcePinnedContentTabsState
  >(()=>{
    if(typeof window==="undefined"||isVisualShellScenario)
      return sourceEmptyPinnedContentTabsState();
    try{return sourceParsePinnedContentTabs(
      window.localStorage.getItem(SOURCE_PINNED_CONTENT_TABS_STORAGE_KEY),
      window.localStorage.getItem(SOURCE_PINNED_CONTENT_TAB_PRESENTATION_STORAGE_KEY),
      window.localStorage.getItem(SOURCE_UNIFIED_SIDEBAR_PINNED_ORDER_STORAGE_KEY),
    );}catch{return sourceEmptyPinnedContentTabsState();}
  });
  const pinnedOwnerTokensRef=React.useRef(new Map<string,string>());
  const workspaceGrantRef=React.useRef(false);
  // This is a read-only grant display, not a persistent Agent project or a
  // claim that the selected folder is bound to an execution backend.
  const [workspaceProjectName,setWorkspaceProjectName]=React.useState<string|null>(null);
  const [workspaceProjectBusy,setWorkspaceProjectBusy]=React.useState(false);
  // A file read/dialog is bound to the visible thread lifetime; an old
  // request cannot install a preview after switching/resetting conversations.
  const workspaceRequestEpochRef=React.useRef(0);
  // Only the native folder chooser is single-flight; authorized file reads
  // may finish concurrently and in a different order from user clicks.
  const workspacePickerInFlightRef=React.useRef(false);
  const workspaceSelectionIntentRef=React.useRef(0);
  // A new source-location navigation must be distinguishable even when the
  // same file, line and column are opened repeatedly.
  const workspaceLocationRequestRef=React.useRef(0);
  // Latest *new preview* request wins, independently of tab-selection
  // intent. A slow earlier preview must not replace a newer tree selection.
  const workspaceLatestPreviewIntentRef=React.useRef(0);
  const workspacePendingPreviewTabIdsRef=React.useRef(new Set<string>());
  const workspaceLatestReadByTabRef=React.useRef(new Map<string,number>());
  const cancelPendingWorkspacePreviews=React.useCallback(()=>{
    for(const pendingId of workspacePendingPreviewTabIdsRef.current)
      workspaceLatestReadByTabRef.current.delete(pendingId);
    workspacePendingPreviewTabIdsRef.current.clear();
  },[]);
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
  React.useEffect(()=>{
    // A visual-baseline route must not read or overwrite the user's saved pins.
    if(isVisualShellScenario)return;
    const serialized=sourceSerializePinnedContentTabs(pinnedContentTabs);
    try{
      window.localStorage.setItem(
        SOURCE_PINNED_CONTENT_TABS_STORAGE_KEY,serialized.pinsJson,
      );
      window.localStorage.setItem(
        SOURCE_PINNED_CONTENT_TAB_PRESENTATION_STORAGE_KEY,
        serialized.presentationJson,
      );
      window.localStorage.setItem(
        SOURCE_UNIFIED_SIDEBAR_PINNED_ORDER_STORAGE_KEY,serialized.orderJson,
      );
    }catch{/* Storage can be unavailable in private/restricted browser contexts. */}
  },[pinnedContentTabs,isVisualShellScenario]);
  // Original gqi only presents a pin as available while its exact owner is
  // mounted in the same client-thread context. A saved presentation is not
  // proof that the tab survived a reload or workspace-grant revocation.
  React.useEffect(()=>{
    setPinnedContentTabs(current=>{
      let next=current;
      const pinIds=new Set(current.pins.map(pin=>pin.id));
      for(const id of pinnedOwnerTokensRef.current.keys())
        if(!pinIds.has(id))pinnedOwnerTokensRef.current.delete(id);
      for(const pin of current.pins){
        const tab=pin.hostId==="local"&&pin.clientThreadId===active
          ?workspaceTabs.tabs.find(item=>item.id===pin.tabId):undefined;
        const previous=next.presentationById[pin.id];
        if(tab!=null){
          let sourceToken=pinnedOwnerTokensRef.current.get(pin.id);
          if(sourceToken==null){
            sourceToken=crypto.randomUUID();
            pinnedOwnerTokensRef.current.set(pin.id,sourceToken);
          }
          if(previous==null||!previous.available||
            previous.title!==tab.content.name||previous.kind!==pin.tabKind||
            previous.sourceToken!==sourceToken){
            next=sourceSetPinnedContentTabPresentation(next,pin.id,{
              sourceToken,title:tab.content.name,kind:pin.tabKind,
              chrome:null,available:true,
            });
          }
        }else{
          pinnedOwnerTokensRef.current.delete(pin.id);
          next=sourceMarkPinnedContentTabUnavailable(next,pin.id);
        }
      }
      return next;
    });
  },[workspaceTabs.tabs,active]);
  const revokeWorkspacePreview=React.useCallback(()=>{
    workspaceRequestEpochRef.current++;
    workspaceSelectionIntentRef.current++;
    workspaceLatestPreviewIntentRef.current++;
    workspacePendingPreviewTabIdsRef.current.clear();
    workspaceLatestReadByTabRef.current.clear();
    workspaceGrantRef.current=false;
    setWorkspaceProjectName(null);
    setWorkspaceProjectBusy(false);
    setWorkspaceTabs(sourceEmptyLocalReadOnlyTabState());
    // An outstanding native folder picker may resolve after this revoke;
    // its call-site checks the epoch again and revokes that late grant.
    const host=window.agentWebDesktopHost;
    if(host!=null)void host.revokeWorkspaceDirectory().catch(()=>{});
  },[]);
  const openWorkspaceProject=React.useCallback(async()=>{
    const host=window.agentWebDesktopHost;
    if(host?.selectWorkspaceDirectory==null||workspacePickerInFlightRef.current)return;
    const epoch=workspaceRequestEpochRef.current;
    workspacePickerInFlightRef.current=true;
    setWorkspaceProjectBusy(true);
    try{
      const grant=await host.selectWorkspaceDirectory();
      if(epoch!==workspaceRequestEpochRef.current){
        // Revocation/route change while the OS picker is open wins.
        if(grant.selected)await host.revokeWorkspaceDirectory().catch(()=>{});
        return;
      }
      if(!grant.selected)return;
      // This grant replaces the previous workspace, so invalidate every
      // outstanding relative file read before showing the new folder.
      workspaceRequestEpochRef.current++;
      workspaceSelectionIntentRef.current++;
      workspaceLatestPreviewIntentRef.current++;
      workspaceLatestReadByTabRef.current.clear();
      workspacePendingPreviewTabIdsRef.current.clear();
      setWorkspaceTabs(sourceEmptyLocalReadOnlyTabState());
      workspaceGrantRef.current=true;
      setWorkspaceProjectName(grant.name??null);
    }catch{
      notify("无法打开本地文件夹，请检查文件系统权限。");
    }finally{
      workspacePickerInFlightRef.current=false;
      setWorkspaceProjectBusy(false);
    }
  },[notify]);

  const openWorkspaceAttachment=React.useCallback(async(
    request:{path:string;line?:number;endLine?:number;column?:number;resetTabState?:boolean},
    mode:"preview"|"copy"="preview",
  )=>{
    const host=window.agentWebDesktopHost;
    if(host==null)return;
    const epoch=workspaceRequestEpochRef.current;
    const locationRequestId=
      request.line!=null||request.column!=null||request.resetTabState===true
        ?++workspaceLocationRequestRef.current:undefined;
    try{
      if(!workspaceGrantRef.current){
        // Main-process native folder selection is exclusive. The old global
        // busy flag also swallowed unrelated already-authorized file opens.
        if(workspacePickerInFlightRef.current)return;
        workspacePickerInFlightRef.current=true;
        let grant;
        try{grant=await host.selectWorkspaceDirectory();}
        finally{workspacePickerInFlightRef.current=false;}
        if(epoch!==workspaceRequestEpochRef.current){
          if(grant.selected)await host.revokeWorkspaceDirectory().catch(()=>{});
          return;
        }
        if(!grant.selected)return;
        workspaceGrantRef.current=true;
        setWorkspaceProjectName(grant.name??null);
      }
      // A click dropped while the exclusive native directory chooser is
      // running must not invalidate its first request's result.
      const tabId=mode==="preview"?sourceReviewFileTabId(request.path):null;
      const intent=tabId==null?null:++workspaceSelectionIntentRef.current;
      if(tabId!=null&&intent!=null)workspaceLatestReadByTabRef.current.set(tabId,intent);
      if(mode==="copy"){
        await host.copyWorkspaceFileContents(request);
        if(epoch===workspaceRequestEpochRef.current)notify("已复制文件内容");
      }else if(tabId!=null&&intent!=null){
        const file=await host.readWorkspaceTextFile({
          path:request.path,
          ...(request.line===undefined?{}:{line:request.line}),
          ...(request.endLine===undefined?{}:{endLine:request.endLine}),
        });
        const locatedFile=locationRequestId==null?file:{
          ...file,
          ...(request.line===undefined?{}:{line:request.line}),
          ...(request.endLine===undefined?{}:{endLine:request.endLine}),
          ...(request.column===undefined?{}:{column:request.column}),
          ...(request.resetTabState===undefined?{}:{resetTabState:request.resetTabState}),
          locationRequestId,
        };
        if(epoch===workspaceRequestEpochRef.current&&
            workspaceLatestReadByTabRef.current.get(tabId)===intent)
          setWorkspaceTabs(current=>{
            if(epoch!==workspaceRequestEpochRef.current||
                workspaceLatestReadByTabRef.current.get(tabId)!==intent)return current;
            // Attachment opens and workspace-tree opens can resolve to the
            // same granted relative path even though the root must never be
            // exposed to React. Reuse that live tab identity rather than
            // creating two tabs for the same file.
            const normalized=file.relativePath.replace(/\\/g,"/");
            const existing=current.tabs.find(tab=>
              tab.content.relativePath.replace(/\\/g,"/")===normalized);
            if(existing!=null&&existing.id!==tabId){
              workspaceLatestReadByTabRef.current.delete(existing.id);
              return sourceOpenLocalReadOnlyFileTab(current,{
                id:existing.id,path:existing.path,content:locatedFile,
              },intent===workspaceSelectionIntentRef.current);
            }
            return sourceOpenLocalReadOnlyFileTab(current,{
              id:tabId,path:request.path,content:locatedFile,
            },intent===workspaceSelectionIntentRef.current);
          });
      }
    }catch(error){
      if(epoch!==workspaceRequestEpochRef.current)return;
      const detail=String(error);
      if(/WORKSPACE_(?:OUTSIDE_GRANT|NOT_GRANTED|FILE_UNAVAILABLE)/.test(detail)){
        workspaceGrantRef.current=false;
        try{await host.revokeWorkspaceDirectory();}catch{}
      }
      notify(mode==="copy"
        ?"无法复制文件内容：请确认目录授权和剪贴板权限。"
        :"本地文件无法预览：请选择包含该文件的工作区，或检查权限与格式。");
    }
  },[notify]);
  /**
   * Source app-initial onOpenLocation receives a language-service Location.
   * Route it through the existing granted, read-only attachment/tab path. A
   * location is not allowed to silently request a new folder grant: it must
   * originate from an already-open local workspace preview, and Electron
   * independently enforces that the target remains inside the granted root.
   */
  const openWorkspaceLocation=React.useCallback((location:unknown)=>{
    const request=sourceOpenLocationRequest(location);
    if(request==null){
      notify("无法打开源码位置：位置数据无效。");
      return;
    }
    if(!workspaceGrantRef.current){
      notify("源码位置跳转需要当前已授权的本地工作区。");
      return;
    }
    void openWorkspaceAttachment(request);
  },[openWorkspaceAttachment,notify]);
  /** Native workspace tree uses only a grant-relative, validated path.
   * It never accepts the root or generic filesystem paths from React. */
  const openWorkspaceTreeFile=React.useCallback(async(
    relativePath:string,isPreview=true,
    location?:{line?:number;endLine?:number;column?:number;resetTabState?:boolean},
  )=>{
    const host=window.agentWebDesktopHost;
    if(host?.readWorkspaceTreeTextFile==null||!workspaceGrantRef.current)return;
    const epoch=workspaceRequestEpochRef.current;
    const locationRequestId=location==null?undefined:++workspaceLocationRequestRef.current;
    const relative=relativePath.replace(/\\/g,"/");
    const open=workspaceTabs.tabs.find(tab=>
      tab.content.relativePath.replace(/\\/g,"/")===relative);
    const intent=++workspaceSelectionIntentRef.current;
    if(open!=null){
      // Original IX preserves the tab identity and forwards source location
      // props. A resetTabState location intentionally clears the stale
      // scroll snapshot; ordinary re-selection preserves it.
      if(location!=null){
        setWorkspaceTabs(current=>({
          tabs:current.tabs.map(tab=>tab.id===open.id?{
            ...tab,content:{...tab.content,...location,
              ...(locationRequestId==null?{}:{locationRequestId})},
          }:tab),
          activeTabId:open.id,
        }));
        return;
      }
      // Re-selecting an already-pinned tab must not cancel a different
      // pending preview. Re-selecting the current preview is a newer preview
      // intent and invalidates unresolved preview reads.
      if(isPreview&&open.isPreview===true){
        workspaceLatestPreviewIntentRef.current++;
        cancelPendingWorkspacePreviews();
      }
      setWorkspaceTabs(current=>{
        const kept=isPreview?current:sourceKeepLocalReadOnlyFileTab(current,open.id);
        return sourceSelectLocalReadOnlyFileTab(kept,open.id);
      });
      return;
    }
    const previewIntent=isPreview?++workspaceLatestPreviewIntentRef.current:null;
    if(isPreview){
      // A new preview supersedes older unresolved preview reads, but does not
      // close any visible tab until the new read has actually succeeded.
      cancelPendingWorkspacePreviews();
      for(const tab of workspaceTabs.tabs)
        if(tab.isPreview===true)
          workspaceLatestReadByTabRef.current.delete(tab.id);
    }
    const tabId=sourceReviewFileTabId("workspace-tree:"+relative);
    // A double-click/pinned open of the same path supersedes any delayed
    // preview request that already made it through its click timer.
    if(!isPreview)workspacePendingPreviewTabIdsRef.current.delete(tabId);
    workspaceLatestReadByTabRef.current.set(tabId,intent);
    if(isPreview)workspacePendingPreviewTabIdsRef.current.add(tabId);
    try{
      const file=await host.readWorkspaceTreeTextFile({relativePath:relative});
      if(epoch!==workspaceRequestEpochRef.current)return;
      if(workspaceLatestReadByTabRef.current.get(tabId)!==intent)return;
      if(isPreview&&previewIntent!==workspaceLatestPreviewIntentRef.current){
        workspaceLatestReadByTabRef.current.delete(tabId);
        workspacePendingPreviewTabIdsRef.current.delete(tabId);
        return;
      }
      setWorkspaceTabs(current=>{
        if(epoch!==workspaceRequestEpochRef.current||
          workspaceLatestReadByTabRef.current.get(tabId)!==intent||
          isPreview&&previewIntent!==workspaceLatestPreviewIntentRef.current){
          if(isPreview&&workspaceLatestReadByTabRef.current.get(tabId)===intent&&
            previewIntent!==workspaceLatestPreviewIntentRef.current)
            workspaceLatestReadByTabRef.current.delete(tabId);
          if(workspaceLatestReadByTabRef.current.get(tabId)===intent)
            workspacePendingPreviewTabIdsRef.current.delete(tabId);
          return current;
        }
        workspacePendingPreviewTabIdsRef.current.delete(tabId);
        return sourceOpenLocalReadOnlyFileTab(current,{
          id:tabId,path:relative,content:location==null?file:{
            ...file,...location,
            ...(locationRequestId==null?{}:{locationRequestId}),
          },isPreview,
        },intent===workspaceSelectionIntentRef.current);
      });
    }catch(error){
      if(epoch!==workspaceRequestEpochRef.current)return;
      if(workspaceLatestReadByTabRef.current.get(tabId)===intent){
        workspaceLatestReadByTabRef.current.delete(tabId);
        workspacePendingPreviewTabIdsRef.current.delete(tabId);
      }
      notify("无法读取所选工作区文件：请确认权限及格式。");
    }
  },[workspaceTabs.tabs,notify,cancelPendingWorkspacePreviews]);
  const pinWorkspaceTab=React.useCallback((tabId:string)=>{
    const tab=workspaceTabs.tabs.find(item=>item.id===tabId);
    if(tab==null)return;
    const pinId=sourcePinnedContentTabId(null,"local",active,tabId);
    if(pinnedContentTabs.pins.some(pin=>pin.id===pinId))return;
    const sourceToken=crypto.randomUUID();
    pinnedOwnerTokensRef.current.set(pinId,sourceToken);
    const input={
      accountId:null,hostId:"local",threadId:active,clientThreadId:active,
      tabId,tabKind:"workspace-file",title:tab.content.name,
      routePath:window.location.pathname,routeSearch:window.location.search,
      sourceToken,
    } as const;
    setPinnedContentTabs(current=>sourcePinContentTab(current,input).state);
    // Original uqi calls the tab controller's pinTab before creating the
    // sidebar reference. In this fallback that keeps a disposable preview.
    workspaceSelectionIntentRef.current++;
    setWorkspaceTabs(current=>sourceKeepLocalReadOnlyFileTab(current,tabId));
  },[workspaceTabs.tabs,pinnedContentTabs.pins,active]);
  const unpinWorkspaceTab=React.useCallback((tabId:string)=>{
    const pinId=sourcePinnedContentTabId(null,"local",active,tabId);
    pinnedOwnerTokensRef.current.delete(pinId);
    setPinnedContentTabs(current=>sourceUnpinContentTab(current,pinId));
  },[active]);
  const unpinPinnedContentTab=React.useCallback((pinId:string)=>{
    pinnedOwnerTokensRef.current.delete(pinId);
    setPinnedContentTabs(current=>sourceUnpinContentTab(current,pinId));
  },[]);
  const selectPinnedContentTab=React.useCallback((pinId:string)=>{
    const pin=pinnedContentTabs.pins.find(item=>item.id===pinId);
    if(pin==null)return;
    const tab=pin.hostId==="local"&&pin.clientThreadId===active
      ?workspaceTabs.tabs.find(item=>item.id===pin.tabId):undefined;
    if(tab==null){
      notify("This source tab is unavailable. You can keep the pin or unpin it.");
      return;
    }
    workspaceSelectionIntentRef.current++;
    if(tab.isPreview===true){
      workspaceLatestPreviewIntentRef.current++;
      cancelPendingWorkspacePreviews();
    }
    setWorkspaceTabs(current=>sourceSelectLocalReadOnlyFileTab(
      sourceKeepLocalReadOnlyFileTab(current,tab.id),tab.id,
    ));
  },[pinnedContentTabs.pins,workspaceTabs.tabs,active,notify,cancelPendingWorkspacePreviews]);
  const pinnedTabIds=React.useMemo(()=>new Set(
    pinnedContentTabs.pins.filter(pin=>
      pin.hostId==="local"&&pin.clientThreadId===active,
    ).map(pin=>pin.tabId),
  ),[pinnedContentTabs.pins,active]);
  const pinnedSidebarItems=React.useMemo(()=>sourcePinnedContentTabsInDisplayOrder(
    pinnedContentTabs,
  ).map(pin=>{
    const tab=pin.hostId==="local"&&pin.clientThreadId===active
      ?workspaceTabs.tabs.find(item=>item.id===pin.tabId):undefined;
    const row=sourcePinnedContentTabDisplayRow(
      pinnedContentTabs,pin.id,tab==null?null:{
        tabId:tab.id,clientThreadId:active,title:tab.content.name,
      },workspaceTabs.activeTabId,
    );
    return row==null?null:{
      id:pin.id,title:row.title,
      subtitle:tab?.content.relativePath??"",
      unavailable:row.unavailable,isActive:row.isActive,
    };
  }).filter((item):item is PinnedSidebarItem=>item!=null),[
    pinnedContentTabs,workspaceTabs.tabs,workspaceTabs.activeTabId,active,
  ]);
  React.useEffect(()=>()=>revokeWorkspacePreview(),[revokeWorkspacePreview]);
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
  function setActiveComposerAttachments(next:readonly ComposerDraftAttachment[]){
    composerAttachmentsRef.current=next;
    composerAttachmentsByConversationRef.current.set(active,next);
    setComposerAttachments(next);
  }
  function addComposerFiles(files:readonly File[]){
    const current=composerAttachmentsRef.current;
    const next=appendComposerDraftAttachments(current,files,
      ()=>nextId("composer-attachment"));
    if(next===current)return;
    setActiveComposerAttachments(next);
    const added=next.length-current.length;
    notify(`已暂存 ${added} 个文件（本地预览，尚未上传）`);
  }
  function removeComposerFile(id:string){
    const next=removeComposerDraftAttachment(composerAttachmentsRef.current,id);
    if(next!==composerAttachmentsRef.current)setActiveComposerAttachments(next);
  }
  function handleComposerFileInputChange(event:React.ChangeEvent<HTMLInputElement>){
    addComposerFiles(Array.from(event.currentTarget.files??[]));
    // Selecting the same path again must produce a new change event.
    event.currentTarget.value="";
  }
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
    hasAttachments: composerAttachments.length>0,
    // The blank home has no Agent send host. Do not route it into the
    // synthetic demo responder or claim a submission succeeded.
    hostSendDisabled: isNewChat || (draft.trim().length === 0&&composerAttachments.length===0),
    submitLoading: false,
  });

  function sendMessage() {
    // The empty Codex home is a visual/interaction shell, not a fake Agent.
    // Once the native host exposes real thread creation, route that action
    // here; until then preserve its draft and refuse synthetic submission.
    if (isNewChat) return;
    const message = draft.trim();
    const stagedAttachments=composerAttachmentsRef.current;
    if (!message&&stagedAttachments.length===0) return;
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
    const messageAttachments=toLocalPreviewOnlyMessageAttachments(stagedAttachments);
    appendDemoEntries(source, [demoMessageEntry("user", nextId("user"), message,
      messageAttachments.length>0?{attachments:messageAttachments}:undefined)]);
    updateDraft("");
    setActiveComposerAttachments([]);
    setPlaying(true);
    const attachmentNote=stagedAttachments.length>0
      ?`\n\n本地预览附件：${stagedAttachments.length} 个（尚未上传）。`:"";
    const reply=message.length>0
      ?`**模拟回复**：已收到你的消息。\n\n> ${message.slice(0, 180).replace(/\n/g, "\n> ")}\n\n当前只是在浏览器中验证恢复后的 React 消息渲染链路，**不会请求模型或调用真实 Agent 后端**。${attachmentNote}`
      :`已在演示会话中暂存 ${stagedAttachments.length} 个本地附件。它们尚未上传，也没有发送到真实 Agent 后端。`;
    scheduleAppend(demoMessageEntry("assistant", nextId("reply"),reply),700);
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

  function playMultiCustomSuggestionFixture() {
    if(playing)return;
    markFollow();
    appendDemoEntries(source,[
      demoMultiCustomSuggestionFormEntry(nextId("multi-custom-suggestion-form")),
    ]);
  }

  function playCustomSuggestionFixture() {
    if(playing)return;
    markFollow();
    appendDemoEntries(source,[
      demoCustomSuggestionFormEntry(nextId("custom-suggestion-form")),
    ]);
  }

  function playChoiceFormFixture() {
    if(playing)return;
    markFollow();
    appendDemoEntries(source,[
      demoChoiceFormElicitationEntry(nextId("choice-form-elicitation")),
    ]);
  }

  function playMixedFormFixture() {
    if(playing)return;
    markFollow();
    appendDemoEntries(source,[
      demoMixedFormElicitationEntry(nextId("mixed-form-elicitation")),
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
            {path:"/projects/agent-web/src/index.ts",
              fsPath:"/projects/agent-web/src/index.ts",
              label:"index.ts (3)",startLine:3},
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

  /** DEMO ONLY: source-shaped LSP location event; no language server is simulated. */
  function playSourceOpenLocationFixture(){
    if(playing)return;
    markFollow();
    openWorkspaceLocation({
      path:"/projects/agent-web/src/index.ts",
      range:{start:{line:2,character:2},end:{line:2,character:8}},
    });
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
    revokeWorkspacePreview();
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
    composerAttachmentsByConversationRef.current.delete(active);
    composerAttachmentsRef.current=[];
    setComposerAttachments([]);
    setGeneration((value) => value + 1);
  }
  function switchConversation(id: DemoConversationId) {
    if (id === active) return;
    revokeWorkspacePreview();
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
    composerAttachmentsByConversationRef.current.set(active,composerAttachmentsRef.current);
    const incomingAttachments=composerAttachmentsByConversationRef.current.get(id)??[];
    composerAttachmentsRef.current=incomingAttachments;
    setComposerAttachments(incomingAttachments);
    if (timerRef.current != null) clearTimeout(timerRef.current);
    timerRef.current = null;
    setPlaying(false);
    setHistoryAdded(historyByConversationRef.current.has(id));
    setDraft(draftByConversationRef.current.get(id)??"");
    setActive(id);
    // Source F children belong to one verified parent host/conversation.
    setShowSubagentsPanel(false);
    setSubagentFixture(null);
    setSelectedSubagent(null);
    setRequestedSubagentName(null);
    // Keep explicitly opened inspector panels mounted across thread navigation;
    // their existing host-scoped state is intentionally independent of thread selection.
    // Never retain result offsets from an unrelated demo conversation.
    setFindOrdinal(0);
  }
  function startNewChat() {
    if (active === "visual-empty") {
      reset();
      return;
    }
    switchConversation("visual-empty");
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
      // Native previous/next thread shortcuts must never reveal the isolated
      // synthetic fixture records in the normal, unconnected desktop app.
      if(!demoFixtureEnabled)return;
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
    { id: "builtin:home", label: "Home", icon: <Icon name="home" size={18}/>, isCurrentDestination: true, onSelect: () => demoFixtureEnabled ? switchConversation("frontend") : startNewChat() },
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
    <ConversationSidebar active={active} collapsed={collapsed} navigationRailEnabled={navigationRailEnabled} onToggle={() => setCollapsed((v) => !v)} onSelect={switchConversation} onNewChat={startNewChat}
      workspaceProjectName={workspaceProjectName} workspaceProjectBusy={workspaceProjectBusy}
      workspaceProjectAvailable={window.agentWebDesktopHost?.selectWorkspaceDirectory!=null}
      onOpenWorkspaceProject={()=>void openWorkspaceProject()}
      onClearWorkspaceProject={revokeWorkspacePreview}
      pinnedItems={pinnedSidebarItems}
      onSelectPinned={selectPinnedContentTab}
      onUnpinPinned={unpinPinnedContentTab}
      resizeHandle={<CodexSourceSidebarResizeHandle
        width={sidebarWidth} availableWidth={availableWidth}
        onWidthChange={setSidebarWidth}/>}/>
    <div className="demo-main" data-codex-home={isNewChat ? "true" : undefined} data-app-shell-main-surface="default"
      data-thread-scroll-layout="default">
      <header className={`demo-header ${isNewChat?"demo-header--home":""}`} data-app-shell-main-titlebar="true">
        {isNewChat
          ? <div className="demo-home-header-actions">
              <button type="button" className="demo-home-tab-action"
                data-testid="home-new-tab-unavailable"
                aria-label="New tab（尚未接入）" title="New tab（尚未接入）"
                disabled><Icon name="square-plus" size={14}/></button>
            </div>
          : <div className="demo-titlebar-toolbar" role="toolbar" aria-label="聊天工具栏"
              data-app-shell-focus-area="main">
              <div className="demo-header-location" data-app-shell-titlebar-content="true">
                <span className="demo-header-folder"><Icon name="folder" size={17}/></span>
                <strong>{DEMO_CONVERSATIONS.find((c) => c.id === active)?.title}</strong>
              </div>
              <div className="demo-header-actions">
                <span className="demo-header-static" title="原版桌面按钮布局参考，暂未接通功能"><Icon name="dots" size={17}/></span>
                {subagentFixture!==null?<button type="button" className="demo-icon-button"
                  title="Subagents · synthetic fixture" aria-label="Open Subagents"
                  aria-expanded={showSubagentsPanel}
                  onClick={()=>setShowSubagentsPanel(true)}><Icon name="branch" size={17}/></button>:null}
                <button type="button" className="demo-icon-button" title={showDemoTools ? "收起演示工具" : "打开演示工具"} aria-label={showDemoTools ? "收起演示工具" : "打开演示工具"} aria-expanded={showDemoTools} onClick={() => setShowDemoTools((value) => !value)}><Icon name="sliders" size={17}/></button>
                <button type="button" className="demo-icon-button demo-collapse-toggle" aria-label={collapsed ? "展开侧边栏" : "收起侧边栏"} onClick={() => setCollapsed((value) => !value)}><Icon name="panel" size={17}/></button>
              </div>
            </div>}
      </header>
      {isNewChat && <section className="demo-home-hero" aria-label="Codex welcome" data-codex-home-hero="">
        <div className="demo-home-hero__content">
          <svg className="demo-home-hero__icon" aria-hidden="true" focusable="false"
            width="56" height="56" viewBox="149 149 418 418" fill="none"
            xmlns="http://www.w3.org/2000/svg">
            <path d="M247.429 247.43C257.73 208.911 292.871 180.543 334.638 180.543C359.555 180.543 382.115 190.64 398.449 206.964C405.906 204.97 413.743 203.905 421.829 203.905C471.681 203.906 512.096 244.32 512.096 294.173C512.096 302.259 511.031 310.096 509.037 317.553C525.361 333.887 535.458 356.446 535.458 381.364C535.458 423.131 507.09 458.271 468.571 468.572C458.271 507.091 423.131 535.459 381.364 535.459C356.446 535.459 333.886 525.362 317.552 509.037C310.095 511.031 302.258 512.097 294.172 512.097C244.319 512.097 203.906 471.682 203.906 421.829C203.906 413.743 204.969 405.905 206.963 398.448C190.639 382.115 180.543 359.555 180.543 334.638C180.543 292.871 208.91 257.73 247.429 247.43Z"
              stroke="currentColor" strokeWidth="20.581"/>
            <path d="M436.706 408.738H370.021" stroke="currentColor" strokeWidth="24" strokeLinecap="round"/>
            <path d="M276.533 309.154L303.468 357.831C304.433 359.575 304.412 361.698 303.414 363.423L276.533 409.854"
              stroke="currentColor" strokeWidth="24" strokeLinecap="round"/>
          </svg>
          <h1 className="demo-home-hero__heading">
            {workspaceProjectName==null?"What should we build?":<>
              What should we work on in{" "}
              <button type="button" className="demo-home-hero__project-select"
                onClick={()=>void openWorkspaceProject()} disabled={workspaceProjectBusy}
                title="Change read-only local folder">{workspaceProjectName}</button>?
            </>}
          </h1>
        </div>
      </section>}
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
          <button type="button" onClick={playMultiCustomSuggestionFixture}
            data-testid="demo-multi-custom-suggestion-request">
            <Icon name="panel" size={15}/> 演示 MCP 多选自定义答案（模拟）
          </button>
          <button type="button" onClick={playCustomSuggestionFixture}
            data-testid="demo-custom-suggestion-form-request">
            <Icon name="panel" size={15}/> 演示 MCP 自定义建议选项（模拟）
          </button>
          <button type="button" onClick={playChoiceFormFixture}
            data-testid="demo-choice-form-elicitation-request">
            <Icon name="panel" size={15}/> 演示 MCP 单选与多选表单（模拟）
          </button>
          <button type="button" onClick={playMixedFormFixture}
            data-testid="demo-mixed-form-elicitation-request">
            <Icon name="panel" size={15}/> 演示 MCP 布尔与数值表单（模拟）
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
          <button type="button" data-testid="demo-source-subagents-panel"
            onClick={()=>{
              setSubagentFixture(makeSyntheticSubagentsFixture());
              setSelectedSubagent(null);
              setRequestedSubagentName(null);
              setShowSubagentsPanel(true);
            }}><Icon name="branch" size={15}/> 演示 Subagents 列表（合成数据）</button>
          <button type="button" data-testid="demo-source-subagents-empty"
            onClick={()=>{
              setSubagentFixture([]);
              setSelectedSubagent(null);
              setRequestedSubagentName(null);
              setShowSubagentsPanel(true);
            }}><Icon name="branch" size={15}/> 演示无 Subagents（空宿主）</button>
          <button type="button" onClick={playUserFileAttachmentsFixture}
            data-testid="demo-source-user-file-attachments">
            <Icon name="folder" size={15}/> 演示用户文件附件（合成数据）
          </button>
          <button type="button" onClick={playSourceOpenLocationFixture}
            data-testid="demo-source-open-location">
            <Icon name="search" size={15}/> 演示源码位置跳转（合成事件）
          </button>
          <button type="button" onClick={injectHistory} disabled={historyAdded}><Icon name="plus" size={15}/> 添加 45 条历史</button>
          <button type="button" onClick={() => void virtualizerApiRef.current?.scrollToKey(`history-content:turn:${source.getSnapshot().entries[0]?.turnId ?? ""}`, undefined, {align:"top"})}><Icon name="top" size={15}/> 跳到开头</button>
          <button type="button" onClick={scrollToBottom}><Icon name="bottom" size={15}/> 跳到最新</button>
          <button type="button" onClick={reset}><Icon name="refresh" size={15}/> 重置</button>
        </div>
      </div>}
      <div className="demo-scroll-region" ref={scrollElementRef}
        role="region" tabIndex={0} aria-label={isNewChat ? "New conversation" : "对话"}
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
        data-composer-placement={isNewChat ? "home" : "thread"}
        data-thread-scroll-footer={isNewChat ? undefined : "true"}
        data-thread-footer-placement={isNewChat ? undefined : "bottom"}>
        <div className="demo-thread-footer-surface" data-thread-footer-background-part="surface" aria-hidden="true"/>
        <CodexSourceScrollToBottomButton
          visible={showScrollToBottom} onClick={scrollToLatest}/>
        <CodexSourceComposerHostForm className="demo-composer-wrap"
          integratedVoiceModeActive={false} hasUploadPolicy={false}
          onFilesDropped={files=>addComposerFiles(files)}
          onSubmit={() => { if (composerAction.kind === "send") sendMessage(); }}>
          {isNewChat&&<div className="demo-home-composer-context"
            data-testid="home-composer-context">
            <button type="button" className="demo-home-composer-context__project"
              aria-label={workspaceProjectName==null?"选择项目":"更改项目"}
              title={composerControlsHost?.selectWorkspaceDirectory==null
                ?"需要 Electron 桌面宿主才能选择本地文件夹"
                :"选择本地文件夹（只读预览）"}
              disabled={composerControlsHost?.selectWorkspaceDirectory==null||workspaceProjectBusy}
              onClick={()=>void openWorkspaceProject()}>
              <Icon name="folder" size={14}/>
              <span>{workspaceProjectName??"选择项目"}</span>
            </button>
            <span className="demo-home-composer-context__computer"
              data-testid="home-computer-context">
              <Icon name="computer" size={15}/>
              <span>此计算机</span>
            </span>
          </div>}
          <CodexComposerLayout
            className="demo-composer"
            placement={isNewChat ? "home" : "thread"}
            layout="multiline"
            density="comfortable"
            radiusVariant="default"
            surfaceVariant="default"
            attachments={composerAttachments.length>0
              ?<CodexComposerDraftAttachmentTray
                attachments={composerAttachments} onRemove={removeComposerFile}/>
              :null}
            input={draftHydrated ? <DemoProseMirrorComposerEditor key={active}
              value={draft}
              onChange={updateDraft}
              onSubmit={sendMessage}
              onPastedImages={addComposerFiles}
              onPastedFiles={addComposerFiles}
              onPastedText={() => false}
              placeholder={isNewChat ? "Do anything" : "Work with Codex"}
              ariaLabel={isNewChat ? "Do anything" : "演示消息输入"}
            /> : <div data-composer-draft-hydrating="true" aria-live="polite">恢复输入内容中…</div>}
            leadingControls={<div className="demo-composer-options">
              <input ref={composerFileInputRef} type="file" multiple
                className="demo-composer-file-input" data-testid="composer-file-input"
                aria-label="选择要添加的文件" onChange={handleComposerFileInputChange}/>
              <input ref={composerPhotoInputRef} type="file" multiple accept="image/*"
                className="demo-composer-file-input" data-testid="composer-photo-input"
                aria-label="选择要添加的照片" onChange={handleComposerFileInputChange}/>
              <input ref={node=>{
                  composerFolderInputRef.current=node;
                  if(node!=null)node.setAttribute("webkitdirectory","");
                }} type="file" multiple
                className="demo-composer-file-input" data-testid="composer-folder-input"
                aria-label="选择要添加的文件夹" onChange={handleComposerFileInputChange}/>
              <div className="demo-composer-attachment-picker" data-composer-attachment-picker="">
                <button ref={composerAttachmentTriggerRef} type="button" className="demo-composer-plus"
                  title="添加附件（本地暂存，尚未上传）" aria-label="添加文件"
                  aria-haspopup="menu" aria-expanded={composerAttachmentMenuOpen}
                  disabled={!draftHydrated}
                  onClick={()=>setComposerAttachmentMenuOpen(open=>!open)}>
                  <Icon name="plus" size={20}/>
                </button>
                {composerAttachmentMenuOpen&&<div ref={composerAttachmentMenuRef}
                  className="demo-composer-attachment-menu" role="menu" aria-label="添加附件"
                  data-composer-attachment-menu="">
                  <button type="button" role="menuitem"
                    onClick={()=>{
                      setComposerAttachmentMenuOpen(false);
                      composerPhotoInputRef.current?.click();
                    }}>
                    <Icon name="file" size={16}/><span>Add photos</span>
                  </button>
                  <div className="demo-composer-attachment-menu__heading">Files and folders</div>
                  <button type="button" role="menuitem"
                    onClick={()=>{
                      setComposerAttachmentMenuOpen(false);
                      composerFileInputRef.current?.click();
                    }}>
                    <Icon name="file" size={16}/><span>Add files</span>
                  </button>
                  <button type="button" role="menuitem"
                    onClick={()=>{
                      setComposerAttachmentMenuOpen(false);
                      composerFolderInputRef.current?.click();
                    }}>
                    <Icon name="folder" size={16}/><span>Add folder</span>
                  </button>
                  <p className="demo-composer-attachment-menu__note">
                    Local preview only. Files are not uploaded to an Agent.
                  </p>
                </div>}
              </div>
              <CodexComposerPermissionModeControl key={active} controls={composerControls}/>
            </div>}
            trailingControls={<div className="demo-composer-right">
              <CodexComposerModelReasoningControl key={active} controls={composerControls}/>
              <button type={composerAction.type} data-testid="send-button" data-composer-action={composerAction.kind} aria-busy={composerAction.loading} aria-label={isNewChat ? "发送消息（Agent 未连接）" : composerAction.kind === "stop" ? "停止模拟" : "发送模拟消息"} title={isNewChat ? "Agent 未连接，暂不可发送" : composerAction.kind === "stop" ? "停止模拟" : "发送模拟消息"} className="demo-send-button" disabled={composerAction.disabled} onClick={composerAction.kind === "stop" ? stopSample : undefined}><Icon name={composerAction.kind === "stop" ? "stop" : "up"} size={16}/></button>
            </div>}
          />
        </CodexSourceComposerHostForm>
      </div>
    </div>
    {workspaceTabs.activeTabId!=null&&
      workspaceTabs.tabs.find(tab=>tab.id===workspaceTabs.activeTabId)!=null?
      <WorkspaceReadOnlyPreviewPanel
        tabs={workspaceTabs.tabs}
        activeTabId={workspaceTabs.activeTabId}
        preview={workspaceTabs.tabs.find(tab=>
          tab.id===workspaceTabs.activeTabId)!.content}
        onSelectTab={id=>{
          if(workspaceTabs.tabs.find(tab=>tab.id===id)?.isPreview===true){
            workspaceLatestPreviewIntentRef.current++;
            cancelPendingWorkspacePreviews();
          }
          workspaceSelectionIntentRef.current++;
          setWorkspaceTabs(current=>sourceSelectLocalReadOnlyFileTab(current,id));
        }}
        onKeepTab={id=>{
          workspaceSelectionIntentRef.current++;
          setWorkspaceTabs(current=>sourceKeepLocalReadOnlyFileTab(current,id));
        }}
        onCloseTab={id=>{
          workspaceSelectionIntentRef.current++;
          workspaceLatestReadByTabRef.current.delete(id);
          workspacePendingPreviewTabIdsRef.current.delete(id);
          setWorkspaceTabs(current=>sourceCloseLocalReadOnlyFileTab(current,id));
        }}
        onCloseOthers={id=>{
          workspaceSelectionIntentRef.current++;
          // Closing other tabs must also invalidate pending reads that have
          // not yet produced visible tabs; otherwise they can resurrect.
          const latest=workspaceLatestReadByTabRef.current.get(id);
          workspaceLatestReadByTabRef.current.clear();
          workspacePendingPreviewTabIdsRef.current.clear();
          if(latest!=null)workspaceLatestReadByTabRef.current.set(id,latest);
          setWorkspaceTabs(current=>sourceCloseOtherLocalReadOnlyFileTabs(current,id));
        }}
        onOpenTreeFile={openWorkspaceTreeFile}
        onOpenLocation={openWorkspaceLocation}
        pinnedTabIds={pinnedTabIds}
        onPinTab={pinWorkspaceTab}
        onUnpinTab={unpinWorkspaceTab}
        onCloseToRight={id=>{
          workspaceSelectionIntentRef.current++;
          const index=workspaceTabs.tabs.findIndex(tab=>tab.id===id);
          if(index<0)return;
          const retain=new Set(workspaceTabs.tabs.slice(0,index+1).map(tab=>tab.id));
          // Existing strip order is the source for the right-side range.
          // Pending, unmounted tabs are not authorized to reappear.
          for(const key of workspaceLatestReadByTabRef.current.keys())
            if(!retain.has(key))workspaceLatestReadByTabRef.current.delete(key);
          for(const key of workspacePendingPreviewTabIdsRef.current)
            if(!retain.has(key))workspacePendingPreviewTabIdsRef.current.delete(key);
          setWorkspaceTabs(current=>sourceCloseLocalReadOnlyTabsToRight(current,id));
        }}
        onClose={()=>{
          workspaceSelectionIntentRef.current++;
          const id=workspaceTabs.activeTabId;
          if(id!=null)workspaceLatestReadByTabRef.current.delete(id);
          setWorkspaceTabs(current=>
            sourceCloseLocalReadOnlyFileTab(current,current.activeTabId??""));
        }}
      />:null}
    {showSubagentsPanel&&subagentFixture!==null?<div className="demo-subagents-right-tab-host"
      data-demo-source-subagents-right-tab="">
      <SourceLocalSubagentsPanel
        hostId="demo-host" parentConversationId={active}
        subagents={subagentFixture}
        selectedConversationId={selectedSubagent}
        requestedDisplayName={requestedSubagentName}
        onSelect={(id,name)=>{
          setSelectedSubagent(id);
          setRequestedSubagentName(name);
        }}
        onClose={()=>setShowSubagentsPanel(false)}
        renderTranscript={({conversationId})=><DemoSubagentTranscript
          key={conversationId} conversationId={conversationId}
          RowComponent={DemoRow}/>}/>
    </div>:null}
    {toast && <div className="demo-toast" role="status"><Icon name="check" size={17}/>{toast}</div>}
  </div></div>;
}
