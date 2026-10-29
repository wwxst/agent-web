import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,mkdir,writeFile,symlink,rm,realpath,stat,open as nativeOpen,rename} from "node:fs/promises";
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
  assert.deepEqual(await host.readTextFile(senderA,{
    path:good,line:1,endLine:2,
  }),{
    name:"entry.ts",relativePath:join("nested","entry.ts"),
    text:"line one\nline two\n",line:1,endLine:2,readOnly:true,
  });
  await assert.rejects(host.readTextFile(senderA,{
    path:good,endLine:2,
  }),/WORKSPACE_INVALID_FILE_REQUEST/);
  await assert.rejects(host.readTextFile(senderA,{
    path:good,line:14,endLine:3,
  }),/WORKSPACE_INVALID_FILE_REQUEST/);

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

test("source SXo native clipboard copies paths without grant and contents only after realpath grant",async()=>{
  const root=await mkdtemp(join(tmpdir(),"agent-web-workspace-copy-"));
  const outside=await mkdtemp(join(tmpdir(),"agent-web-workspace-copy-outside-"));
  try{
    const path=join(root,"hello.ts");
    const rejected=join(outside,"private.ts");
    await writeFile(path,"export const safe = true;");
    await writeFile(rejected,"private");
    const event={sender:{id:51}},untrusted={sender:{id:52}};
    const writes=[];
    const host=createTrustedWorkspacePreviewHost({
      isTrustedRenderer:e=>e===event,
      chooseDirectory:async()=>({canceled:false,filePaths:[root]}),
      writeClipboardText:text=>writes.push(text),
    });
    assert.equal(host.copyFilePath(event,path),true);
    assert.deepEqual(writes,[path]);
    await assert.rejects(host.copyFileContents(event,{path}),/WORKSPACE_NOT_GRANTED/);
    await assert.rejects(host.copyFileContents(untrusted,{path}),/WORKSPACE_UNTRUSTED_RENDERER/);
    assert.deepEqual(writes,[path]);
    assert.throws(()=>host.copyFilePath(event,"not-absolute.ts"),/WORKSPACE_INVALID_FILE_REQUEST/);
    await host.selectDirectory(event);
    assert.equal(await host.copyFileContents(event,{path}),true);
    assert.deepEqual(writes,[path,"export const safe = true;"]);
    await assert.rejects(host.copyFileContents(event,{path:rejected}),/WORKSPACE_OUTSIDE_GRANT/);
    assert.deepEqual(writes,[path,"export const safe = true;"]);
    host.revoke(event);
    await assert.rejects(host.copyFileContents(event,{path}),/WORKSPACE_NOT_GRANTED/);
  }finally{
    await rm(root,{recursive:true,force:true});
    await rm(outside,{recursive:true,force:true});
  }
});

function deferredNativeOperation(){
  let settle;
  const promise=new Promise(resolve=>{settle=resolve;});
  return {promise,settle:value=>settle(value)};
}

test("late native folder chooser after explicit revoke never re-grants access",async()=>{
  const root=await mkdtemp(join(tmpdir(),"agent-web-chooser-revoke-"));
  try{
    const file=join(root,"visible.ts");
    await writeFile(file,"safe");
    const event={sender:{id:201}};
    const picker=deferredNativeOperation();
    let choices=0;
    const host=createTrustedWorkspacePreviewHost({
      isTrustedRenderer:e=>e===event,
      chooseDirectory:()=>++choices===1?picker.promise:
        Promise.resolve({canceled:false,filePaths:[root]}),
    });
    const pending=host.selectDirectory(event);
    await assert.rejects(host.selectDirectory(event),/WORKSPACE_PICKER_IN_PROGRESS/);
    assert.equal(choices,1,"only one native chooser can be opened at a time");
    assert.equal(host.revoke(event),true);
    picker.settle({canceled:false,filePaths:[root]});
    assert.deepEqual(await pending,{selected:false});
    await assert.rejects(host.readTextFile(event,{path:file}),/WORKSPACE_NOT_GRANTED/);
    // The same trusted renderer may request a fresh explicit chooser later.
    assert.deepEqual(await host.selectDirectory(event),{
      selected:true,name:resolve(root).split(/[\\/]/).at(-1),
    });
    assert.equal(choices,2);
    assert.equal((await host.readTextFile(event,{path:file})).text,"safe");
  }finally{await rm(root,{recursive:true,force:true});}
});

