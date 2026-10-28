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
  /** Rich pasted-text previews follow original Wmd, not an image thumbnail. */
  /** No callback means a readonly attachment, never a fake file opener. */
  onOpen?:(attachment:SourceUserFileAttachment,target:SourceUserFileOpenTarget)=>void|Promise<void>;
  openDisabledLabel?:string;
}
/** Source `hn` file pills are part of the user message, not a new message row.
 * No uploads, shell paths or external links execute in this component.
 */
export function SourceUserFileAttachments({
  attachments,isUploadedFileViewerEnabled=false,isPathPreviewable,
  onOpen,openDisabledLabel="File opening unavailable",
}:SourceUserFileAttachmentsProps){
  if(attachments.length===0)return null;
  return <div className="codex-user-file-attachments"
    data-source-user-file-attachments="">
    {attachments.map((attachment,index)=>{
      const uploaded=isSourceUserUploadedFile(attachment);
      const name=sourceUserFileDisplayName(attachment);
      const target=sourceUserFileOpenTarget(attachment);
      const line=uploaded?null:sourceUserFileLineInfo(attachment);
      // Original hn -> Wmd when upload.preview exists: string pasted-text card.
      const pastedTextPreview=uploaded&&attachment.preview!=null;
      const layout=sourceUserFileLayout(attachment,isUploadedFileViewerEnabled,
        !uploaded&&isPathPreviewable?.(attachment)===true);
      const canOpen=onOpen!=null&&target.kind!=="none";
      return <div key={index} className="codex-user-file-attachments__item"
        data-source-user-attachment-kind={uploaded?"upload":target.kind}
        data-source-user-attachment-layout={layout}>
        <button type="button" className="codex-user-file-attachments__pill"
          data-composer-attachment-pill={true}
          disabled={!canOpen}
          title={!canOpen?openDisabledLabel:name}
          aria-label={line!=null?`${name}, lines ${line}`:name}
          onClick={()=>{if(canOpen)void onOpen?.(attachment,target);}}>
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
    })}
  </div>;
}
