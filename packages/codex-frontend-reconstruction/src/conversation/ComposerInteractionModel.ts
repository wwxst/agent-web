/**
 * Source-grounded submission gates for the main conversation Composer.
 *
 * Recovered from app-primary-fe8a450b3b04.js (YMt): the editor is only marked
 * submit-ready when the controller is ready and the input is enabled and not
 * in dictation mode. The host submit path then guards active voice sessions,
 * disabled conversations, pending actions, and work-home policy acceptance.
 *
 * This model intentionally does not recreate the private ProseMirror editor or
 * the host's complete readiness calculation; those remain injected state.
 */
export type ComposerVoiceSessionStatus = "idle" | "starting" | "active" | "stopping";

export interface ComposerSubmitGateState {
  /** Host/controller readiness (the source-side xi predicate). */
  controllerReady: boolean;
  /** Source-side disabled state passed into the editor and submission path. */
  inputDisabled: boolean;
  /** Integrated dictation/voice editor mode. */
  isDictating: boolean;
  /** Whether voice input can currently accept a send action. */
  voiceInputEnabled: boolean;
  /** Source-side block for voice send (vn). */
  submissionBlocked: boolean;
  /** Voice runtime status; normal submission requires idle. */
  voiceSessionStatus: ComposerVoiceSessionStatus;
  /** The conversation host says this conversation cannot accept a send. */
  conversationDisabled: boolean;
  /** Number of host actions pending for the current conversation. */
  pendingActionCount: number;
  /** Work-home submission requires explicit policy acceptance. */
  requiresWorkHomePolicyAcceptance: boolean;
  hasWorkHomePolicyAcceptance: boolean;
}

export type ComposerSubmitBlockReason =
  | "controller-not-ready"
  | "input-disabled"
  | "voice-send-unavailable"
  | "voice-session-active"
  | "conversation-disabled"
  | "pending-action"
  | "work-home-policy-acceptance-required";

export type ComposerSubmitDecision =
  | { kind: "submit" }
  | { kind: "voice-send" }
  | { kind: "blocked"; reason: ComposerSubmitBlockReason };

/** Mirrors the ready value passed to XWu's editor prop: xi && !nr && !Ka. */
export function isComposerEditorSubmitReady(
  state: Pick<ComposerSubmitGateState, "controllerReady" | "inputDisabled" | "isDictating">,
): boolean {
  return state.controllerReady && !state.inputDisabled && !state.isDictating;
}

/**
 * Resolves only the source-confirmed outer submit gates. Additional private
 * host policy and submission transaction checks remain the host's responsibility.
 */
export function resolveComposerSubmitDecision(
  state: ComposerSubmitGateState,
): ComposerSubmitDecision {
  // YMt routes dictation sends before the normal editor-submit readiness gate.
  if (state.isDictating) {
    return state.voiceInputEnabled && !state.submissionBlocked
      ? { kind: "voice-send" }
      : { kind: "blocked", reason: "voice-send-unavailable" };
  }

  if (!isComposerEditorSubmitReady(state)) {
    return {
      kind: "blocked",
      reason: state.inputDisabled ? "input-disabled" : "controller-not-ready",
    };
  }
  if (state.voiceSessionStatus !== "idle") {
    return { kind: "blocked", reason: "voice-session-active" };
  }
  if (state.conversationDisabled) {
    return { kind: "blocked", reason: "conversation-disabled" };
  }
  if (state.pendingActionCount > 0) {
    return { kind: "blocked", reason: "pending-action" };
  }
  if (state.requiresWorkHomePolicyAcceptance && !state.hasWorkHomePolicyAcceptance) {
    return { kind: "blocked", reason: "work-home-policy-acceptance-required" };
  }
  return { kind: "submit" };
}
