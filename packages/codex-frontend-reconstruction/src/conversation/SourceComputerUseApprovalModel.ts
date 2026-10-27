/**
 * Original compiled source:
 * frontend/webview/assets/computer-use-app-approval-request-card-9bb692b1d9cc.js
 * E: request-scoped Computer Use application approval, distinct from
 * generic MCP tool approval ye. This model cannot grant permissions.
 */
import type {
  SourceMcpApprovalContext,
  SourceMcpApprovalReply,
  SourceMcpApprovalReplyTransport,
} from "./SourceMcpApprovalRequestModel.js";

export type SourceComputerUsePersistenceMode="session"|"always";
export interface SourceComputerUseApprovalRequest extends SourceMcpApprovalContext {
  requestId:string;
  appDisplayName:string;
  connectorName:string;
  subtitle?:string|null;
  riskLevel?:string|null;
  persistModes:readonly SourceComputerUsePersistenceMode[];
  /** Authoritative host preference: true ONLY after approved use. */
  hasPreviouslyApproved:boolean;
  disabled?:boolean;
}
export type SourceComputerUseReplyTransport=SourceMcpApprovalReplyTransport;
export type SourceComputerUseReply=SourceMcpApprovalReply;

export const SOURCE_COMPUTER_USE_FIRST_USE_DISCLOSURE=
  "Computer Use lets ChatGPT use apps on your computer. It may take screenshots of app contents while working. You can choose which apps ChatGPT can access, stop actions at any time, and control whether screenshots are used for training.";

export function sourceComputerUseSubtitle(request:Pick<
  SourceComputerUseApprovalRequest,"hasPreviouslyApproved"|"subtitle"
>):string|null{
  const parts=[
    request.hasPreviouslyApproved?null:SOURCE_COMPUTER_USE_FIRST_USE_DISCLOSURE,
    request.subtitle?.trim()||null,
  ].filter((part):part is string=>part!=null);
  return parts.length>0?parts.join("\n\n"):null;
}

export function sourceComputerUseTitle(
  request:Pick<SourceComputerUseApprovalRequest,"appDisplayName">
):string{
  return `Allow ChatGPT to use ${request.appDisplayName}?`;
}

/** The original E's primary button selects session when supported.
 * Always-allow only exists when policy explicitly lists "always".
 * Decline NEVER carries any persistent approval scope.
 */
export function sourceComputerUseDecision(
  request:Pick<SourceComputerUseApprovalRequest,"persistModes"|"disabled">,
  decision:"accept"|"decline",
  scope:"primary"|"always"="primary",
):SourceComputerUseReply|null{
  if(request.disabled===true)return null;
  if(decision==="decline")return {decision:"decline"};
  if(scope==="always"){
    return request.persistModes.includes("always")
      ?{decision:"accept",persist:"always"}:null;
  }
  return request.persistModes.includes("session")
    ?{decision:"accept",persist:"session"}:{decision:"accept"};
}

/** Original request-key is JSON.stringify([hostId,conversationId,requestId]).
 * Distinct host and conversation requests must not share pending state. */
export function sourceComputerUseRequestKey(
  request:Pick<SourceComputerUseApprovalRequest,"hostId"|"conversationId"|"requestId">
):string{
  return JSON.stringify([request.hostId,request.conversationId,request.requestId]);
}
