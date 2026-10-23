/**
 * YMt outer form's pd/hd event guard. The source blocks captured paste and
 * drop only while integrated voice mode is active and p0 policy is absent.
 * No files are accepted or uploaded here.
 */
export interface ComposerOuterTransferState {
  integratedVoiceModeActive: boolean;
  hasUploadPolicy: boolean;
}

export function shouldBlockComposerOuterTransfer(state: ComposerOuterTransferState): boolean {
  return state.integratedVoiceModeActive && !state.hasUploadPolicy;
}
