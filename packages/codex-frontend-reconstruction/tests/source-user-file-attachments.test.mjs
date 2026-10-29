import test from "node:test";
import assert from "node:assert/strict";
import {
  sourceUserFileDisplayName,
  sourceUserFileLayout,
  sourceUserFileAttachmentGroups,
  sourceUserFileAttachmentsFromMessage,
  sourceUserFileLineInfo,
  sourceUserFileOpenTarget,
} from "../build/SourceUserFileAttachmentsModel.js";

test("original hn discriminates uploads from workspace file-path attachments",()=>{
  const uploaded={upload:{fileName:"reference-notes.pdf"}};
  assert.equal(sourceUserFileDisplayName(uploaded),"reference-notes.pdf");
  assert.deepEqual(sourceUserFileOpenTarget(uploaded),
    {kind:"uploaded",name:"reference-notes.pdf"});
  assert.equal(sourceUserFileLayout(uploaded,false),"pill");
  assert.equal(sourceUserFileLayout(uploaded,true),"card");
  const pasted={upload:{fileName:"clipboard.txt"},preview:"Copied words"};
  assert.equal(sourceUserFileDisplayName(pasted),"Copied words");
  assert.equal(sourceUserFileLayout(pasted,false),"card");
  assert.deepEqual(sourceUserFileOpenTarget(pasted),
    {kind:"uploaded",name:"clipboard.txt"});
  assert.equal(sourceUserFileDisplayName({
    upload:{fileName:"empty-paste.txt"},preview:""}),"Pasted text");
  const resource={path:"/project/src/Example.ts",label:"Example.ts",
    startLine:14,endLine:28};
  assert.equal(sourceUserFileDisplayName(resource),"Example.ts");
  assert.equal(sourceUserFileDisplayName({...resource,label:"Example.ts (14-28)"}),"Example.ts");
  assert.equal(sourceUserFileDisplayName({...resource,label:"Example.ts 14-28"}),"Example.ts");
  assert.equal(sourceUserFileDisplayName({...resource,label:"Example.ts (9)"}),"Example.ts");
  assert.equal(sourceUserFileDisplayName({path:"/x",label:"Example.ts (9)"}),"Example.ts (9)");
  // Original sV only checks whether lineInfo is present, not whether the
  // trailing label suffix is identical to that lineInfo.
  assert.equal(sourceUserFileLineInfo(resource),"14-28");
  assert.deepEqual(sourceUserFileOpenTarget(resource),{
    kind:"workspace",path:"/project/src/Example.ts",line:14,column:1,
  });
  assert.equal(sourceUserFileLayout(resource,true),"pill");
  assert.equal(sourceUserFileLayout(resource,true,true),"card");
});

test("original Ba reads typed attachments and uploadedFileAttachments from the canonical message",()=>{
  const resource={path:"/projects/agent-web/src/App.tsx",label:"App.tsx"};
  const upload={upload:{fileName:"reference-notes.pdf",fileId:"fixture-id"}};
  const source=sourceUserFileAttachmentsFromMessage({
    attachments:[resource,{path:42},{upload:{fileName:undefined}},null,
      {path:"/workspace/a",startLine:"invalid"},{label:"detached"}],
    uploadedFileAttachments:[upload,{upload:{fileName:"notes.txt"},preview:{unsafe:"preview"}}],
  });
  assert.deepEqual(source,[resource,{label:"detached"},upload]);
  assert.deepEqual(sourceUserFileAttachmentsFromMessage({
    attachments:"not-an-array",uploadedFileAttachments:null}),[]);
  assert.deepEqual(sourceUserFileAttachmentsFromMessage({message:"@src/App.tsx"}),[]);
});

test("source Ba partitions featured cards separately from context pills without inventing MIME capabilities",()=>{
  const source=[
    {path:"/workspace/src/App.tsx",startLine:14},
    {upload:{fileName:"first.pdf"}},
    {upload:{fileName:"paste.txt"},preview:"Pasted source"},
    {upload:{fileName:"empty.txt"},preview:""},
    {path:"/workspace/docs/preview.pdf"},
  ];
  const gated=sourceUserFileAttachmentGroups(source,false);
  assert.deepEqual(gated.featured,[source[2],source[3]]);
  assert.deepEqual(gated.context,[source[0],source[1],source[4]]);
  const enabled=sourceUserFileAttachmentGroups(source,true,
    name=>name==="first.pdf",
    item=>item.path==="/workspace/docs/preview.pdf");
  assert.deepEqual(enabled.featured,[source[1],source[2],source[3],source[4]]);
  assert.deepEqual(enabled.context,[source[0]]);
  assert.equal(source.length,5);
});

test("original yn line label and safe separate host routing",()=>{
  assert.equal(sourceUserFileLineInfo({startLine:9,endLine:9}),"9");
  assert.equal(sourceUserFileLineInfo({startLine:9}),"9");
  assert.equal(sourceUserFileLineInfo({endLine:12}),null);
  assert.deepEqual(sourceUserFileOpenTarget({
    path:"/src/A.ts",fsPath:"/host/src/A.ts",startLine:12,
  }),{kind:"workspace",path:"/host/src/A.ts",line:12,column:1});
  assert.deepEqual(sourceUserFileOpenTarget({sharedThread:{shareId:"abc"},path:"/x"}),
    {kind:"shared-thread",shareId:"abc"});
  assert.deepEqual(sourceUserFileOpenTarget({sharedThread:{shareId:"abc"}}),
    {kind:"none"});
  assert.deepEqual(sourceUserFileOpenTarget({label:"Unresolved"}),{kind:"none"});
  assert.deepEqual(sourceUserFileOpenTarget({upload:{fileName:" "}}),{kind:"none"});
  assert.equal(sourceUserFileDisplayName({path:"C:\\test\\other.txt"}),"other.txt");
});
