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
const UI_COMMAND_CHANNEL="agent-web:ui-command";
const READ_DRAFTS_CHANNEL="agent-web:composer-drafts-read";
const WRITE_DRAFT_CHANNEL="agent-web:composer-draft-write";
const MCP_APPROVAL_REPLY_CHANNEL="agent-web:mcp-approval-reply";
const draftThreadIds=new Set(["frontend","review"]);
const allowedUiCommands=new Set([
  "toggle-sidebar","previous-thread","next-thread",
  "find-in-thread","find-next-in-thread","find-previous-in-thread",
]);
const uiListeners=new Set();
ipcRenderer.on(UI_COMMAND_CHANNEL,(_event,value)=>{
  // Never expose IpcRendererEvent or permit the main process to inject an
  // arbitrary command identifier into our demo UI action dispatcher.
  if(value==null||!allowedUiCommands.has(value.type))return;
  for(const callback of [...uiListeners])callback(value.type);
});
const listeners=new Set();
ipcRenderer.on(HOST_EVENT_CHANNEL,(_event,payload)=>{
  // Never expose Electron's IpcRendererEvent or MessagePort to the page.
  for(const listener of [...listeners])listener(payload);
});
contextBridge.exposeInMainWorld("agentWebDesktopHost",Object.freeze({
  getHostInfo:()=>ipcRenderer.invoke(HOST_INFO_CHANNEL),
  /**
   * Only this fixed request-scoped MCP reply crosses context isolation.
   * This check is defense in depth; main must revalidate all fields and
   * reject when no authenticated Agent backend is connected.
   */
  replyToMcpApproval(envelope){
    if(envelope==null||typeof envelope!=="object"||
      !["hostId","conversationId","requestId"].every(key=>
        typeof envelope[key]==="string"&&envelope[key].length>0&&envelope[key].length<=256)||
      envelope.response==null||typeof envelope.response!=="object"||
      Object.keys(envelope).some(key=>!["hostId","conversationId","requestId","response"].includes(key))||
      Object.keys(envelope.response).some(key=>!["decision","persist"].includes(key))||
      !["accept","decline"].includes(envelope.response.decision)||
      (envelope.response.persist!==undefined&&
        (envelope.response.decision!=="accept"||
          !["session","always"].includes(envelope.response.persist))))
      return Promise.reject(new TypeError("MCP_INVALID_REPLY"));
    return ipcRenderer.invoke(MCP_APPROVAL_REPLY_CHANNEL,{
      hostId:envelope.hostId,conversationId:envelope.conversationId,
      requestId:envelope.requestId,
      response:{
        decision:envelope.response.decision,
        ...(envelope.response.persist===undefined?{}:{persist:envelope.response.persist}),
      },
    });
  },
  getComposerDrafts:()=>ipcRenderer.invoke(READ_DRAFTS_CHANNEL),
  setComposerDraft(threadId,text){
    if(!draftThreadIds.has(threadId)||typeof text!=="string"||text.length>65536){
      return Promise.resolve(false);
    }
    return ipcRenderer.invoke(WRITE_DRAFT_CHANNEL,threadId,text);
  },
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
  subscribeUiCommands(callback){
    if(typeof callback!=="function")throw new TypeError("UI command listener must be a function");
    uiListeners.add(callback);
    return ()=>uiListeners.delete(callback);
  },
  subscribeHostEvents(callback){
    if(typeof callback!=="function")throw new TypeError("host listener must be a function");
    listeners.add(callback);
    return ()=>{listeners.delete(callback);};
  },
}));