test("window close or allowed navigation invalidates a chooser that has not returned",async()=>{
  const root=await mkdtemp(join(tmpdir(),"agent-web-chooser-close-"));
  try{
    const file=join(root,"visible.ts");
    await writeFile(file,"safe");
    const event={sender:{id:202}};
    let trusted=true;
    const first=deferredNativeOperation();
    const second=deferredNativeOperation();
    let calls=0;
    const host=createTrustedWorkspacePreviewHost({
      isTrustedRenderer:e=>e===event&&trusted,
      chooseDirectory:()=>++calls===1?first.promise:second.promise,
    });
    const afterClose=host.selectDirectory(event);
    host.clearSender(202); // main Window "closed" / "did-navigate"
    first.settle({canceled:false,filePaths:[root]});
    assert.deepEqual(await afterClose,{selected:false});
    await assert.rejects(host.readTextFile(event,{path:file}),/WORKSPACE_NOT_GRANTED/);
    const afterTrustChange=host.selectDirectory(event);
    trusted=false; // a new, no-longer-trusted document in same webContents
    second.settle({canceled:false,filePaths:[root]});
    assert.deepEqual(await afterTrustChange,{selected:false});
    trusted=true;
    await assert.rejects(host.readTextFile(event,{path:file}),/WORKSPACE_NOT_GRANTED/);
  }finally{await rm(root,{recursive:true,force:true});}
});

test("late file root realpath/stat resolution never restores a revoked grant",async()=>{
  const root=await mkdtemp(join(tmpdir(),"agent-web-chooser-io-"));
  try{
    const event={sender:{id:203}};
    const realpathGate=deferredNativeOperation();
    const realpathStarted=deferredNativeOperation();
    const statGate=deferredNativeOperation();
    const statStarted=deferredNativeOperation();
    let realpathCalls=0;
    const host=createTrustedWorkspacePreviewHost({
      isTrustedRenderer:e=>e===event,
      chooseDirectory:async()=>({canceled:false,filePaths:[root]}),
      filesystem:{
        realpath:async path=>{
          if(++realpathCalls===1){
            realpathStarted.settle(true);
            return realpathGate.promise;
          }
          return realpath(path);
        },
        stat:async()=>{
          statStarted.settle(true);
          return statGate.promise;
        },
        readFile:async()=>Buffer.from("safe"),
      },
    });
    const pendingPath=host.selectDirectory(event);
    await realpathStarted.promise; // Dialog completed, canonicalization is pending.
    host.revoke(event);
    realpathGate.settle(root);
    assert.deepEqual(await pendingPath,{selected:false});
    // New picker enters stat stage; invalidation there must also fail closed.
    const pendingStat=host.selectDirectory(event);
    await statStarted.promise;
    host.clearSender(203);
    statGate.settle(await stat(root));
    assert.deepEqual(await pendingStat,{selected:false});
    await assert.rejects(host.readTextFile(event,{path:join(root,"a.ts")}),
      /WORKSPACE_NOT_GRANTED/);
  }finally{await rm(root,{recursive:true,force:true});}
});

test("in-flight read and clipboard copy cannot disclose contents after revoke",async()=>{
  const root=await mkdtemp(join(tmpdir(),"agent-web-revoked-read-"));
  try{
    const file=join(root,"notes.ts");
    await writeFile(file,"important");
    const event={sender:{id:204}};
    const reading=deferredNativeOperation();
    const started=deferredNativeOperation();
    const writes=[];
    const host=createTrustedWorkspacePreviewHost({
      isTrustedRenderer:e=>e===event,
      chooseDirectory:async()=>({canceled:false,filePaths:[root]}),
      filesystem:{
        realpath,stat,
        open:async(...args)=>{
          const handle=await nativeOpen(...args);
          return {
            fd:handle.fd,
            stat:()=>handle.stat(),
            read:async(...readArgs)=>{
              started.settle(true);
              await reading.promise;
              return handle.read(...readArgs);
            },
            close:()=>handle.close(),
          };
        },
      },
      writeClipboardText:text=>writes.push(text),
    });
    await host.selectDirectory(event);
    const copying=host.copyFileContents(event,{path:file});
    await started.promise; // Realpath, allowlist, stat have all passed.
    host.clearSender(204); // window close while bytes are in flight
    reading.settle(Buffer.from("important"));
    await assert.rejects(copying,/WORKSPACE_GRANT_REVOKED/);
    assert.deepEqual(writes,[],"clipboard must not receive bytes after sender close");
    await assert.rejects(host.readTextFile(event,{path:file}),/WORKSPACE_NOT_GRANTED/);
  }finally{await rm(root,{recursive:true,force:true});}
});


