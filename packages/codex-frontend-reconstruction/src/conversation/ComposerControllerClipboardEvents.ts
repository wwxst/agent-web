import type {
  ComposerControllerPort,
  ComposerPastedLinkPayload,
  ComposerPastedTextPayload,
} from "./ComposerControllerContract.js";

export interface ComposerControllerClipboardCallbacks {
  onPastedImages?: (images: readonly File[]) => void;
  onPastedFiles?: (
    files: readonly File[],
    dataTransfer?: DataTransfer | null,
  ) => void;
  /** Returning false lets the editor continue its normal paste path. */
  onPastedText?: (payload: ComposerPastedTextPayload) => boolean | void;
  /** Returning false lets the editor continue its normal link-paste path. */
  onPastedLink?: (payload: ComposerPastedLinkPayload) => boolean | void;
}

/**
 * Connects the original controller's paste events to host callbacks.
 * The paired add/remove APIs and the unsubscribe-returning link API mirror EUu.
 */
export function connectComposerControllerClipboardEvents(
  controller: ComposerControllerPort,
  callbacks: ComposerControllerClipboardCallbacks,
): () => void {
  const cleanups: Array<() => void> = [];

  if (callbacks.onPastedImages != null) {
    const handler = (images: readonly File[]) => callbacks.onPastedImages?.(images);
    controller.addPastedImagesHandler(handler);
    cleanups.push(() => controller.removePastedImagesHandler(handler));
  }

  if (callbacks.onPastedFiles != null) {
    const handler = (files: readonly File[], dataTransfer?: DataTransfer | null) =>
      callbacks.onPastedFiles?.(files, dataTransfer);
    controller.addPastedFilesHandler(handler);
    cleanups.push(() => controller.removePastedFilesHandler(handler));
  }

  if (callbacks.onPastedText != null) {
    const handler = (payload: ComposerPastedTextPayload) =>
      callbacks.onPastedText?.(payload);
    controller.addPastedTextHandler(handler);
    cleanups.push(() => controller.removePastedTextHandler(handler));
  }

  if (callbacks.onPastedLink != null) {
    const unsubscribe = controller.subscribePastedLink((payload) =>
      callbacks.onPastedLink?.(payload));
    cleanups.push(unsubscribe);
  }

  let active = true;
  return () => {
    if (!active) return;
    active = false;
    for (const cleanup of cleanups.reverse()) cleanup();
  };
}
