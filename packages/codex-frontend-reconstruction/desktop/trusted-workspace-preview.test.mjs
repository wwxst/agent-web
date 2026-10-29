import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,mkdir,writeFile,symlink,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {
  createTrustedWorkspacePreviewHost,isPathInside,
  isPreviewableTextFile,isValidPreviewRequest,MAX_PREVIEW_BYTES,
} from "./trustedWorkspacePreview.cjs";

test("native directory grant is per trusted renderer, path canonical and revoked",async()=>{
  const root=await mkdtemp(join(tmpdir(),"agent-web-workspace-grant-"));
  const outside=await mkdtemp(join(tmpdir(),"agent-web-outside-grant-"));
  const inside=join(root,"nested");
  await mkdir(inside);
  const good=join(inside,"entry.ts");
  const bad=join(outside,"secret.ts");
  const oversized=join(inside,"large.md");
  await writeFile(good,"line one\nline two\n","utf8");
  await writeFile(bad,"outside secrets","utf8");
  await writeFile(oversized,"z".repeat(MAX_PREVIEW_BYTES+1));
  const senderA={sender:{id:101}},senderB={sender:{id:102}};
  let pickerCalls=0;
  const host=createTrustedWorkspacePreviewHost({
    isTrustedRenderer:event=>event===senderA||event===senderB,
    chooseDirectory:async()=>{pickerCalls++;return {canceled:false,filePaths:[root]};},
  });
  const request={path:good,line:2};
  await assert.rejects(host.readTextFile(senderA,request),/WORKSPACE_NOT_GRANTED/);
  assert.deepEqual(await host.selectDirectory(senderA),{selected:true,name:resolve(root).split(/[\\/]/).at(-1)});
  assert.equal(pickerCalls,1);
  assert.deepEqual(await host.readTextFile(senderA,request),{
    name:"entry.ts",relativePath:join("nested","entry.ts"),
    text:"line one\nline two\n",line:2,readOnly:true,
  });
  await assert.rejects(host.readTextFile(senderB,request),/WORKSPACE_NOT_GRANTED/);
  await assert.rejects(host.readTextFile(senderA,{path:bad}),/WORKSPACE_OUTSIDE_GRANT/);
  await assert.rejects(host.readTextFile(senderA,{path:oversized}),/WORKSPACE_FILE_TOO_LARGE/);
  await assert.rejects(host.readTextFile(senderA,{path:root}),/WORKSPACE_OUTSIDE_GRANT/);
  await assert.rejects(host.readTextFile(senderA,{path:good,line:-10}),/WORKSPACE_INVALID_FILE_REQUEST/);
  await assert.rejects(host.readTextFile({sender:{id:101}},request),/WORKSPACE_UNTRUSTED_RENDERER/);
  assert.equal(host.revoke(senderA),true);
  await assert.rejects(host.readTextFile(senderA,request),/WORKSPACE_NOT_GRANTED/);
  await host.selectDirectory(senderA);
  host.clearSender(101);
  await assert.rejects(host.readTextFile(senderA,request),/WORKSPACE_NOT_GRANTED/);
  await rm(root,{recursive:true,force:true});
  await rm(outside,{recursive:true,force:true});
});

test("symlinks outside the user-selected root are denied even when path spelling is inside",async()=>{
  const root=await mkdtemp(join(tmpdir(),"agent-web-workspace-link-"));
  const outside=await mkdtemp(join(tmpdir(),"agent-web-workspace-target-"));
  try{
    await writeFile(join(outside,"secret.ts"),"private");
    try{await symlink(outside,join(root,"linked"),"dir");}
    catch(error){if(["EPERM","EACCES","ENOSYS"].includes(error?.code))return;throw error;}
    const event={sender:{id:2}};
    const host=createTrustedWorkspacePreviewHost({
      isTrustedRenderer:e=>e===event,
      chooseDirectory:async()=>({canceled:false,filePaths:[root]}),
    });
    await host.selectDirectory(event);
    await assert.rejects(host.readTextFile(event,{
      path:join(root,"linked","secret.ts"),
    }),/WORKSPACE_OUTSIDE_GRANT/);
  }finally{await rm(root,{recursive:true,force:true});await rm(outside,{recursive:true,force:true});}
});

test("cancel and malicious dialog values do not add grants or expose path",async()=>{
  const sender={sender:{id:4}};
  const host=createTrustedWorkspacePreviewHost({
    isTrustedRenderer:e=>e===sender,
    chooseDirectory:async()=>({canceled:true,filePaths:[]}),
  });
  assert.deepEqual(await host.selectDirectory(sender),{selected:false});
  await assert.rejects(host.readTextFile(sender,{path:resolve("/","home","a.ts")}),/WORKSPACE_NOT_GRANTED/);
  assert.equal(isPathInside("/root","/root-other/secret.ts"),false);
  assert.equal(isPathInside("/root","/root/nested/file.ts"),true);
  assert.equal(isPreviewableTextFile("app.tsx"),true);
  assert.equal(isPreviewableTextFile("run.exe"),false);
  assert.equal(isPreviewableTextFile(".gitignore"),true);
  assert.equal(isValidPreviewRequest({path:"relative.ts"}),false);
  assert.equal(isValidPreviewRequest({path:resolve("file.ts"),line:1}),true);
  assert.equal(isValidPreviewRequest({path:resolve("file.ts"),line:0}),false);
  assert.equal(isValidPreviewRequest({path:resolve("file.ts"),evil:true}),false);
});
