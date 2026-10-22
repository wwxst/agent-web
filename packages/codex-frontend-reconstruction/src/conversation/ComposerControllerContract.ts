/**
 * Source-confirmed main Codex composer controller boundary.
 *
 * The original controller is built by app-initial's SUu -> rUu/EUu path and
 * exposes a ProseMirror EditorView. This interface is the public reconstruction
 * contract, not a clone of the private controller implementation.
 */
export interface ComposerEditorViewPort {
  readonly dom: HTMLElement;
  isDestroyed: boolean;
}

export interface ComposerPastedTextPayload {
  text: string;
  markdown?: string;
  codeBlockLanguage?: string;
}

export interface ComposerPastedLinkPayload {
  text: string;
  html: string;
}

export interface ComposerControllerPort {
  readonly view: ComposerEditorViewPort;
  initialInputFocused: boolean | undefined;

  getText(): string;
  setText(text: string): void;
  setPlaceholder(placeholder: string | undefined): void;
  setInputActive(active: boolean): void;
  clearInitialInputFocus(): void;
  focus(position?: "end"): void;

  /** The original event emitter passes an optional event timestamp. */
  addSubmitHandler(handler: (timestamp?: number) => void): () => void;
  cancelPendingSubmit(): void;
  setSubmitReady(ready: boolean): void;

  /** Main Composer host subscriptions for the controller's source events. */
  addPastedImagesHandler(handler: (images: readonly File[]) => void): void;
  removePastedImagesHandler(handler: (images: readonly File[]) => void): void;
  addPastedFilesHandler(
    handler: (files: readonly File[], dataTransfer?: DataTransfer | null) => void,
  ): void;
  removePastedFilesHandler(
    handler: (files: readonly File[], dataTransfer?: DataTransfer | null) => void,
  ): void;
  addPastedTextHandler(
    handler: (payload: ComposerPastedTextPayload) => boolean | void,
  ): void;
  removePastedTextHandler(
    handler: (payload: ComposerPastedTextPayload) => boolean | void,
  ): void;
  subscribePastedLink(
    handler: (payload: ComposerPastedLinkPayload) => boolean | void,
  ): () => void;

  destroy(): void;
}
