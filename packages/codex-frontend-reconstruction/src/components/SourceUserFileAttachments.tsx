import * as React from "react";
import {
  isSourceUserUploadedFile,
  sourceUserFileAttachmentGroups,
  sourceUserFileDisplayName,
  sourceUserFileLayout,
  sourceUserFileLineInfo,
  sourceUserFileOpenTarget,
  type SourceUserFileAttachment,
  type SourceUserWorkspaceFile,
  type SourceUserFileOpenTarget,
} from "../conversation/SourceUserFileAttachmentsModel.js";
import {
  projectSourceUserFileQeRoute,
  type SourceUserFileQeContext,
  type SourceUserFileQeHostClassifiers,
  type SourceUserFileRoute,
} from "../conversation/SourceUserFileQeRouteModel.js";
import "./sourceUserFileAttachments.css";

export interface SourceUserFileAttachmentsProps {
  attachments:readonly SourceUserFileAttachment[];
  /** Original Ba enables previews only after private host eligibility checks. */
  isUploadedFileViewerEnabled?:boolean;
  /** The imported private vc(filename) classifier is host-owned. */
  isUploadedPreviewable?:(filename:string)=>boolean;
  /** The resource kind classifier is host-owned, not inferred from a suffix. */
  isPathPreviewable?:(attachment:SourceUserWorkspaceFile)=>boolean;
  /** Original Ba provides cwd/hostId and original hn needs host classifiers. */
  fileOpenContext?:Omit<SourceUserFileQeContext,"featuredViewerEnabled">;
  fileOpenClassifiers?:SourceUserFileQeHostClassifiers;
  /** Optional host-specific capability filter, e.g. native local files only. */
  canOpenAttachment?:(attachment:SourceUserFileAttachment,target:SourceUserFileOpenTarget)=>boolean;
  /** No callback means a readonly attachment, never a fake file opener. */
  onOpen?:(attachment:SourceUserFileAttachment,target:SourceUserFileOpenTarget,
    sourceRoute:SourceUserFileRoute)=>void|Promise<void>;
  openDisabledLabel?:string;
}
/**
 * Original Ba in sites-end-resource partitions user attachments into E and D:
 * E vertical featured cards, D horizontally scrollable context pills. hn/Wmd
 * determines each member's appearance. Files never open without a host action.
 */
export function SourceUserFileAttachments({
  attachments,isUploadedFileViewerEnabled=false,isUploadedPreviewable,isPathPreviewable,
  canOpenAttachment,fileOpenContext,fileOpenClassifiers,onOpen,
  openDisabledLabel="File opening unavailable",
}:SourceUserFileAttachmentsProps){
  if(attachments.length===0)return null;
  const groups=sourceUserFileAttachmentGroups(
    attachments,isUploadedFileViewerEnabled,isUploadedPreviewable,isPathPreviewable);

  function renderAttachment(attachment:SourceUserFileAttachment,index:number,featured:boolean){
    const uploaded=isSourceUserUploadedFile(attachment);
    const name=sourceUserFileDisplayName(attachment);
    const target=sourceUserFileOpenTarget(attachment);
    const sourceRoute=projectSourceUserFileQeRoute(attachment,{
      ...fileOpenContext,featuredViewerEnabled:featured,
    },fileOpenClassifiers);
    const line=uploaded?null:sourceUserFileLineInfo(attachment);
    // Original hn -> Wmd uses pasted text string, never a thumbnail.
    const pastedTextPreview=uploaded&&attachment.preview!=null;
    const layout=sourceUserFileLayout(attachment,featured,featured&&!uploaded);
    const canOpen=onOpen!=null&&target.kind!=="none"&&
      (canOpenAttachment?.(attachment,target)??true);
    return <div key={index} className="codex-user-file-attachments__item"
      data-source-user-attachment-kind={uploaded?"upload":target.kind}
      data-source-user-attachment-layout={layout}>
      <button type="button" className="codex-user-file-attachments__pill"
        data-composer-attachment-pill={true}
        disabled={!canOpen}
        title={!canOpen?openDisabledLabel:name}
        aria-label={line!=null?`${name}, lines ${line}`:name}
        onClick={()=>{if(canOpen)void onOpen?.(attachment,target,sourceRoute);}}>
        <span className="codex-user-file-attachments__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h4"/>
          </svg>
        </span>
        <span className="codex-user-file-attachments__label">
          <span className="codex-user-file-attachments__name"
            data-source-pasted-text-preview={pastedTextPreview?"true":undefined}>
            {name}
          </span>
          {pastedTextPreview
            ?<span className="codex-user-file-attachments__subtitle">Pasted text</span>:null}
          {line!=null?<span className="codex-user-file-attachments__line"
            data-source-user-attachment-lines={line}>{line}</span>:null}
        </span>
      </button>
    </div>;
  }

  return <div className="codex-user-file-attachments"
    data-source-user-file-attachments="">
    {groups.featured.length>0
      ?<div className="codex-user-file-attachments__featured"
        data-source-user-featured-attachments="">
        {groups.featured.map((attachment,index)=>renderAttachment(attachment,index,true))}
      </div>:null}
    {groups.context.length>0
      ?<div className="codex-user-file-attachments__context"
        data-source-user-context-attachments="">
        <div className="codex-user-file-attachments__context-inner">
          {groups.context.map((attachment,index)=>renderAttachment(attachment,index,false))}
        </div>
      </div>:null}
  </div>;
}
