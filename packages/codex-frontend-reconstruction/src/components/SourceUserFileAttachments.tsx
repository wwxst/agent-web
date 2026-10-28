import * as React from "react";
import {
  isSourceUserUploadedFile,
  sourceUserFileDisplayName,
  sourceUserFileLayout,
  sourceUserFileLineInfo,
  sourceUserFileOpenTarget,
  type SourceUserFileAttachment,
  type SourceUserFileOpenTarget,
} from "../conversation/SourceUserFileAttachmentsModel.js";
import "./sourceUserFileAttachments.css";

export interface SourceUserFileAttachmentsProps {
  attachments:readonly SourceUserFileAttachment[];
  isUploadedFileViewerEnabled?:boolean;
  /** Only verified host data can enable a workspace file preview card. */
  isPathPreviewable?:(attachment:SourceUserFileAttachment)=>boolean;
  /** The actual private uploaded-file preview belongs to a host adapter. */
  renderUploadedPreview?:(upload:SourceUserFileAttachment)=>React.ReactNode;
  /** No callback means a readonly attachment, never a fake file opener. */
  onOpen?:(attachment:SourceUserFileAttachment,target:SourceUserFileOpenTarget)=>void|Promise<void>;
  openDisabledLabel?:string;
}
/** Source `hn` file pills are part of the user message, not a new message row.
 * No uploads, shell paths or external links execute in this component.
 */
export function SourceUserFileAttachments({
  attachments,isUploadedFileViewerEnabled=false,isPathPreviewable,
  renderUploadedPreview,onOpen,openDisabledLabel="File opening unavailable",
}:SourceUserFileAttachmentsProps){
  if(attachments.length===0)return null;
  return <div className="codex-user-file-attachments"
    data-source-user-file-attachments="">
    {attachments.map((attachment,index)=>{
      const uploaded=isSourceUserUploadedFile(attachment);
      const name=sourceUserFileDisplayName(attachment);
      const target=sourceUserFileOpenTarget(attachment);
      const line=uploaded?null:sourceUserFileLineInfo(attachment);
      const preview=uploaded&&attachment.preview!=null
        ?renderUploadedPreview?.(attachment):null;
      const layout=sourceUserFileLayout(attachment,isUploadedFileViewerEnabled,
        !uploaded&&isPathPreviewable?.(attachment)===true);
      const canOpen=onOpen!=null&&target.kind!=="none";
      return <div key={index} className="codex-user-file-attachments__item"
        data-source-user-attachment-kind={uploaded?"upload":target.kind}
        data-source-user-attachment-layout={layout}>
        <button type="button" className="codex-user-file-attachments__pill"
          data-composer-attachment-pill={layout==="pill"?true:undefined}
          disabled={!canOpen}
          title={!canOpen?openDisabledLabel:name}
          aria-label={line!=null?`${name}, lines ${line}`:name}
          onClick={()=>{if(canOpen)void onOpen?.(attachment,target);}}>
          {preview!=null?<span className="codex-user-file-attachments__preview"
            data-source-uploaded-preview="">{preview}</span>
            :<span className="codex-user-file-attachments__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h4"/>
              </svg>
            </span>}
          <span className="codex-user-file-attachments__name">{name}</span>
          {line!=null?<span className="codex-user-file-attachments__line"
            data-source-user-attachment-lines={line}>{line}</span>:null}
        </button>
      </div>;
    })}
  </div>;
}
