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
const USER_VERIFICATION_CANCEL_CHANNEL="agent-web:user-verification-cancel";
const UNSUPPORTED_FORM_REPLY_CHANNEL="agent-web:unsupported-form-reply";
const TEXT_FORM_REPLY_CHANNEL="agent-web:text-form-reply";
const OPEN_EXTERNAL_URL_CHANNEL="agent-web:open-external-url";
const SELECT_WORKSPACE_CHANNEL="agent-web:select-workspace-directory";
const READ_WORKSPACE_TEXT_CHANNEL="agent-web:read-workspace-text";
const LIST_WORKSPACE_DIRECTORY_CHANNEL="agent-web:list-workspace-directory";
const READ_WORKSPACE_TREE_TEXT_CHANNEL="agent-web:read-workspace-tree-text";
const SEARCH_WORKSPACE_FILES_CHANNEL="agent-web:search-workspace-files";
const REVOKE_WORKSPACE_CHANNEL="agent-web:revoke-workspace-directory";
const COPY_WORKSPACE_PATH_CHANNEL="agent-web:copy-workspace-file-path";
const COPY_WORKSPACE_CONTENTS_CHANNEL="agent-web:copy-workspace-file-contents";
const GET_WORKSPACE_LANGUAGE_CAPABILITIES_CHANNEL="agent-web:workspace-language-capabilities";
const GET_WORKSPACE_LANGUAGE_LOCATIONS_CHANNEL="agent-web:workspace-language-locations";
const sourceLanguageKinds=new Set([
  "definition","typeDefinition","implementation","references",
]);
const sourceLanguageIds=new Set([
  "typescript","typescriptreact","javascript","javascriptreact",
]);
function validAbsoluteWorkspacePath(value){
  return typeof value==="string"&&value.length>0&&value.length<=4096&&
    !/[\u0000-\u001f\u007f]/u.test(value)&&
    (value.startsWith("/")||/^[A-Za-z]:[\\\\/]/u.test(value)||value.startsWith("\\\\"));
}
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
  /**
   * Open a single HTTPS URL through authenticated main frame -> native shell.
   * No navigation, generic shell/IPC exposure, permission or response sent.
   */
  /** Original biometric cancel is NOT a generic MCP deny response. */
  /** Source bn uses q2t("cancel"|"decline") with null content, not
   * generic MCP approval. Never expose raw invoke or accept. */
  /** Scoped string-only form transport, never a generic IPC send.
   * A real Agent backend must revalidate the authoritative field schema. */
  replyToTextForm(envelope){
    const id=v=>typeof v==="string"&&v.length>0&&v.length<=256&&
      v.trim()===v&&!/[\u0000-\u001f\u007f]/.test(v);
    const object=v=>v!=null&&typeof v==="object"&&!Array.isArray(v);
    const validContent=object(envelope?.content)&&
      Object.keys(envelope.content).length<=12&&
      Object.entries(envelope.content).every(([name,value])=>
        id(name)&&!["__proto__","constructor","prototype"].includes(name)&&
        typeof value==="string"&&value.length<=16384&&
        !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value));
    if(!object(envelope)||Object.keys(envelope).length!==5||
      !["hostId","conversationId","requestId","action","content"]
        .every(k=>Object.hasOwn(envelope,k))||
      ![envelope.hostId,envelope.conversationId,envelope.requestId].every(id)||
      !["accept","decline","cancel"].includes(envelope.action)||
      (envelope.action==="accept"?!validContent:envelope.content!==null)||
      JSON.stringify(envelope).length>32768)
      return Promise.reject(new TypeError("TEXT_FORM_INVALID_REPLY"));
    return ipcRenderer.invoke(TEXT_FORM_REPLY_CHANNEL,{
      hostId:envelope.hostId,conversationId:envelope.conversationId,
      requestId:envelope.requestId,action:envelope.action,
      content:envelope.action==="accept"?envelope.content:null,
    });
  },
  replyToUnsupportedForm(envelope){
    if(envelope==null||typeof envelope!=="object"||Array.isArray(envelope)||
      Object.keys(envelope).length!==4||
      !["hostId","conversationId","requestId","action"].every(k=>Object.hasOwn(envelope,k))||
      !["hostId","conversationId","requestId"].every(k=>
        typeof envelope[k]==="string"&&envelope[k].trim()===envelope[k]&&
        envelope[k].length>0&&envelope[k].length<=256&&
        !/[\u0000-\u001f\u007f]/.test(envelope[k]))||
      !["cancel","decline"].includes(envelope.action))
      return Promise.reject(new TypeError("UNSUPPORTED_FORM_INVALID_REPLY"));
    return ipcRenderer.invoke(UNSUPPORTED_FORM_REPLY_CHANNEL,{
      hostId:envelope.hostId,conversationId:envelope.conversationId,
      requestId:envelope.requestId,action:envelope.action,
    });
  },
  cancelUserVerification(envelope){
    if(envelope==null||typeof envelope!=="object"||Array.isArray(envelope)||
      Object.keys(envelope).length!==4||
      !["hostId","conversationId","requestId","reason"].every(key=>
        Object.hasOwn(envelope,key))||
      !["hostId","conversationId","requestId"].every(key=>
        typeof envelope[key]==="string"&&envelope[key].length>0&&
        envelope[key].length<=256&&envelope[key].trim()===envelope[key]&&
        !/[\u0000-\u001f\u007f]/.test(envelope[key]))||
      envelope.reason!=="userCancelled")
      return Promise.reject(new TypeError("USER_VERIFICATION_INVALID_CANCEL"));
    return ipcRenderer.invoke(USER_VERIFICATION_CANCEL_CHANNEL,{
      hostId:envelope.hostId,conversationId:envelope.conversationId,
      requestId:envelope.requestId,reason:envelope.reason,
    });
  },
  openExternalUrl(url){
    if(typeof url!=="string"||url.length>2048||
      /[\u0000-\u001f\u007f]/u.test(url)){
      return Promise.reject(new TypeError("EXTERNAL_URL_INVALID"));
    }
    let parsed;
    try{parsed=new URL(url);}catch{
      return Promise.reject(new TypeError("EXTERNAL_URL_INVALID"));
    }
    if(parsed.protocol!=="https:"||!parsed.hostname||parsed.username||parsed.password){
      return Promise.reject(new TypeError("EXTERNAL_URL_INVALID"));
    }
    return ipcRenderer.invoke(OPEN_EXTERNAL_URL_CHANNEL,url);
  },
  // Qe's original host owns workspace identity. This independent host only
  // allows a user-approved native folder grant and a read-only UTF-8 preview.
  // A renderer cannot pass its own root or issue a generic filesystem action.
  selectWorkspaceDirectory:()=>ipcRenderer.invoke(SELECT_WORKSPACE_CHANNEL),
  revokeWorkspaceDirectory:()=>ipcRenderer.invoke(REVOKE_WORKSPACE_CHANNEL),
  readWorkspaceTextFile(request){
    if(request==null||typeof request!=="object"||Array.isArray(request)||
       Object.keys(request).some(k=>!["path","line","endLine"].includes(k))||
       typeof request.path!=="string"||request.path.length<1||
       request.path.length>4096||/[\u0000-\u001f\u007f]/u.test(request.path)||
       (request.line!==undefined&&(!Number.isSafeInteger(request.line)||
         request.line<1||request.line>10000000))||
       (request.endLine!==undefined&&(!Number.isSafeInteger(request.endLine)||
         request.line===undefined||request.endLine<request.line||
         request.endLine>10000000)))
      return Promise.reject(new TypeError("WORKSPACE_INVALID_FILE_REQUEST"));
    return ipcRenderer.invoke(READ_WORKSPACE_TEXT_CHANNEL,{
      path:request.path,
      ...(request.line===undefined?{}:{line:request.line}),
      ...(request.endLine===undefined?{}:{endLine:request.endLine}),
    });
  },
  getWorkspaceLanguageCapabilities(request){
    if(request==null||typeof request!=="object"||Array.isArray(request)||
      Object.keys(request).length!==2||
      !Object.hasOwn(request,"path")||!Object.hasOwn(request,"languageId")||
      !validAbsoluteWorkspacePath(request.path)||
      !sourceLanguageIds.has(request.languageId))
      return Promise.reject(new TypeError("WORKSPACE_INVALID_LANGUAGE_REQUEST"));
    return ipcRenderer.invoke(GET_WORKSPACE_LANGUAGE_CAPABILITIES_CHANNEL,{
      path:request.path,languageId:request.languageId,
    });
  },
  getWorkspaceLanguageLocations(request){
    const position=request?.position;
    if(request==null||typeof request!=="object"||Array.isArray(request)||
      Object.keys(request).length!==4||
      !Object.hasOwn(request,"path")||!Object.hasOwn(request,"languageId")||
      !Object.hasOwn(request,"kind")||!Object.hasOwn(request,"position")||
      !validAbsoluteWorkspacePath(request.path)||
      !sourceLanguageIds.has(request.languageId)||
      !sourceLanguageKinds.has(request.kind)||
      position==null||typeof position!=="object"||Array.isArray(position)||
      Object.keys(position).length!==2||
      !Object.hasOwn(position,"line")||!Object.hasOwn(position,"character")||
      !Number.isSafeInteger(position.line)||position.line<0||position.line>9999999||
      !Number.isSafeInteger(position.character)||position.character<0||
      position.character>9999999)
      return Promise.reject(new TypeError("WORKSPACE_INVALID_LANGUAGE_REQUEST"));
    return ipcRenderer.invoke(GET_WORKSPACE_LANGUAGE_LOCATIONS_CHANNEL,{
      path:request.path,languageId:request.languageId,kind:request.kind,
      position:{line:position.line,character:position.character},
    });
  },
  // Local workspace tree: strict grant-relative paths, not a root URL or
  // a generic fs primitive. Main independently validates all requests.
  listWorkspaceDirectory(request){
    const relativePath=request?.relativePath;
    if(request==null||typeof request!=="object"||Array.isArray(request)||
      Object.keys(request).length!==1||
      typeof relativePath!=="string"||relativePath.length>1024||
      /[\\:\u0000-\u001f\u007f]/u.test(relativePath)||
      relativePath.startsWith("/")||relativePath.endsWith("/")||
      relativePath.split("/").some(part=>part==="."||part===".."||
        /[. ]$/.test(part)))
      return Promise.reject(new TypeError("WORKSPACE_INVALID_DIRECTORY_REQUEST"));
    return ipcRenderer.invoke(LIST_WORKSPACE_DIRECTORY_CHANNEL,{relativePath});
  },
  readWorkspaceTreeTextFile(request){
    const relativePath=request?.relativePath;
    if(request==null||typeof request!=="object"||Array.isArray(request)||
      Object.keys(request).some(key=>!["relativePath","line","endLine"].includes(key))||
      typeof relativePath!=="string"||relativePath.length<1||
      relativePath.length>1024||/[\\:\u0000-\u001f\u007f]/u.test(relativePath)||
      relativePath.startsWith("/")||relativePath.endsWith("/")||
      relativePath.split("/").some(part=>part===""||part==="."||part===".."||
        /[. ]$/.test(part))||
      (request.line!==undefined&&(!Number.isSafeInteger(request.line)||
        request.line<1||request.line>10000000))||
      (request.endLine!==undefined&&(!Number.isSafeInteger(request.endLine)||
        request.line===undefined||request.endLine<request.line||
        request.endLine>10000000)))
      return Promise.reject(new TypeError("WORKSPACE_INVALID_FILE_REQUEST"));
    return ipcRenderer.invoke(READ_WORKSPACE_TREE_TEXT_CHANNEL,{
      relativePath,
      ...(request.line===undefined?{}:{line:request.line}),
      ...(request.endLine===undefined?{}:{endLine:request.endLine}),
    });
  },
  /** Original Ve searches the authenticated host. Our independent fallback
   * allows a bounded, filename-only query under the existing native grant. */
  searchWorkspaceFiles(request){
    const query=request?.query;
    if(request==null||typeof request!=="object"||Array.isArray(request)||
      Object.keys(request).length!==1||
      typeof query!=="string"||query.trim()!==query||
      query.length<2||query.length>80||
      /[\u0000-\u001f\u007f]/u.test(query))
      return Promise.reject(new TypeError("WORKSPACE_INVALID_SEARCH_REQUEST"));
    return ipcRenderer.invoke(SEARCH_WORKSPACE_FILES_CHANNEL,{query});
  },
  // Source SXo copy-path does not read the file. Main still validates the
  // absolute typed path and trusted main-frame sender.
  copyWorkspaceFilePath(path){
    if(typeof path!=="string"||path.length<1||path.length>4096||
       /[\u0000-\u001f\u007f]/u.test(path))
      return Promise.reject(new TypeError("WORKSPACE_INVALID_FILE_REQUEST"));
    return ipcRenderer.invoke(COPY_WORKSPACE_PATH_CHANNEL,path);
  },
  // Source _Xo copies contents. No generic arbitrary clipboard API:
  // main applies the same grant/realpath/text restrictions as file preview.
  copyWorkspaceFileContents(request){
    if(request==null||typeof request!=="object"||Array.isArray(request)||
       Object.keys(request).some(k=>!["path","line","endLine"].includes(k))||
       typeof request.path!=="string"||request.path.length<1||
       request.path.length>4096||/[\u0000-\u001f\u007f]/u.test(request.path)||
       (request.line!==undefined&&(!Number.isSafeInteger(request.line)||
         request.line<1||request.line>10000000))||
       (request.endLine!==undefined&&(!Number.isSafeInteger(request.endLine)||
         request.line===undefined||request.endLine<request.line||
         request.endLine>10000000)))
      return Promise.reject(new TypeError("WORKSPACE_INVALID_FILE_REQUEST"));
    return ipcRenderer.invoke(COPY_WORKSPACE_CONTENTS_CHANNEL,{
      path:request.path,
      ...(request.line===undefined?{}:{line:request.line}),
      ...(request.endLine===undefined?{}:{endLine:request.endLine}),
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
