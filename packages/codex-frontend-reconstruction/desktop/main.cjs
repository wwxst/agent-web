"use strict";
/**
 * Standalone, independently authored Electron *host shell* for the recovered
 * React frontend. Not the original Codex main process or private app host.
 *
 * The original Windows bundle uses an Electron preload / contextBridge and
 * codex_desktop message channels, confirmed in frontend/.vite/build/preload.js
 * (SHA-256 a3e622f8d80a83e58fb3cfcc640fa7e14e6461cccdae9ef7d7b0c821dde256b7).
 * We intentionally DO NOT impersonate its private electronBridge API.
 */
const path = require("node:path");
const {app, BrowserWindow, ipcMain, shell, nativeTheme, screen, Menu} = require("electron");
const {
  PRIMARY_MIN_WIDTH,PRIMARY_MIN_HEIGHT,sourcePrimaryChromeOptions,
} = require("./windowChrome.cjs");
const {restorePrimaryWindowBounds,persistPrimaryWindowBounds}=require("./windowBounds.cjs");
const {buildSourceNativeMenus,isAllowedMenuId,sanitizeMenuAnchor}=require("./nativeMenu.cjs");
const {isAllowedNavigation:allowedNavigation}=require("./navigationPolicy.cjs");

const HOST_INFO_CHANNEL = "agent-web:host-info";
const HOST_EVENT_CHANNEL = "agent-web:host-event";
const UI_COMMAND_CHANNEL = "agent-web:ui-command";
const OPEN_MENU_CHANNEL = "agent-web:open-menu";
const devUrl=process.env.AGENT_WEB_DEV_URL || "";
const devMode=devUrl.length>0;
const indexPath=path.resolve(__dirname,"../demo-dist/index.html");
let mainWindow=null;