test("file replaced between realpath/stat and descriptor open is rejected by file identity",async()=>{
  const root=await mkdtemp(join(tmpdir(),"agent-web-open-replacement-"));
  try{
    const file=join(root,"entry.ts");
    const backup=join(root,"old.ts");
    await writeFile(file,"original");
    const event={sender:{id:301}};
    let swaps=0;
    const host=createTrustedWorkspacePreviewHost({
      isTrustedRenderer:e=>e===event,
      chooseDirectory:async()=>({canceled:false,filePaths:[root]}),
      filesystem:{
        realpath,stat,
        open:async(...args)=>{
          if(swaps++===0){
            await rename(file,backup);
            await writeFile(file,"ATTACKER-CONTENT");
          }
          return nativeOpen(...args);
        },
      },
    });
    await host.selectDirectory(event);
    await assert.rejects(host.readTextFile(event,{path:file}),/WORKSPACE_FILE_CHANGED/);
    assert.equal(swaps,1);
  }finally{await rm(root,{recursive:true,force:true});}
});

test("open handle bounds a growing file to MAX+1 bytes, including malicious stat mismatch",async()=>{
  const root=await mkdtemp(join(tmpdir(),"agent-web-open-growth-"));
  try{
    const file=join(root,"growing.ts");
    await writeFile(file,"small");
    const event={sender:{id:302}};
    let reads=0,maxRequested=0,closes=0;
    const host=createTrustedWorkspacePreviewHost({
      isTrustedRenderer:e=>e===event,
      chooseDirectory:async()=>({canceled:false,filePaths:[root]}),
      filesystem:{
        realpath,stat,
        open:async(...args)=>{
          const handle=await nativeOpen(...args);
          return {
            fd:handle.fd,stat:()=>handle.stat(),
            read:async(buffer,offset,length)=>{
              reads++;maxRequested=Math.max(maxRequested,length);
              buffer.fill(0x41,offset,offset+length);
              return {bytesRead:length};
            },
            close:async()=>{closes++;await handle.close();},
          };
        },
      },
    });
    await host.selectDirectory(event);
    await assert.rejects(host.readTextFile(event,{path:file}),/WORKSPACE_FILE_TOO_LARGE/);
    assert.equal(reads,1);
    assert.equal(maxRequested,MAX_PREVIEW_BYTES+1,
      "no unbounded filename read or allocation beyond the first MAX+1 bytes");
    assert.equal(closes,1,"file descriptor closes on oversized content rejection");
  }finally{await rm(root,{recursive:true,force:true});}
});

test("Linux post-open descriptor path denies swapped parent symlink to outside workspace",{
  skip:process.platform!=="linux",
},async()=>{
  const root=await mkdtemp(join(tmpdir(),"agent-web-checked-parent-"));
  const outside=await mkdtemp(join(tmpdir(),"agent-web-checked-outside-"));
  try{
    const dir=join(root,"nested");
    await mkdir(dir);
    const file=join(dir,"entry.ts");
    await writeFile(file,"safe");
    const outsideFile=join(outside,"entry.ts");
    await writeFile(outsideFile,"secret");
    const event={sender:{id:303}};
    const host=createTrustedWorkspacePreviewHost({
      isTrustedRenderer:e=>e===event,
      chooseDirectory:async()=>({canceled:false,filePaths:[root]}),
      filesystem:{
        realpath,stat,
        open:async(...args)=>{
          // Realpath/stat have checked the in-root path. Replace its parent
          // with a symlink to the out-of-root directory immediately before
          // opening. O_NOFOLLOW only protects the leaf, so the handle/path
          // identity check must reject the new target before returning bytes.
          await rename(dir,join(root,"old-nested"));
          await symlink(outside,dir,"dir");
          return nativeOpen(...args);
        },
      },
    });
    await host.selectDirectory(event);
    await assert.rejects(host.readTextFile(event,{path:file}),
      /WORKSPACE_FILE_CHANGED/);
  }finally{
    await rm(root,{recursive:true,force:true});
    await rm(outside,{recursive:true,force:true});
  }
});
