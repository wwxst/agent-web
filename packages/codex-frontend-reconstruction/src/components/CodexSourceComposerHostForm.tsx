import * as React from "react";
import { shouldBlockComposerOuterTransfer } from "../conversation/ComposerOuterFormModel.js";

export interface CodexSourceComposerHostFormProps {
  children: React.ReactNode;
  className?: string;
  integratedVoiceModeActive: boolean;
  hasUploadPolicy: boolean;
  /** Form submission carries native timestamp and whether a submitter exists. */
  onSubmit: (timestamp: number, hasSubmitter: boolean) => void;
}

/**
 * YMt owns the outer form; the inner CodexComposerLayout is layout-only.
 * pd/hd run in capture phase. gd always prevents browser navigation before
 * forwarding getText/host submit metadata. This component deliberately does
 * not create/accept any upload or issue backend calls.
 */
export function CodexSourceComposerHostForm(props: CodexSourceComposerHostFormProps) {
  const blockTransfer = shouldBlockComposerOuterTransfer({
    integratedVoiceModeActive: props.integratedVoiceModeActive,
    hasUploadPolicy: props.hasUploadPolicy,
  });
  const onCapturedTransfer = (event: React.SyntheticEvent<HTMLFormElement>) => {
    if (!blockTransfer) return;
    event.preventDefault();
    event.stopPropagation();
  };
  return (
    <form
      className={props.className}
      data-codex-source-composer-form=""
      onPasteCapture={onCapturedTransfer}
      onDropCapture={onCapturedTransfer}
      onSubmit={(event) => {
        event.preventDefault();
        const native = event.nativeEvent;
        const hasSubmitter = typeof SubmitEvent !== "undefined" &&
          native instanceof SubmitEvent && native.submitter != null;
        props.onSubmit(event.timeStamp, hasSubmitter);
      }}
    >
      {props.children}
    </form>
  );
}
