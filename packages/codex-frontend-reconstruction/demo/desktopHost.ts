import type {
  SourceMcpApprovalContext,SourceMcpApprovalReply,
} from "../src/conversation/SourceMcpApprovalRequestModel.js";
import type {SourceUserVerificationCancelEnvelope}
  from "../src/conversation/SourceUserVerificationModel.js";
import type {SourceUnsupportedOpenAIFormReply}
  from "../src/conversation/SourceUnsupportedOpenAIFormModel.js";
import type {
 SourceConversationHostEvent,
 SourceConversationHostEventBridge,
 SourceConversationHostEventTransport,
} from "../src/conversation/SourceConversationHostEventBridge.js";

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
      /** Real native external HTTPS open. Never grants or settles an Agent request. */
      openExternalUrl(url:string):Promise<boolean>;
      /** A typed native cancel only. The absence of a verified Agent
       * backend rejects with USER_VERIFICATION_BACKEND_UNAVAILABLE. */
      cancelUserVerification(envelope:SourceUserVerificationCancelEnvelope):Promise<void>;
      /** Only exact source cancel/decline from unsupported form; main rejects
       * without a real Agent backend. */
      replyToUnsupportedForm(envelope:SourceUnsupportedOpenAIFormReply):Promise<void>;
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
