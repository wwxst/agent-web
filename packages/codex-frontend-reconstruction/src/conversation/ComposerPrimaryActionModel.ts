/**
 * Source-derived main Composer action presentation (YMt in the pinned
 * app-primary-fe8a450b3b04.js). It ports Ti/wi/Ci and the EO button props.
 *
 * Host-owned selectors (cj, p0, Yg, mSe, rate-limit and upload policy) must
 * be resolved by the actual host; this module never guesses those values.
 * It neither sends nor cancels a request.
 */
export type ComposerStreamState = "ready" | "pending" | "streaming" | "other";

export interface ComposerPrimaryActionInput {
  isStopping: boolean;
  isSubmitting: boolean;
  /** Private mSe conversation submission marker. */
  hasSubmissionMarker: boolean;
  isWaitingForFileUploads: boolean;
  canStopWhileSubmitting: boolean;
  isStreaming: boolean;
  streamState: ComposerStreamState;
  /** Host-owned Yg selector. */
  hasHostStopSignal: boolean;
  isSteeringEnabled: boolean;
  canQueueNativeAnswerSubmission: boolean;
  /** Whether the private p0 per-conversation policy object is present. */
  hasUploadPolicy: boolean;
  hasText: boolean;
  hasAttachments: boolean;
  /** Host-computed zn state (rate-limit, read-only, pending action, etc.). */
  hostSendDisabled: boolean;
  submitLoading: boolean;
}

export interface ComposerPrimaryAction {
  kind: "send" | "stop";
  type: "submit" | "button";
  disabled: boolean;
  loading: boolean;
  /** An actionable stop must be routed to the host, never simulated here. */
  shouldFocusEditorBeforeStop: boolean;
}

/** Retains the exact boolean grouping of YMt's Ti, wi, and Ci branches. */
export function resolveComposerPrimaryAction(input: ComposerPrimaryActionInput): ComposerPrimaryAction {
  const isSubmitting = input.isSubmitting || input.hasSubmissionMarker; // An
  const isStreamReady = input.streamState === "ready"; // yi
  const isStreamPending = input.streamState === "pending";
  const isStreamStreaming = input.streamState === "streaming";
  const streamedOrWorking = isStreamStreaming || (input.isStreaming && !isStreamReady); // bi
  const stoppingOrSubmitting = input.isStopping || isSubmitting; // Si
  const sendingLoading =
    input.isWaitingForFileUploads ||
    (isSubmitting && !input.canQueueNativeAnswerSubmission) ||
    (input.submitLoading && (input.hasText || input.hasAttachments)); // Ci
  const stopLoading =
    input.isStopping ||
    (isSubmitting && !input.isWaitingForFileUploads && !input.canStopWhileSubmitting); // wi
  const isStopAction =
    !input.isWaitingForFileUploads &&
    !input.hasUploadPolicy &&
    (
      (isSubmitting && input.canStopWhileSubmitting) ||
      (
        streamedOrWorking &&
        (
          isStreamStreaming ||
          input.hasHostStopSignal ||
          (stoppingOrSubmitting && !input.canQueueNativeAnswerSubmission) ||
          (
            !input.isSteeringEnabled &&
            !input.canQueueNativeAnswerSubmission &&
            !input.hasText &&
            !input.hasAttachments
          )
        )
      )
    ); // Ti
  const disabled = input.isWaitingForFileUploads ||
    (isStopAction ? stopLoading : input.hostSendDisabled || input.hasSubmissionMarker);
  return {
    kind: isStopAction ? "stop" : "send",
    type: isStopAction ? "button" : "submit",
    disabled,
    loading: isStopAction ? stopLoading : sendingLoading,
    shouldFocusEditorBeforeStop: isStopAction,
  };
}
