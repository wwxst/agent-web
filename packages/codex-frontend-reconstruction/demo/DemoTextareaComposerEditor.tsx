import * as React from "react";
import { CodexSourceComposerEditorMount } from "../src/components/CodexSourceComposerEditorMount.js";
import type {
  ComposerControllerPort,
  ComposerEditorViewPort,
} from "../src/conversation/ComposerControllerContract.js";
import { resolveComposerEditorKeyAction } from "../src/conversation/ComposerEditorBehaviorModel.js";
import { CodexSourceComposerHostEvents } from "../src/components/CodexSourceComposerHostEvents.js";
import type {
  ComposerPastedLinkPayload,
  ComposerPastedTextPayload,
} from "../src/conversation/ComposerControllerContract.js";

class DemoTextareaComposerController implements ComposerControllerPort {
  readonly view: ComposerEditorViewPort;
  initialInputFocused: boolean | undefined = false;
  private inputActive = false;
  private submitReady = false;
  private submitHandlers = new Set<(timestamp?: number) => void>();
  private pastedImagesHandlers = new Set<(images: readonly File[]) => void>();
  private pastedFilesHandlers = new Set<(files: readonly File[], dataTransfer?: DataTransfer | null) => void>();
  private pastedTextHandlers = new Set<(payload: ComposerPastedTextPayload) => boolean | void>();
  private pastedLinkHandlers = new Set<(payload: ComposerPastedLinkPayload) => boolean | void>();

  constructor(private readonly element: HTMLTextAreaElement) {
    this.view = { dom: element, isDestroyed: false };
  }

  getText(): string {
    return this.element.value;
  }

  setText(text: string): void {
    if (this.element.value !== text) this.element.value = text;
  }

  setPlaceholder(placeholder: string | undefined): void {
    if (placeholder == null) this.element.removeAttribute("placeholder");
    else this.element.setAttribute("placeholder", placeholder);
  }

  setInputActive(active: boolean): void {
    this.inputActive = active;
  }

  clearInitialInputFocus(): void {
    this.initialInputFocused = undefined;
  }

  focus(position?: "end"): void {
    if (position === "end") {
      const end = this.element.value.length;
      this.element.setSelectionRange(end, end);
    }
    this.element.focus();
  }

  addSubmitHandler(handler: (timestamp?: number) => void): () => void {
    this.submitHandlers.add(handler);
    return () => {
      this.submitHandlers.delete(handler);
      this.submitReady = false;
      this.cancelPendingSubmit();
    };
  }

  cancelPendingSubmit(): void {
    // This demo controller has no queued submission; the production controller does.
  }

  setSubmitReady(ready: boolean): void {
    this.submitReady = ready;
  }

  addPastedImagesHandler(handler: (images: readonly File[]) => void): void {
    this.pastedImagesHandlers.add(handler);
  }

  removePastedImagesHandler(handler: (images: readonly File[]) => void): void {
    this.pastedImagesHandlers.delete(handler);
  }

  addPastedFilesHandler(handler: (files: readonly File[], dataTransfer?: DataTransfer | null) => void): void {
    this.pastedFilesHandlers.add(handler);
  }

  removePastedFilesHandler(handler: (files: readonly File[], dataTransfer?: DataTransfer | null) => void): void {
    this.pastedFilesHandlers.delete(handler);
  }

  addPastedTextHandler(handler: (payload: ComposerPastedTextPayload) => boolean | void): void {
    this.pastedTextHandlers.add(handler);
  }

  removePastedTextHandler(handler: (payload: ComposerPastedTextPayload) => boolean | void): void {
    this.pastedTextHandlers.delete(handler);
  }

  subscribePastedLink(handler: (payload: ComposerPastedLinkPayload) => boolean | void): () => void {
    this.pastedLinkHandlers.add(handler);
    return () => this.pastedLinkHandlers.delete(handler);
  }

  requestSubmit(timestamp?: number): void {
    if (!this.submitReady || this.view.isDestroyed) return;
    for (const handler of this.submitHandlers) handler(timestamp);
  }

  destroy(): void {
    this.cancelPendingSubmit();
    this.inputActive = false;
    this.view.isDestroyed = true;
    this.submitHandlers.clear();
    this.pastedImagesHandlers.clear();
    this.pastedFilesHandlers.clear();
    this.pastedTextHandlers.clear();
    this.pastedLinkHandlers.clear();
  }
}

export interface DemoTextareaComposerEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (timestamp?: number) => void;
  onPastedImages?: (images: readonly File[]) => void;
  onPastedFiles?: (files: readonly File[], dataTransfer?: DataTransfer | null) => void;
  onPastedText?: (payload: ComposerPastedTextPayload) => boolean | void;
  onPastedLink?: (payload: ComposerPastedLinkPayload) => boolean | void;
}

/**
 * Explicit demo-only textarea adapter. It exercises the recovered controller
 * mount/submit boundary but is not the original ProseMirror editor.
 */
export function DemoTextareaComposerEditor(props: DemoTextareaComposerEditorProps) {
  const [controller, setController] = React.useState<DemoTextareaComposerController | null>(null);
  const latest = React.useRef({ onChange: props.onChange, onSubmit: props.onSubmit });
  latest.current = { onChange: props.onChange, onSubmit: props.onSubmit };
  const composing = React.useRef(false);

  React.useLayoutEffect(() => {
    const element = document.createElement("textarea");
    element.rows = 2;
    element.dataset.testid = "composer";
    element.dataset.composing = "false";
    const instance = new DemoTextareaComposerController(element);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter") return;
      const key = event.shiftKey
        ? "Shift-Enter"
        : event.altKey
          ? "Alt-Enter"
          : event.ctrlKey || event.metaKey
            ? "Mod-Enter"
            : "Enter";
      const action = resolveComposerEditorKeyAction({
        key,
        isComposing: event.isComposing || composing.current,
        keyCode: event.keyCode,
        // This textarea is an explicitly demo-only editor. The host has not
        // supplied mention/list/code-block state or a shortcut override.
        enterBehavior: "enter",
        suggestionActive: false,
        isNonWindowsCoarsePointer: false,
        documentRequiresMultilineEnter: false,
        isCodeBlock: false,
        modEnterHandledByEditor: false,
      });
      if (action === "composition-deferred") {
        // Native textarea adaptation: don't insert/submit while an IME is
        // composing. The original ProseMirror keymap returns false here.
        event.preventDefault();
        return;
      }
      if (action !== "submit") return;
      event.preventDefault();
      instance.requestSubmit(event.timeStamp);
    };
    element.addEventListener("keydown", onKeyDown);
    instance.setText(props.value);
    setController(instance);
    return () => {
      element.removeEventListener("keydown", onKeyDown);
      instance.destroy();
    };
  }, []);

  React.useLayoutEffect(() => {
    controller?.setText(props.value);
  }, [controller, props.value]);

  return (
    <>
    <CodexSourceComposerHostEvents
      controller={controller}
      onPastedImages={props.onPastedImages}
      onPastedFiles={props.onPastedFiles}
      onPastedText={props.onPastedText}
      onPastedLink={props.onPastedLink}
    />
    <CodexSourceComposerEditorMount
      controller={controller}
      ariaLabel="演示消息输入"
      placeholder="Work with Codex"
      layout="multiline"
      submitReady={true}
      disableAutoFocus={true}
      onUserInput={() => {
        if (controller != null) latest.current.onChange(controller.getText());
      }}
      onCompositionStateChange={(active) => {
        composing.current = active;
      }}
      onSubmit={(timestamp) => latest.current.onSubmit(timestamp)}
    />
    </>
  );
}
