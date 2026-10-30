/**
 * In-memory Composer attachment staging, reconstructed from app-primary's
 * opt -> WLe/Mst attachment intake and p2e -> G0e attachment tray.
 *
 * This model intentionally stores the browser File reference only. It does
 * not read bytes, grant workspace paths, upload files, or claim a backend
 * attachment ID. The standalone preview can therefore exercise the actual
 * Composer intake/retention/removal UI without pretending an upload occurred.
 */
export interface ComposerDraftAttachment {
  readonly id:string;
  readonly file:File;
  readonly fileName:string;
  readonly mimeType:string;
  readonly sizeBytes:number;
  readonly kind:"image"|"file";
}

export type ComposerDraftAttachmentIdFactory=()=>string;

function displayFileName(name:string):string{
  const base=name.split(/[\\/]/u).filter(Boolean).at(-1)??"";
  const safe=base.replace(/[\u0000-\u001f\u007f]/gu,"").trim();
  return safe.length>0?safe:"Untitled file";
}

/**
 * Preserve source attachment order and the same File object identity. The
 * identity check prevents the controller's image and file paste channels
 * from staging the same clipboard object twice; two distinct files with the
 * same filename remain separate attachments.
 */
export function appendComposerDraftAttachments(
  current:readonly ComposerDraftAttachment[],
  files:readonly File[],
  createId:ComposerDraftAttachmentIdFactory,
):readonly ComposerDraftAttachment[]{
  const seenFiles=new Set(current.map(item=>item.file));
  const seenIds=new Set(current.map(item=>item.id));
  const additions:ComposerDraftAttachment[]=[];
  for(const file of files){
    if(file==null||typeof file!=="object"||seenFiles.has(file))continue;
    const id=createId();
    if(typeof id!=="string"||id.trim().length===0||seenIds.has(id))
      throw new TypeError("Composer attachment IDs must be non-empty and unique.");
    seenFiles.add(file);
    seenIds.add(id);
    const mimeType=typeof file.type==="string"&&file.type.length>0
      ?file.type:"application/octet-stream";
    additions.push(Object.freeze({
      id,file,fileName:displayFileName(file.name),
      mimeType,sizeBytes:Number.isFinite(file.size)?Math.max(0,file.size):0,
      kind:mimeType.toLowerCase().startsWith("image/")?"image":"file",
    }));
  }
  return additions.length===0?current:[...current,...additions];
}

export function removeComposerDraftAttachment(
  current:readonly ComposerDraftAttachment[],
  id:string,
):readonly ComposerDraftAttachment[]{
  const next=current.filter(item=>item.id!==id);
  return next.length===current.length?current:next;
}

export function clearComposerDraftAttachments():readonly ComposerDraftAttachment[]{
  return [];
}

export function formatComposerDraftAttachmentSize(bytes:number):string{
  const safe=Number.isFinite(bytes)?Math.max(0,bytes):0;
  if(safe<1024)return `${Math.round(safe)} B`;
  if(safe<1024*1024)return `${(safe/1024).toFixed(safe<10*1024?1:0)} KB`;
  return `${(safe/(1024*1024)).toFixed(1)} MB`;
}

/**
 * Demo transcript references deliberately carry a label but no path/upload
 * token. The existing user-message renderer therefore shows a non-openable
 * attachment pill; no local path or successful upload is fabricated.
 */
export function toLocalPreviewOnlyMessageAttachments(
  attachments:readonly ComposerDraftAttachment[],
):Array<{label:string}>{
  return attachments.map(item=>({label:item.fileName}));
}
