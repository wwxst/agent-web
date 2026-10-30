import * as React from "react";
import { shouldBlockComposerOuterTransfer } from "../conversation/ComposerOuterFormModel.js";

export interface CodexSourceComposerHostFormProps {
  children: React.ReactNode;
  className?: string;
  integratedVoiceModeActive: boolean;
  hasUploadPolicy: boolean;
  /** Source YMt outer drop path; the callback receives browser File objects only. */
  onFilesDropped?:(files:readonly File[],dataTransfer:DataTransfer)=>void;
  /** Form submission carries native timestamp and whether a submitter exists. */
  onSubmit: (timestamp: number, hasSubmitter: boolean) => void;
}

/**
 * YMt owns the outer form. pd/hd block transfers only when integrated voice
 * is active without an upload policy. The source drop path accepts Files and
 * forwards them to the Composer host; this independent preview only stages
 * File references locally and does not upload or read them.
 */
export function CodexSourceComposerHostForm(props: CodexSourceComposerHostFormProps) {
  const blockTransfer = shouldBlockComposerOuterTransfer({
    integratedVoiceModeActive: props.integratedVoiceModeActive,
    hasUploadPolicy: props.hasUploadPolicy,
  });
  const [fileDragActive,setFileDragActive]=React.useState(false);
  const onCapturedTransfer = (event: React.SyntheticEvent<HTMLFormElement>) => {
    if (!blockTransfer) return;
    event.preventDefault();
    event.stopPropagation();
  };
  const transferHasFiles=(transfer:DataTransfer|null)=>{
    if(transfer==null)return false;
    return Array.from(transfer.types).includes("Files")||transfer.files.length>0;
  };
  const onDragEnterCapture=(event:React.DragEvent<HTMLFormElement>)=>{
    if(blockTransfer){onCapturedTransfer(event);return;}
    if(!transferHasFiles(event.dataTransfer))return;
    event.preventDefault();
    setFileDragActive(true);
  };
  const onDragOverCapture=(event:React.DragEvent<HTMLFormElement>)=>{
    if(blockTransfer){onCapturedTransfer(event);return;}
    if(!transferHasFiles(event.dataTransfer))return;
    event.preventDefault();
    event.dataTransfer.dropEffect="copy";
    setFileDragActive(true);
  };
  const onDragLeaveCapture=(event:React.DragEvent<HTMLFormElement>)=>{
    if(blockTransfer||!fileDragActive)return;
    const next=event.relatedTarget;
    if(next instanceof Node&&event.currentTarget.contains(next))return;
    setFileDragActive(false);
  };
  const onDropCapture=(event:React.DragEvent<HTMLFormElement>)=>{
    setFileDragActive(false);
    if(blockTransfer){onCapturedTransfer(event);return;}
    const transfer=event.dataTransfer;
    const files=Array.from(transfer.files);
    if(files.length===0)return;
    event.preventDefault();
    event.stopPropagation();
    props.onFilesDropped?.(files,transfer);
  };
  return (
    <form
      className={props.className}
      data-codex-source-composer-form=""
      data-composer-file-drag-active={fileDragActive?"true":"false"}
      onPasteCapture={onCapturedTransfer}
      onDragEnterCapture={onDragEnterCapture}
      onDragOverCapture={onDragOverCapture}
      onDragLeaveCapture={onDragLeaveCapture}
      onDropCapture={onDropCapture}
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
