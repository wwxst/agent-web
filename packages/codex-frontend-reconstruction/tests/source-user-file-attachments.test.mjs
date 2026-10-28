import test from "node:test";
import assert from "node:assert/strict";
import {
  sourceUserFileDisplayName,
  sourceUserFileLayout,
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
  assert.equal(sourceUserFileDisplayName({...resource,label:"Example.ts (9)"}),"Example.ts (9)");
  assert.equal(sourceUserFileDisplayName({path:"/x",label:"Example.ts (9)"}),"Example.ts (9)");
  assert.equal(sourceUserFileLineInfo(resource),"14-28");
  assert.deepEqual(sourceUserFileOpenTarget(resource),{
    kind:"workspace",path:"/project/src/Example.ts",line:14,column:1,
  });
  assert.equal(sourceUserFileLayout(resource,true),"pill");
  assert.equal(sourceUserFileLayout(resource,true,true),"card");
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
