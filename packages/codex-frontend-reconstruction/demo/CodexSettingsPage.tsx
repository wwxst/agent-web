import * as React from "react";
import "./codexSettingsPage.css";

type SettingsSection = {
  slug: string;
  label: string;
  searchableText?: string;
  /** Only source-backed, locally implemented screens are selectable. */
  implemented?: boolean;
};
type SettingsGroup = { heading: string; sections: readonly SettingsSection[] };

const SETTINGS_GROUPS: readonly SettingsGroup[] = [
  { heading: "Personal", sections: [
    { slug: "general-settings", label: "General", implemented: true,
      searchableText: "Theme UI font size Use pointer cursors Reduce motion Enter send shortcuts projectless chat folder" },
    { slug: "notifications", label: "Notifications" },
    { slug: "import", label: "Import" },
    { slug: "profile", label: "Profile" },
    { slug: "appearance", label: "Appearance", implemented: true,
      searchableText: "Visual style Mode Theme Light Dark System Accent Background Foreground Contrast UI font Code font" },
    { slug: "security", label: "Security" },
    { slug: "account", label: "Account" },
    { slug: "data-controls", label: "Data controls" },
    { slug: "archived-chats", label: "Archived chats" },
    { slug: "personalization", label: "Personalization" },
    { slug: "keyboard-shortcuts", label: "Keyboard shortcuts" },
  ] },
  { heading: "Integrations", sections: [
    { slug: "plugins-settings", label: "Plugins" },
    { slug: "computer-use", label: "Computer use" },
    { slug: "mcp-settings", label: "MCP" },
    { slug: "skills-settings", label: "Skills" },
    { slug: "browser-use", label: "Browser use" },
  ] },
  { heading: "Coding", sections: [
    { slug: "hooks-settings", label: "Hooks" },
    { slug: "connections", label: "Connections" },
    { slug: "cloud-settings", label: "Cloud settings" },
    { slug: "cloud-environments", label: "Cloud environments" },
    { slug: "code-review", label: "Code review" },
    { slug: "git-settings", label: "Git" },
    { slug: "local-environments", label: "Local environments" },
    { slug: "worktrees", label: "Worktrees" },
  ] },
];

const MOTION_STORAGE_KEY = "agent-web:frontend-reduce-motion";
function readReducedMotion(): boolean {
  try { return window.localStorage.getItem(MOTION_STORAGE_KEY) === "true"; }
  catch { return false; }
}

function SettingRow({
  title, description, children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}): React.ReactElement {
  return <div className="codex-settings__row">
    <div className="codex-settings__row-copy">
      <div className="codex-settings__row-name">{title}</div>
      {description && <div className="codex-settings__row-description">{description}</div>}
    </div>
    <div className="codex-settings__row-control">{children}</div>
  </div>;
}
function UnavailableChoice({label}: {label: string}): React.ReactElement {
  return <button type="button" className="codex-settings__choice"
    title="This preference requires a settings host" disabled>{label}</button>;
}

export interface CodexSettingsPageProps {
  onBack: () => void;
}

/**
 * Independent reconstruction of the source settings route/navigation:
 * settings-page-3320f8f55cf7.js (Personal/Integrations/Coding, search,
 * ArrowUp/Down, Back to app, navigation collapse), plus
 * general-settings-a68a0de66803.js (General/Appearance row labels).
 *
 * No private settings store exists in this host. Only search, navigation,
 * collapse and the frontend-owned reduced-motion preference are operative.
 * Unsupported host-managed settings are intentionally non-interactive.
 */
