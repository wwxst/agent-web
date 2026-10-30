import * as React from "react";
import type {ComposerDraftAttachment} from "../conversation/ComposerDraftAttachmentsModel.js";
import {formatComposerDraftAttachmentSize} from "../conversation/ComposerDraftAttachmentsModel.js";

export interface CodexComposerDraftAttachmentTrayProps {
  attachments:readonly ComposerDraftAttachment[];
  onRemove:(id:string)=>void;
}

function FileGlyph(){
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M6 3.75h7l5 5v11.5H6z"/>
    <path d="M13 3.75v5h5M9 14h6M9 17h4"/>
  </svg>;
}

function DraftAttachmentTile(props:{
  attachment:ComposerDraftAttachment;
  onRemove:(id:string)=>void;
}){
  const {attachment,onRemove}=props;
  const [previewUrl,setPreviewUrl]=React.useState<string|null>(null);
  const [previewFailed,setPreviewFailed]=React.useState(false);
  React.useEffect(()=>{
    setPreviewFailed(false);
    if(attachment.kind!=="image"){
      setPreviewUrl(null);
      return;
    }
    const url=URL.createObjectURL(attachment.file);
    setPreviewUrl(url);
    return ()=>URL.revokeObjectURL(url);
  },[attachment.file,attachment.kind]);

  return <article
    className="codex-composer-attachment-tile"
    data-composer-attachment-id={attachment.id}
    data-composer-attachment-kind={attachment.kind}
    data-composer-attachment-upload-state="local-only"
    aria-label={attachment.fileName}
    title="本地预览；文件尚未上传"
  >
    {attachment.kind==="image"&&previewUrl!=null&&!previewFailed
      ?<img className="codex-composer-attachment-tile__image"
          src={previewUrl} alt="" onError={()=>setPreviewFailed(true)}/>
      :<span className="codex-composer-attachment-tile__icon"><FileGlyph/></span>}
    <span className="codex-composer-attachment-tile__labels">
      <span className="codex-composer-attachment-tile__name" title={attachment.fileName}>
        {attachment.fileName}
      </span>
      <span className="codex-composer-attachment-tile__size">
        {formatComposerDraftAttachmentSize(attachment.sizeBytes)}
      </span>
    </span>
    <button type="button"
      className="codex-composer-attachment-tile__remove"
      aria-label={`Remove ${attachment.fileName}`}
      title={`Remove ${attachment.fileName}`}
      onClick={()=>onRemove(attachment.id)}>×</button>
  </article>;
}

/**
 * Source G0e attachment tray shape: horizontally scrollable attachment row,
 * ordered tiles, and per-attachment remove actions. These are local draft
 * File objects only; this component never calls an upload or host API.
 */
export function CodexComposerDraftAttachmentTray(
  props:CodexComposerDraftAttachmentTrayProps,
){
  if(props.attachments.length===0)return null;
  return <div className="codex-composer-attachment-scroll"
    data-composer-attachments-scroll-container="">
    <div className="codex-composer-attachment-row" data-composer-attachments-row="">
      {props.attachments.map(attachment=><DraftAttachmentTile
        key={attachment.id} attachment={attachment} onRemove={props.onRemove}/>)}
    </div>
  </div>;
}
