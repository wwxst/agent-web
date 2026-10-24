"use strict";
/**
 * Safe, read-only renderer interface. Unlike Codex's private electronBridge
 * this shell only exposes a bounded host-event subscription and host status.
 * No generic IPC send/invoke, shell access, Node globals, or command runner.
 */
const {contextBridge,ipcRenderer}=require("electron");
const HOST_INFO_CHANNEL="agent-web:host-info";
const HOST_EVENT_CHANNEL="agent-web:host-event";
const OPEN_MENU_CHANNEL="agent-web:open-menu";
const listeners=new Set();
ipcRenderer.on(HOST_EVENT_CHANNEL,(_event,payload)=>{
  // Never expose Electron's IpcRendererEvent or MessagePort to the page.
  for(const listener of [...listeners])listener(payload);
});
contextBridge.exposeInMainWorld("agentWebDesktopHost",Object.freeze({
  getHostInfo:()=>ipcRenderer.invoke(HOST_INFO_CHANNEL),
  openMenu(id,anchor){
    // Real native menu contents stay owned by the main process; the renderer
    // can request only one of the four fixed top-level source menu sections.
    if(!["file","edit","view","help"].includes(id) ||
      !anchor||!Number.isFinite(anchor.x)||!Number.isFinite(anchor.y))
      return Promise.resolve(false);
    return ipcRenderer.invoke(OPEN_MENU_CHANNEL,id,{
      x:anchor.x,y:anchor.y,
    });
  },
  subscribeHostEvents(callback){
    if(typeof callback!=="function")throw new TypeError("host listener must be a function");
    listeners.add(callback);
    return ()=>{listeners.delete(callback);};
  },
}));
