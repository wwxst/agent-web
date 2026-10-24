"use strict";
/**
 * Safe, read-only renderer interface. Unlike Codex's private electronBridge
 * this shell only exposes a bounded host-event subscription and host status.
 * No generic IPC send/invoke, shell access, Node globals, or command runner.
 */
const {contextBridge,ipcRenderer}=require("electron");
const HOST_INFO_CHANNEL="agent-web:host-info";
const HOST_EVENT_CHANNEL="agent-web:host-event";
const listeners=new Set();
ipcRenderer.on(HOST_EVENT_CHANNEL,(_event,payload)=>{
  // Never expose Electron's IpcRendererEvent or MessagePort to the page.
  for(const listener of [...listeners])listener(payload);
});
contextBridge.exposeInMainWorld("agentWebDesktopHost",Object.freeze({
  getHostInfo:()=>ipcRenderer.invoke(HOST_INFO_CHANNEL),
  subscribeHostEvents(callback){
    if(typeof callback!=="function")throw new TypeError("host listener must be a function");
    listeners.add(callback);
    return ()=>{listeners.delete(callback);};
  },
}));