export function CodexSettingsPage({onBack}: CodexSettingsPageProps): React.ReactElement {
  const [activeSection, setActiveSection] = React.useState("general-settings");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [collapsed, setCollapsed] = React.useState(false);
  const [reducedMotion, setReducedMotion] = React.useState(readReducedMotion);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const contentRef = React.useRef<HTMLElement>(null);
  const query = searchQuery.trim().toLocaleLowerCase();

  React.useEffect(() => {
    const onFind = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setCollapsed(false);
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener("keydown", onFind);
    return () => window.removeEventListener("keydown", onFind);
  }, []);

  React.useEffect(() => {
    const root = document.documentElement;
    if (reducedMotion) root.setAttribute("data-codex-reduce-motion", "true");
    else root.removeAttribute("data-codex-reduce-motion");
    try { window.localStorage.setItem(MOTION_STORAGE_KEY, String(reducedMotion)); }
    catch { /* Browser storage can be restricted. */ }
  }, [reducedMotion]);

  const groups = SETTINGS_GROUPS.map(group => ({
    ...group,
    sections: group.sections.filter(section =>
      query.length === 0 ||
      (section.label + " " + (section.searchableText ?? "")).toLocaleLowerCase().includes(query)),
  })).filter(group => group.sections.length > 0);
  const resultCount = groups.reduce((count, group) => count + group.sections.length, 0);
  const selected = SETTINGS_GROUPS.flatMap(group => group.sections)
    .find(section => section.slug === activeSection)!;

  function selectSection(slug: string) {
    setActiveSection(slug);
    contentRef.current?.scrollTo({top: 0});
  }
  function onNavigationKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const target = event.target;
    if (!(target instanceof Element) || !target.closest("[data-settings-panel-slug]")) return;
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>(
        "button[data-settings-panel-slug]:not(:disabled)"),
    );
    const index = items.indexOf(target.closest("button") as HTMLButtonElement);
    const adjacent = items[index + (event.key === "ArrowDown" ? 1 : -1)];
    if (adjacent == null) return;
    event.preventDefault();
    adjacent.focus();
    adjacent.click();
  }

  return <section className="codex-settings" data-codex-settings-page="true"
      aria-label="Settings" data-settings-sidebar-collapsed={collapsed}>
    <nav className="codex-settings__navigation" aria-label="Settings"
      onKeyDown={onNavigationKeyDown}>
      <div className="codex-settings__navigation-header">
        <button type="button" className="codex-settings__back" onClick={onBack}
          aria-label="Back to app" title="Back to app">
          <span aria-hidden="true">‹</span>
          {!collapsed && <span>Back to app</span>}
        </button>
        <button type="button" className="codex-settings__collapse"
          title={collapsed ? "Expand settings navigation" : "Collapse settings navigation"}
          aria-label={collapsed ? "Expand settings navigation" : "Collapse settings navigation"}
          aria-expanded={!collapsed} onClick={() => setCollapsed(value => !value)}>
          <svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true">
            <rect x="2.25" y="3" width="15.5" height="14" rx="2" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M7.2 3v14" stroke="currentColor" strokeWidth="1.3"/>
          </svg>
        </button>
      </div>
      {!collapsed && <>
        <div className="codex-settings__search">
          <svg viewBox="0 0 20 20" fill="none" width="17" height="17" aria-hidden="true">
            <circle cx="8.8" cy="8.8" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="m13 13 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input ref={searchInputRef} type="search" role="searchbox"
            aria-label="Search settings" placeholder="Search" value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            onKeyDown={event => {
              if (event.key === "Escape") { setSearchQuery(""); event.currentTarget.blur(); }
            }}/>
          {searchQuery && <button type="button" aria-label="Clear settings search"
            onClick={() => {setSearchQuery("");searchInputRef.current?.focus();}}>×</button>}
        </div>
        <div className="codex-settings__navigation-scroll">
          {resultCount === 0 && <p className="codex-settings__empty" role="status">No results found</p>}
          {groups.map(group => <div className="codex-settings__nav-group" key={group.heading}>
            <h2>{group.heading}</h2>
            {group.sections.map(section => <button key={section.slug} type="button"
              data-settings-panel-slug={section.slug}
              aria-current={activeSection === section.slug ? "page" : undefined}
              className="codex-settings__nav-entry"
              disabled={!section.implemented}
              title={section.implemented ? section.label : `${section.label} — not yet restored`}
              onClick={() => selectSection(section.slug)}>
              {section.label}
            </button>)}
          </div>)}
        </div>
      </>}
    </nav>
    <main className="codex-settings__content" ref={contentRef}
      data-settings-active-panel={activeSection}>
      <div className="codex-settings__content-inner">
        <h1>{selected.label}</h1>
        {activeSection === "general-settings" ? <>
          <section className="codex-settings__section" aria-labelledby="settings-appearance-heading">
            <h2 id="settings-appearance-heading">Appearance</h2>
            <SettingRow title="Theme">
              <UnavailableChoice label="Light"/>
              <UnavailableChoice label="Dark"/>
              <UnavailableChoice label="System"/>
            </SettingRow>
            <SettingRow title="UI font size" description="Adjust the base size used for ChatGPT">
              <UnavailableChoice label="Default"/>
            </SettingRow>
            <SettingRow title="Reduce motion" description="Reduce animations or match your system">
              <button type="button" role="switch" aria-checked={reducedMotion}
                aria-label="Reduce motion" className="codex-settings__switch"
                data-state={reducedMotion ? "on" : "off"}
                onClick={() => setReducedMotion(value => !value)}>
                <span className="codex-settings__switch-thumb"/>
              </button>
            </SettingRow>
          </section>
          <section className="codex-settings__section" aria-labelledby="settings-composer-heading">
            <h2 id="settings-composer-heading">Chat</h2>
            <SettingRow title="Enter" description="Choose when Enter sends a prompt or inserts a new line">
              <UnavailableChoice label="Enter"/>
            </SettingRow>
            <SettingRow title="Projectless chat folder"
              description="The location where chats started outside of projects store their data by default.">
              <UnavailableChoice label="Change"/>
            </SettingRow>
          </section>
          <section className="codex-settings__section" aria-labelledby="settings-desktop-heading">
            <h2 id="settings-desktop-heading">Desktop</h2>
            <SettingRow title="Launch at login"><UnavailableChoice label="Off"/></SettingRow>
            <SettingRow title="Confirm before closing a window">
              <UnavailableChoice label="Close shortcut only"/>
            </SettingRow>
          </section>
        </> : <section className="codex-settings__section" aria-labelledby="settings-visual-heading">
          <h2 id="settings-visual-heading">Visual style</h2>
          <SettingRow title="Mode">
            <UnavailableChoice label="Light"/>
            <UnavailableChoice label="Dark"/>
            <UnavailableChoice label="System"/>
          </SettingRow>
          <SettingRow title="Theme"><UnavailableChoice label="Codex"/></SettingRow>
          <SettingRow title="Accent"><UnavailableChoice label="Default"/></SettingRow>
          <SettingRow title="Background"><UnavailableChoice label="Default"/></SettingRow>
          <SettingRow title="Foreground"><UnavailableChoice label="Default"/></SettingRow>
          <SettingRow title="Contrast"><UnavailableChoice label="Default"/></SettingRow>
          <SettingRow title="UI font"><UnavailableChoice label="System"/></SettingRow>
          <SettingRow title="Code font"><UnavailableChoice label="Default"/></SettingRow>
        </section>}
      </div>
    </main>
  </section>;
}
