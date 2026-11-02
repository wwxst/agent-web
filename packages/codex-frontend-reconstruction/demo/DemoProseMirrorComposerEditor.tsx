import * as React from "react";
import { CodexSourceComposerEditorMount } from "../src/components/CodexSourceComposerEditorMount.js";
import { CodexSourceComposerHostEvents } from "../src/components/CodexSourceComposerHostEvents.js";
import { SourcePlainProseMirrorController } from "../src/components/SourcePlainProseMirrorController.js";
import type { ComposerPastedTextPayload, ComposerPastedLinkPayload } from "../src/conversation/ComposerControllerContract.js";

export interface DemoProseMirrorComposerEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (timestamp?: number) => void;
  placeholder?: string;
  ariaLabel?: string;
  onPastedImages?: (files: readonly File[]) => void;
  onPastedFiles?: (files: readonly File[], dataTransfer?: DataTransfer | null) => void;
  onPastedText?: (payload: ComposerPastedTextPayload) => boolean | void;
  onPastedLink?: (payload: ComposerPastedLinkPayload) => boolean | void;
}

/**
 * Real ProseMirror PLAIN-mode editor mounted through the previously recovered
 * Codex controller lifecycle. All submission/reply state remains in App; this
 * demo does not send real Agent requests or claim the original rich plugins.
 */
export function DemoProseMirrorComposerEditor(props: DemoProseMirrorComposerEditorProps) {
  const [controller, setController] = React.useState<SourcePlainProseMirrorController | null>(null);
  const latest = React.useRef({ onChange: props.onChange, onSubmit: props.onSubmit });
  latest.current = { onChange: props.onChange, onSubmit: props.onSubmit };
  React.useLayoutEffect(() => {
    const instance = new SourcePlainProseMirrorController({
      initialText: props.value,
      enterBehavior: "enter",
      enableSourceCodeFenceRule: true,
      enableSelectedTextLinks: true,
      onDocumentChange: (text) => latest.current.onChange(text),
    });
    setController(instance);
    return () => instance.destroy();
  }, []);

  React.useLayoutEffect(() => {
    if (controller != null && !controller.view.isDestroyed &&
        controller.getText() !== props.value) controller.setText(props.value);
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
        ariaLabel={props.ariaLabel ?? "演示消息输入"}
        placeholder={props.placeholder ?? "Work with Codex"}
        layout="multiline"
        submitReady={true}
        disableAutoFocus={true}
        onSubmit={(timestamp) => latest.current.onSubmit(timestamp)}
      />
    </>
  );
}
