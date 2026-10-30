import test from "node:test";
import assert from "node:assert/strict";
import {
  appendComposerDraftAttachments,
  clearComposerDraftAttachments,
  formatComposerDraftAttachmentSize,
  removeComposerDraftAttachment,
  toLocalPreviewOnlyMessageAttachments,
} from "../build/ComposerDraftAttachmentsModel.js";

function file(name,type="application/octet-stream",size=3){
  return new File([new Uint8Array(size)],name,{type});
}

test("stages files and images in source order without reading or uploading their bytes",()=>{
  const image=file("diagram.png","image/png",2048);
  const document=file("notes.md","text/markdown",1024);
  let index=0;
  const staged=appendComposerDraftAttachments([], [image,document],()=>{
    index+=1;return "attachment-"+index;
  });
  assert.equal(staged.length,2);
  assert.equal(staged[0].file,image);
  assert.equal(staged[0].fileName,"diagram.png");
  assert.equal(staged[0].kind,"image");
  assert.equal(staged[0].mimeType,"image/png");
  assert.equal(staged[0].sizeBytes,2048);
  assert.equal(staged[1].file,document);
  assert.equal(staged[1].kind,"file");
  assert.deepEqual(toLocalPreviewOnlyMessageAttachments(staged),[
    {label:"diagram.png"},{label:"notes.md"},
  ]);
});

test("deduplicates the same File object across image/file paste channels but retains distinct same-name files",()=>{
  const first=file("same.txt","text/plain");
  const second=file("same.txt","text/plain");
  const initial=appendComposerDraftAttachments([], [first],()=> "first");
  const unchanged=appendComposerDraftAttachments(initial,[first],()=> "duplicate");
  assert.equal(unchanged,initial);
  const next=appendComposerDraftAttachments(initial,[second],()=> "second");
  assert.equal(next.length,2);
  assert.deepEqual(next.map(item=>item.fileName),["same.txt","same.txt"]);
});

test("removal is immutable, stable for unknown IDs, and clear returns an empty list",()=>{
  const a=file("a.txt"),b=file("b.txt");
  let index=0;
  const initial=appendComposerDraftAttachments([], [a,b],()=>{
    index+=1;return "file-"+index;
  });
  const remaining=removeComposerDraftAttachment(initial,"file-1");
  assert.equal(remaining.length,1);
  assert.equal(remaining[0].file,b);
  assert.equal(removeComposerDraftAttachment(remaining,"missing"),remaining);
  assert.deepEqual(clearComposerDraftAttachments(),[]);
  assert.equal(initial.length,2);
});

test("sanitizes path/control characters from display names without granting a path",()=>{
  let index=0;
  const staged=appendComposerDraftAttachments([],[
    file("C:\\private\\notes.txt","text/plain"),
    file("  \u0000  ","text/plain"),
  ],()=>{
    index+=1;return String(index);
  });
  assert.deepEqual(staged.map(item=>item.fileName),["notes.txt","Untitled file"]);
  assert.deepEqual(toLocalPreviewOnlyMessageAttachments(staged),[
    {label:"notes.txt"},{label:"Untitled file"},
  ]);
});

test("formats attachment sizes with stable byte, KB and MB units",()=>{
  assert.equal(formatComposerDraftAttachmentSize(0),"0 B");
  assert.equal(formatComposerDraftAttachmentSize(12),"12 B");
  assert.equal(formatComposerDraftAttachmentSize(1536),"1.5 KB");
  assert.equal(formatComposerDraftAttachmentSize(10240),"10 KB");
  assert.equal(formatComposerDraftAttachmentSize(2*1024*1024),"2.0 MB");
  assert.equal(formatComposerDraftAttachmentSize(-1),"0 B");
});
