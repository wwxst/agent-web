import {
  isSourceUserUploadedFile,
  sourceUserFileOpenTarget,
  type SourceUserFileAttachment,
  type SourceUserWorkspaceFile,
} from "./SourceUserFileAttachmentsModel.js";

/**
 * Original user-message-attachments-93893a2e6026.js hn:
 * f = !o && s && ze(h)!=null && startLine==null
 * m = !o && (f || ze(h)==="pptx" || isPastedText || ut(h) ||
 *             startLine==null && Ge(h))
 * Qe({scope,path:h,line:startLine,column:startLine==null?undefined:1,
 *     cwd,hostId,attachmentPreviewOrigin:f?"sent-message":undefined,
 *     isAttachmentPreview:f,openInSidePanel:m,target:o?"fileManager":undefined})
 *
 * ze / ut / Ge / i are PRIVATE original host functions. Keep each as an
 * explicit host-supplied answer; never infer from file extension here.
 */
export interface SourceUserFileQeHostClassifiers {
  /** Original private i(attachment) file-manager routing test. */
  isFileManagerAttachment?:(attachment:SourceUserWorkspaceFile)=>boolean;
  /** Original private ze(path) preview type resolver. */
  previewKind?:(path:string)=>string|null|undefined;
  /** Original private ut(path) side-panel predicate. */
  isSidePanelPath?:(path:string)=>boolean;
  /** Original private Ge(path) no-line side-panel predicate. */
  isSidePanelPathWithoutLine?:(path:string)=>boolean;
}
export interface SourceUserFileQeContext {
  cwd?:string|null;
  hostId?:string|null;
  /** Original Ba passes viewer enabled only to featured Yh attachments. */
  featuredViewerEnabled?:boolean;
}
export interface SourceUserFileQeRequest {
  path:string;
  line?:number;
  column?:1;
  cwd?:string;
  hostId?:string;
  attachmentPreviewOrigin?:"sent-message";
  isAttachmentPreview:boolean;
  openInSidePanel:boolean;
  target?:"fileManager";
}
export type SourceUserFileRoute =
  |{kind:"upload";fileName:string}
  |{kind:"shared-thread";shareId:string}
  |{kind:"workspace";qe:SourceUserFileQeRequest;
     /** Original Et context menu has endLine in addition to Qe click. */
     contextMenu:{path:string;line?:number;endLine?:number;
       cwd?:string;hostId?:string;isAttachmentPreview:boolean;
       openInSidePanel:boolean;attachmentPreviewOrigin?:"sent-message"}}
  |{kind:"none"};

export function projectSourceUserFileQeRoute(
  attachment:SourceUserFileAttachment,
  context:SourceUserFileQeContext={},
  classifiers:SourceUserFileQeHostClassifiers={},
):SourceUserFileRoute {
  const target=sourceUserFileOpenTarget(attachment);
  if(target.kind==="none")return {kind:"none"};
  if(target.kind==="uploaded")return {kind:"upload",fileName:target.name};
  if(target.kind==="shared-thread")
    return {kind:"shared-thread",shareId:target.shareId};
  if(isSourceUserUploadedFile(attachment))return {kind:"none"};
  const path=target.path;
  const fileManager=classifiers.isFileManagerAttachment?.(attachment)===true;
  const previewKind=classifiers.previewKind?.(path)??null;
  const isAttachmentPreview=!fileManager&&context.featuredViewerEnabled===true&&
    previewKind!=null&&attachment.startLine==null;
  const openInSidePanel=!fileManager&&(
    isAttachmentPreview||previewKind==="pptx"||
    attachment.isPastedText===true||
    classifiers.isSidePanelPath?.(path)===true||
    attachment.startLine==null&&
      classifiers.isSidePanelPathWithoutLine?.(path)===true
  );
  const shared={
    ...(context.cwd==null?{}:{cwd:context.cwd}),
    ...(context.hostId==null?{}:{hostId:context.hostId}),
  };
  const attachmentPreviewOrigin=isAttachmentPreview
    ?{attachmentPreviewOrigin:"sent-message" as const}:{};
  return {kind:"workspace",
    qe:{
      path,...(target.line==null?{}:{line:target.line,column:1 as const}),
      ...shared,...attachmentPreviewOrigin,
      isAttachmentPreview,openInSidePanel,
      ...(fileManager?{target:"fileManager" as const}:{}),
    },
    contextMenu:{
      path,...(target.line==null?{}:{line:target.line}),
      ...(attachment.endLine==null?{}:{endLine:attachment.endLine}),
      ...shared,...attachmentPreviewOrigin,
      isAttachmentPreview,openInSidePanel,
    },
  };
}
