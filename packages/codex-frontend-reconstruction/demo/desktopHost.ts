import type {
  SourceMcpApprovalContext,SourceMcpApprovalReply,
} from "../src/conversation/SourceMcpApprovalRequestModel.js";
import type {SourceUserVerificationCancelEnvelope}
  from "../src/conversation/SourceUserVerificationModel.js";
import type {SourceUnsupportedOpenAIFormReply}
  from "../src/conversation/SourceUnsupportedOpenAIFormModel.js";
import type {SourceTextFormReply}
  from "../src/conversation/SourceTextFormElicitationModel.js";
import type {
 SourceConversationHostEvent,
 SourceConversationHostEventBridge,
 SourceConversationHostEventTransport,
} from "../src/conversation/SourceConversationHostEventBridge.js";
import type {
  SourceLanguageCapabilities,
  SourceLanguageLocation,
  SourceLanguageLocationKind,
  SourceLanguagePosition,
} from "../src/conversation/SourceLanguageNavigationModel.js";

/**
 * The original private preload exposes electronBridge (documented in
 * reports/ELECTRON_DESKTOP_HOST_STARTUP.md). This is OUR own intentionally
 * narrower independently-run Electron preload protocol.
 */
declare global {
  interface Window {
    agentWebDesktopHost?: {
      subscribeUiCommands(listener:(command:"toggle-sidebar"|"previous-thread"|"next-thread"|"find-in-thread"|"find-next-in-thread"|"find-previous-in-thread")=>void):()=>void;
      openMenu(id:"file"|"edit"|"view"|"help",anchor:{x:number;y:number}):Promise<boolean>;
      /** User consent grants a single native folder, scoped to this renderer.
       * Path never comes from React; native folder picker owns the grant. */
      selectWorkspaceDirectory():Promise<{selected:boolean;name?:string}>;
      revokeWorkspaceDirectory():Promise<boolean>;
      /** Source SXo copy-path via narrow trusted main-process clipboard. */
      copyWorkspaceFilePath(path:string):Promise<boolean>;
      /** Source _Xo: same user-granted read policy as readWorkspaceTextFile,
       * but direct native clipboard write (no arbitrary clipboard IPC). */
      copyWorkspaceFileContents(request:{path:string;line?:number;endLine?:number}):Promise<boolean>;
      readWorkspaceTextFile(request:{path:string;line?:number;endLine?:number}):Promise<{
        name:string;relativePath:string;text:string;line?:number;endLine?:number;readOnly:true;
      }>;
      /**
       * Optional native language-service contract. The host must resolve the
       * provider and derive its workspace root from the existing native grant;
       * renderer-supplied paths never expand that grant. Missing methods mean
       * navigation is unavailable, not that synthetic locations should be used.
       */
      getWorkspaceLanguageCapabilities?(request:{
        relativePath:string;languageId:string;
      }):Promise<SourceLanguageCapabilities|null>;
      getWorkspaceLanguageLocations?(request:{
        relativePath:string;languageId:string;kind:SourceLanguageLocationKind;
        position:SourceLanguagePosition;
      }):Promise<readonly SourceLanguageLocation[]>;
      /** Native grant-relative, single-directory bounded listing. No filesystem
       * root or arbitrary renderer paths are exposed. */
      listWorkspaceDirectory?(request:{relativePath:string}):Promise<{
        relativePath:string;
        entries:readonly {name:string;relativePath:string;kind:"directory"|"file"}[];
        truncated:boolean;
      }>;
      readWorkspaceTreeTextFile?(request:{
        relativePath:string;line?:number;endLine?:number;
      }):Promise<{
        name:string;relativePath:string;text:string;line?:number;endLine?:number;readOnly:true;
      }>;
      /** Independent bounded filename-only fallback for original Ve search;
       * requires the same native folder grant, never returns file contents. */
      searchWorkspaceFiles?(request:{query:string}):Promise<{
        query:string;
        files:readonly {name:string;relativePath:string}[];
        scannedDirectories:number;
        truncated:boolean;
      }>;
      /** Real native external HTTPS open. Never grants or settles an Agent request. */
      openExternalUrl(url:string):Promise<boolean>;
      /** A typed native cancel only. The absence of a verified Agent
       * backend rejects with USER_VERIFICATION_BACKEND_UNAVAILABLE. */
      cancelUserVerification(envelope:SourceUserVerificationCancelEnvelope):Promise<void>;
      /** Only exact source cancel/decline from unsupported form; main rejects
       * without a real Agent backend. */
      replyToUnsupportedForm(envelope:SourceUnsupportedOpenAIFormReply):Promise<void>;
      /** Source ei text-only form envelope, no backend => explicit rejection. */
      replyToTextForm(envelope:SourceTextFormReply):Promise<void>;
      getHostInfo():Promise<{
        windowType:"electron";platform:string;theme:string;backendConnected:false
      }>;
      /** Independent draft persistence; IDs are local demo threads only. */
      getComposerDrafts():Promise<Partial<Record<"frontend"|"review",string>>>;
      setComposerDraft(threadId:"frontend"|"review",text:string):Promise<boolean>;
      subscribeHostEvents(listener:(event:SourceConversationHostEvent)=>void):()=>void;
      /** Bounded Electron IPC. Main rejects without a verified Agent reply backend. */
      replyToMcpApproval(envelope:SourceMcpApprovalContext & {
        requestId:string;response:SourceMcpApprovalReply;
      }):Promise<void>;
    };
  }
}

/**
 * In a normal web browser the demo retains its existing fixture publisher.
 * Electron events flow to the SAME Y/qn/Qr/Au/Vd stores and mounted UI.
 */
export function connectDesktopHostEventBridge(bridge:SourceConversationHostEventBridge):boolean {
  const host=window.agentWebDesktopHost;
  if(host==null)return false;
  const transport:SourceConversationHostEventTransport={
    subscribe(listener){return host.subscribeHostEvents(listener);},
  };
  bridge.connect(transport);
  return true;
}
