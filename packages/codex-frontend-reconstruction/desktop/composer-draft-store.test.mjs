import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,readFile,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {
 DRAFT_FILENAME,MAX_DRAFT_LENGTH,readComposerDrafts,writeComposerDraft,
}=require("./composerDraftStore.cjs");

test("Electron Composer drafts persist by exact thread key and clear without affecting neighbors",async()=>{
 const root=await mkdtemp(join(tmpdir(),"agent-web-draft-test-"));
 try{
  assert.deepEqual(readComposerDrafts(root),{});
  assert.equal(writeComposerDraft(root,"frontend","first draft"),true);
  assert.equal(writeComposerDraft(root,"review","review draft"),true);
  assert.deepEqual(readComposerDrafts(root),{frontend:"first draft",review:"review draft"});
  const stored=JSON.parse(await readFile(join(root,DRAFT_FILENAME),"utf8"));
  assert.equal(stored.version,1);
  assert.deepEqual(stored.drafts,{frontend:"first draft",review:"review draft"});
  assert.equal(writeComposerDraft(root,"frontend",""),true);
  assert.deepEqual(readComposerDrafts(root),{review:"review draft"});
 }finally{await rm(root,{recursive:true,force:true});}
});
test("rejects arbitrary IDs and oversized payloads before disk access",async()=>{
 const root=await mkdtemp(join(tmpdir(),"agent-web-draft-test-"));
 try{
  assert.equal(writeComposerDraft(root,"../../../other","bad"),false);
  assert.equal(writeComposerDraft(root,"unknown","bad"),false);
  assert.equal(writeComposerDraft(root,"frontend",null),false);
  assert.equal(writeComposerDraft(root,"frontend","x".repeat(MAX_DRAFT_LENGTH+1)),false);
  assert.deepEqual(readComposerDrafts(root),{});
 }finally{await rm(root,{recursive:true,force:true});}
});
test("corrupted, version-mismatched and hostile saved payloads do not hydrate a Composer",async()=>{
 const root=await mkdtemp(join(tmpdir(),"agent-web-draft-test-"));
 try{
  const file=join(root,DRAFT_FILENAME);
  for(const data of ['{oops','{"version":99,"drafts":{"frontend":"bad"}}',
    '{"version":1,"drafts":{"unknown":"other","frontend":42}}']){
    await writeFile(file,data,"utf8");
    assert.deepEqual(readComposerDrafts(root),{});
  }
  await writeFile(file,JSON.stringify({version:1,drafts:{
    frontend:"okay",review:"y".repeat(MAX_DRAFT_LENGTH+1),unknown:"skip",
  }}),"utf8");
  assert.deepEqual(readComposerDrafts(root),{frontend:"okay"});
  assert.equal(writeComposerDraft(root,"review","restored"),true);
  assert.deepEqual(readComposerDrafts(root),{frontend:"okay",review:"restored"});
 }finally{await rm(root,{recursive:true,force:true});}
});