function isAllowedNavigation(url){
  return allowedNavigation(url,{devUrl,indexPath});
}
function createWindow(){
  // i3e restores only geometry still intersecting an attached display.
  const bounds=restorePrimaryWindowBounds(app.getPath("userData"),screen.getAllDisplays());
  const win=new BrowserWindow({
    ...(bounds==null?{}:{x:bounds.x,y:bounds.y,width:bounds.width,height:bounds.height}),
    width:1352,height:760,minWidth:PRIMARY_MIN_WIDTH,minHeight:PRIMARY_MIN_HEIGHT,show:false,
    title:"agent-web · Codex 前端恢复",
    // The renderer is currently an explicitly light preview; opaque matching
    // its surface prevents the prior dark flash during native startup.
    backgroundColor:"#f9f9f9",
    ...sourcePrimaryChromeOptions(process.platform,nativeTheme.shouldUseDarkColors),
    autoHideMenuBar:true,
    webPreferences:{
      preload:path.join(__dirname,"preload.cjs"),
      contextIsolation:true,nodeIntegration:false,sandbox:true,
      webSecurity:true,allowRunningInsecureContent:false,
    },
  });
  mainWindow=win;
  // Original keeps accelerators in native Menu while its own window owns
  // the visible File/Edit/View/Help chrome. Our header requests bounded
  // submenu popups from main, rather than a separate renderer menu model.
  if(process.platform!=="darwin")win.setMenuBarVisibility(false);
  // Source i3e.installApplicationMenuTitleBarOverlaySync refreshes A9 on
  // nativeTheme.updated; main handles window chrome, not React pseudo buttons.
  const refreshChrome=()=>{
    if(win.isDestroyed()||typeof win.setTitleBarOverlay!=="function")return;
    const chrome=sourcePrimaryChromeOptions(process.platform,nativeTheme.shouldUseDarkColors);
    if(chrome.titleBarOverlay!=null)win.setTitleBarOverlay(chrome.titleBarOverlay);
  };
  nativeTheme.on("updated",refreshChrome);
  win.on("closed",()=>nativeTheme.off("updated",refreshChrome));
  win.once("ready-to-show",()=>{
    if(bounds?.isMaximized)win.maximize();
    win.show();
  });
  win.on("close",()=>{
    if(win.isDestroyed())return;
    const ordinary=win.getNormalBounds();
    persistPrimaryWindowBounds(app.getPath("userData"),{
      ...ordinary,isMaximized:win.isMaximized(),
    });
  });
  win.webContents.setWindowOpenHandler(({url})=>{
    if(/^https:\/\//i.test(url))void shell.openExternal(url);
    return {action:"deny"};
  });
  win.webContents.on("will-navigate",(event,url)=>{
    if(!isAllowedNavigation(url))event.preventDefault();
  });
  if(devMode)void win.loadURL(devUrl);
  else void win.loadFile(indexPath);
  win.on("closed",()=>{if(mainWindow===win)mainWindow=null;});
  return win;
}
function focusedWindow(){
  const win=BrowserWindow.getFocusedWindow()??mainWindow;
  return win!=null&&!win.isDestroyed()?win:null;
}
// Source D0e sends these messages to the focused primary webview. The
// standalone host sends a narrow, independently authored command envelope
// rather than claiming compatibility with private codex_desktop IPC.
function sendSourceUiCommand(type){
  const win=focusedWindow();
  if(win==null||win.webContents.isDestroyed()||win.webContents.isLoading())return false;
  if(!isAllowedNavigation(win.webContents.getURL()))return false;
  win.webContents.send(UI_COMMAND_CHANNEL,{type});
  return true;
}
function installNativeMenu(){
  const actions={
    toggleSidebar:()=>sendSourceUiCommand("toggle-sidebar"),
    previousThread:()=>sendSourceUiCommand("previous-thread"),
    nextThread:()=>sendSourceUiCommand("next-thread"),
    closeWindow:()=>focusedWindow()?.close(),
    quit:()=>app.quit(),
    // Original native menu forwards step-window-zoom/reset-window-zoom to
    // its private renderer command dispatcher. Our standalone WebContents
    // uses Chromium's standard step (zoomLevel ±1) at that same boundary.
    zoomIn:()=>{
      const win=focusedWindow();
      if(win!=null)win.webContents.setZoomLevel(
        Math.min(6,win.webContents.getZoomLevel()+1));
    },
    zoomOut:()=>{
      const win=focusedWindow();
      if(win!=null)win.webContents.setZoomLevel(
        Math.max(-6,win.webContents.getZoomLevel()-1));
    },
    actualSize:()=>focusedWindow()?.webContents.setZoomLevel(0),
    toggleFullScreen:()=>{
      const win=focusedWindow();
      if(win!=null)win.setFullScreen(!win.isFullScreen());
    },
    documentation:()=>void shell.openExternal("https://developers.openai.com/codex/app"),
  };
  const template=buildSourceNativeMenus({platform:process.platform,actions});
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  return template;
}
function setupIpc(){
  const template=installNativeMenu();
  ipcMain.handle(OPEN_MENU_CHANNEL,(event,id,anchor)=>{
    const win=BrowserWindow.fromWebContents(event.sender);
    if(win==null||win.isDestroyed()||event.sender!==win.webContents ||
      !isAllowedNavigation(event.sender.getURL()) ||
      !isAllowedMenuId(id))return false;
    const position=sanitizeMenuAnchor(anchor);
    if(position==null)return false;
    const menu=template.find(entry=>entry.id===id);
    if(menu?.submenu==null)return false;
    const width=win.getContentBounds().width,height=win.getContentBounds().height;
    // Only existing native source-defined actions; never arbitrary IPC.
    const x=Math.min(position.x,Math.max(0,width-1));
    const y=Math.min(position.y,Math.max(0,height-1));
    Menu.buildFromTemplate(menu.submenu).popup({window:win,x,y});
    return true;
  });
  ipcMain.handle(HOST_INFO_CHANNEL,()=>({
    windowType:"electron",platform:process.platform,
    theme:nativeTheme.shouldUseDarkColors?"dark":"light",
    /** No Agent backend or proprietary Codex host attached. */
    backendConnected:false,
  }));
}
app.on("window-all-closed",()=>{if(process.platform!=="darwin")app.quit();});
app.on("activate",()=>{if(BrowserWindow.getAllWindows().length===0)createWindow();});
app.whenReady().then(()=>{setupIpc();createWindow();});
app.on("before-quit",()=>{ipcMain.removeHandler(HOST_INFO_CHANNEL);ipcMain.removeHandler(OPEN_MENU_CHANNEL);});
