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
const {app, BrowserWindow, ipcMain, shell, nativeTheme} = require("electron");

const HOST_INFO_CHANNEL = "agent-web:host-info";
const HOST_EVENT_CHANNEL = "agent-web:host-event";
const devUrl=process.env.AGENT_WEB_DEV_URL || "";
const devMode=devUrl.length>0;
const indexPath=path.resolve(__dirname,"../demo-dist/index.html");
let mainWindow=null;

function isAllowedNavigation(url) {
  try {
    if(devMode){
      const target=new URL(url),origin=new URL(devUrl);
      return target.origin===origin.origin && (target.protocol==="http:" || target.protocol==="https:");
    }
    const target=new URL(url);
    return target.protocol==="file:" &&
      decodeURIComponent(target.pathname).replace(/^\\/,"").toLowerCase() ===
        indexPath.replaceAll("\\","/").replace(/^\\/,"").toLowerCase();
  } catch{return false;}
}
function createWindow(){
  const win=new BrowserWindow({
    width:1352,height:760,minWidth:800,minHeight:520,show:false,
    title:"agent-web · Codex 前端恢复",
    backgroundColor:"#171717",
    autoHideMenuBar:true,
    webPreferences:{
      preload:path.join(__dirname,"preload.cjs"),
      contextIsolation:true,nodeIntegration:false,sandbox:true,
      webSecurity:true,allowRunningInsecureContent:false,
    },
  });
  mainWindow=win;
  win.once("ready-to-show",()=>win.show());
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
function setupIpc(){
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
app.on("before-quit",()=>{ipcMain.removeHandler(HOST_INFO_CHANNEL);});
