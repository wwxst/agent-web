/**
 * Minimal, source-confirmed boundary for the main Codex rich-text composer.
 *
 * The original controller is built by app-initial's SUu -> rUu/EUu path and
 * exposes a ProseMirror EditorView. Keep this port narrow: it is not a clone
 * of the private controller and does not prescribe how the host creates it.
 */
export interface ComposerEditorViewPort {
  readonly dom: HTMLElement;
  isDestroyed: boolean;
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
  destroy(): void;
}
