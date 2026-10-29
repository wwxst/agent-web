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
  if(label){
    // Original app-primary sV(label, lineInfo) strips a duplicated trailing
    // " 14-28" or " (14-28)" when hn also passes lineInfo to FilePill.
    const lineInfo=sourceUserFileLineInfo(attachment);
    return lineInfo==null?label:label.replace(
      /(?:\s+\(\s*\d+(?:-\d+)?\s*\)|\s+\d+(?:-\d+)?)(\s*)$/,
      "",
    );
  }
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

/**
 * Original sites-end-resource Ba:
 *   C=[...attachments,...uploadedFileAttachments]
 *   [E,D] = partition(C, T)
 *   T(upload)=hasPreview || viewerEnabled && private file-kind supported
 *   T(workspace)=viewerEnabled && startLine==null && supported kind
 *
 * Featured entries are vertical right-aligned cards; context entries are
 * horizontally scrollable pills. Private vc/DO predicates are host-owned.
 */
export interface SourceUserFileAttachmentGroups {
  featured:readonly SourceUserFileAttachment[];
  context:readonly SourceUserFileAttachment[];
}
export function sourceUserFileAttachmentGroups(
  attachments:readonly SourceUserFileAttachment[],
  viewerEnabled:boolean,
  isUploadedPreviewable?:(filename:string)=>boolean,
  isPathPreviewable?:(attachment:SourceUserWorkspaceFile)=>boolean,
):SourceUserFileAttachmentGroups{
  const featured:SourceUserFileAttachment[]=[];
  const context:SourceUserFileAttachment[]=[];
  for(const attachment of attachments){
    const highlighted=isSourceUserUploadedFile(attachment)
      ?attachment.preview!=null||
        (viewerEnabled&&isUploadedPreviewable?.(attachment.upload.fileName)===true)
      :viewerEnabled&&attachment.startLine==null&&
        isPathPreviewable?.(attachment)===true;
    (highlighted?featured:context).push(attachment);
  }
  return {featured,context};
}

/**
 * Original Ba reads [...n.attachments,...n.uploadedFileAttachments??[]].
 * Keep that source ordering and reject malformed external host fields rather
 * than treating arbitrary message text or untrusted blobs as file actions.
 */
export function sourceUserFileAttachmentsFromMessage(
  message:Record<string,unknown>,
):readonly SourceUserFileAttachment[]{
  const candidates=[
    ...(Array.isArray(message.attachments)?message.attachments:[]),
    ...(Array.isArray(message.uploadedFileAttachments)?message.uploadedFileAttachments:[]),
  ];
  return candidates.filter(isSourceUserFileAttachment);
}
function isSourceUserFileAttachment(value:unknown):value is SourceUserFileAttachment{
  if(value==null||typeof value!=="object"||Array.isArray(value))return false;
  const obj=value as Record<string,unknown>;
  if("upload" in obj){
    const upload=obj.upload;
    if(upload==null||typeof upload!=="object"||Array.isArray(upload))return false;
    if(typeof (upload as Record<string,unknown>).fileName!=="string")return false;
    return obj.preview==null||typeof obj.preview==="string";
  }
  if(!["path","fsPath","label"].some(key=>typeof obj[key]==="string"))
    return false;
  if(obj.startLine!=null&&typeof obj.startLine!=="number")return false;
  if(obj.endLine!=null&&typeof obj.endLine!=="number")return false;
  if(obj.sharedThread!=null){
    const thread=obj.sharedThread;
    if(thread==null||typeof thread!=="object"||Array.isArray(thread)||
       typeof (thread as Record<string,unknown>).shareId!=="string")return false;
  }
  return true;
}
