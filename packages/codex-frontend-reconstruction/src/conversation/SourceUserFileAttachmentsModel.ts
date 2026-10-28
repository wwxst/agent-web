/**
 * Original user-message-attachments-93893a2e6026.js:
 *   hn({attachment,cwd,hostId,isUploadedFileViewerEnabled}), yn(attachment).
 *
 * Original `hn` differentiates an `upload` member from a workspace
 * path/shared thread. The host alone may authorize file opening.
 */
export interface SourceUserUploadedFile {
  upload:{fileName:string};
  /** Original `at` renders a host-owned rich preview, never inferred from filename. */
  /** Source Wmd uses preview.length: this is pasted text, not an image. */
  preview?:string|null;
}
export interface SourceUserWorkspaceFile {
  path?:string|null;
  fsPath?:string|null;
  label?:string|null;
  startLine?:number|null;
  endLine?:number|null;
  isPastedText?:boolean;
  sharedThread?:{shareId:string}|null;
}
export type SourceUserFileAttachment =
  SourceUserUploadedFile|SourceUserWorkspaceFile;

export type SourceUserFileOpenTarget =
  |{kind:"uploaded";name:string}
  |{kind:"workspace";path:string;line?:number|undefined;column?:number|undefined}
  |{kind:"shared-thread";shareId:string}
  |{kind:"none"};

export function isSourceUserUploadedFile(
  value:SourceUserFileAttachment,
):value is SourceUserUploadedFile{
  return "upload" in value;
}
/** Source `yn`: endLine does not change the label when it equals startLine. */
export function sourceUserFileLineInfo(
  attachment:SourceUserWorkspaceFile,
):string|null{
  if(attachment.startLine==null)return null;
  if(attachment.endLine!=null&&attachment.endLine!==attachment.startLine)
    return `${attachment.startLine}-${attachment.endLine}`;
  return String(attachment.startLine);
}
export function sourceUserFileOpenTarget(
  attachment:SourceUserFileAttachment,
):SourceUserFileOpenTarget{
  if(isSourceUserUploadedFile(attachment)){
    return attachment.upload.fileName.trim().length>0
      ?{kind:"uploaded",name:attachment.upload.fileName}:{kind:"none"};
  }
  // Original hn first tests h = fsPath || path. Even a shared-thread pill
  // has NO click callback when that underlying resource path is missing.
  const path=attachment.fsPath||attachment.path;
  if(path==null||path.trim()==="")return {kind:"none"};
  if(attachment.sharedThread?.shareId)
    return {kind:"shared-thread",shareId:attachment.sharedThread.shareId};
  return {kind:"workspace",path,
    ...(attachment.startLine!=null?{line:attachment.startLine,column:1}:{})};
}
/** Original Me receives xt(label, lineInfo) for resource files. */
export function sourceUserFileDisplayName(attachment:SourceUserFileAttachment):string{
  if(isSourceUserUploadedFile(attachment))
    return attachment.preview==null?attachment.upload.fileName:
      attachment.preview.length>0?attachment.preview:"Pasted text";
  const label=attachment.label?.trim();
  if(label)return label;
  const path=attachment.path||attachment.fsPath;
  if(!path)return "";
  return path.split(/[\\/]/).filter(Boolean).at(-1)??path;
}
/** Original hn uploads show a card only when the viewer is enabled.
 * Other path/card cases require private file-kind and target predicates. */
export function sourceUserFileLayout(
  attachment:SourceUserFileAttachment,
  uploadedViewerEnabled:boolean,
  isSourceConfirmedPathPreview=false,
):"card"|"pill"{
  if(isSourceUserUploadedFile(attachment))
    return attachment.preview!=null||uploadedViewerEnabled?"card":"pill";
  return isSourceConfirmedPathPreview?"card":"pill";
}
