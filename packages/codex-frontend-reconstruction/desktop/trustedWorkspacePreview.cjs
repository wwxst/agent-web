"use strict";
/**
 * Independent safe Electron fallback for Codex's source hn -> Qe workspace-file
 * route. Original Qe integrates an authenticated workspace and side panel; this
 * host has neither. Never open an arbitrary renderer-supplied path via shell.
 *
 * A native folder chooser is the ONLY origin of grants. Grants are scoped to
 * one trusted webContents and cleared on its navigation/closure.
 */
const fs=require("node:fs/promises");
const {constants:fsConstants}=require("node:fs");
const path=require("node:path");
const {TextDecoder}=require("node:util");
const MAX_PREVIEW_BYTES=1024*1024;
const MAX_DIRECTORY_ENTRIES=200;
const MAX_DIRECTORY_SCAN=400;
/** Local, grant-relative path only: no absolute roots, traversal, device
 * names or escaping into the host filesystem. Empty means chosen root. */
function validRelativePath(relativePath,allowRoot=false){
  if(typeof relativePath!=="string"||relativePath.length>1024||
    (!allowRoot&&relativePath==="")||
    /[\\:\u0000-\u001f\u007f]/u.test(relativePath)||
    relativePath.startsWith("/")||relativePath.endsWith("/"))return false;
  return relativePath===""&&allowRoot||
    relativePath.split("/").every(part=>part!==""&&part!=="."&&part!==".."&&
      !/[. ]$/.test(part));
}
function validDirectoryRequest(request){
  return request!=null&&typeof request==="object"&&!Array.isArray(request)&&
    Object.keys(request).length===1&&
    Object.hasOwn(request,"relativePath")&&
    validRelativePath(request.relativePath,true);
}
function validTreeFileRequest(request){
  return request!=null&&typeof request==="object"&&!Array.isArray(request)&&
    Object.hasOwn(request,"relativePath")&&
    Object.keys(request).every(k=>["relativePath","line","endLine"].includes(k))&&
    validRelativePath(request.relativePath)&&
    (request.line===undefined||(Number.isSafeInteger(request.line)&&
      request.line>=1&&request.line<=10000000))&&
    (request.endLine===undefined||(Number.isSafeInteger(request.endLine)&&
      request.line!==undefined&&request.endLine>=request.line&&
      request.endLine<=10000000));
}
function sameDirectoryIdentity(a,b){
  return a!=null&&b!=null&&a.isDirectory()&&b.isDirectory()&&
    a.ino!=null&&b.ino!=null&&a.dev!=null&&b.dev!=null&&
    String(a.ino)!=="0"&&String(b.ino)!=="0"&&
    String(a.ino)===String(b.ino)&&String(a.dev)===String(b.dev);
}
const ALLOWED_EXTENSIONS=new Set([
  ".txt",".md",".mdx",".json",".jsonl",".ts",".tsx",".js",".jsx",
  ".mjs",".cjs",".css",".scss",".html",".xml",".yaml",".yml",
  ".toml",".py",".go",".rs",".java",".kt",".swift",".sh",".ps1",
  ".sql",".graphql",".gql",".vue",".svelte",".diff",".patch",
  ".gitignore",".env.example",
]);
const denied=(code)=>{throw Object.assign(new Error(code),{code});};
function isSafePathInput(value){
  return typeof value==="string"&&value.length>0&&value.length<=4096&&
    !/[\u0000-\u001f\u007f]/u.test(value)&&path.isAbsolute(value);
}
function isPathInside(root,candidate){
  const rel=path.relative(root,candidate);
  return rel!==""&&!path.isAbsolute(rel)&&rel!==".."&&
    !rel.startsWith(".."+path.sep);
}
function isPreviewableTextFile(filename){
  return ALLOWED_EXTENSIONS.has(path.extname(filename).toLowerCase())||
    ALLOWED_EXTENSIONS.has(path.basename(filename).toLowerCase());
}
function isValidPreviewRequest(input){
  return input!=null&&typeof input==="object"&&!Array.isArray(input)&&
    Object.keys(input).every(k=>["path","line","endLine"].includes(k))&&
    Object.hasOwn(input,"path")&&isSafePathInput(input.path)&&
    (input.line===undefined||(Number.isSafeInteger(input.line)&&
      input.line>=1&&input.line<=10000000))&&
    (input.endLine===undefined||(Number.isSafeInteger(input.endLine)&&
      input.line!==undefined&&input.endLine>=input.line&&
      input.endLine<=10000000));
}
function isSameFileIdentity(left,right){
  // Never accept an unavailable/zero inode as evidence of identity.
  if(left==null||right==null||!left.isFile()||!right.isFile()||
     left.ino==null||right.ino==null||left.dev==null||right.dev==null||
     String(left.ino)==="0"||String(right.ino)==="0")return false;
  return String(left.dev)===String(right.dev)&&
    String(left.ino)===String(right.ino);
}
/** Bounded file-descriptor read. The size check happens on the opened
 * handle, and even a growing file can never allocate/read past MAX+1. */
async function readOpenedText(handle){
  const buffer=Buffer.alloc(MAX_PREVIEW_BYTES+1);
  let used=0;
  while(used<buffer.length){
    const {bytesRead}=await handle.read(buffer,used,buffer.length-used,used);
    if(!Number.isSafeInteger(bytesRead)||bytesRead<0||
       bytesRead>buffer.length-used)denied("WORKSPACE_FILE_READ_FAILED");
    if(bytesRead===0)break;
    used+=bytesRead;
  }
  if(used>MAX_PREVIEW_BYTES)denied("WORKSPACE_FILE_TOO_LARGE");
  return buffer.subarray(0,used);
}
function createTrustedWorkspacePreviewHost({
  isTrustedRenderer,chooseDirectory,filesystem=fs,writeClipboardText,
}){
  if(typeof isTrustedRenderer!=="function"||typeof chooseDirectory!=="function")
    throw new TypeError("WORKSPACE_HOST_CAPABILITY_REQUIRED");
  const grants=new Map();
  // Native directory enumeration pins the actual directory identity that
  // the user selected, not merely a replaceable path string.
  const directoryIdentities=new Map();
  // A renderer's workspace authority is a lifetime, not merely a window ID.
  // A native picker may complete AFTER revoke/navigation/closure. Invalidate
  // its captured generation so no late chooser response can restore a grant.
  const epochs=new Map();
  const pendingPickers=new Set();
  const currentEpoch=id=>epochs.get(id)??0;
  const clearSender=id=>{
    epochs.set(id,currentEpoch(id)+1);
    grants.delete(id);
    directoryIdentities.delete(id);
  };
  function stillCurrent(event,id,epoch){
    if(currentEpoch(id)!==epoch||event?.sender?.id!==id)return false;
    // webContents can be destroyed or navigated while the OS dialog is open.
    try{return isTrustedRenderer(event)===true;}
    catch{return false;}
  }
  const sender=(event)=>{
    if(!isTrustedRenderer(event))denied("WORKSPACE_UNTRUSTED_RENDERER");
    const id=event?.sender?.id;
    if(!Number.isSafeInteger(id))denied("WORKSPACE_INVALID_SENDER");
    return id;
  };
  async function selectDirectory(event){
    const id=sender(event);
    // Do not let multiple concurrent native dialogs race to replace a grant
    // for one webContents. Other senders retain independent picker lifetimes.
    if(pendingPickers.has(id))denied("WORKSPACE_PICKER_IN_PROGRESS");
    const epoch=currentEpoch(id);
    pendingPickers.add(id);
    try{
      const result=await chooseDirectory(event);
      if(!stillCurrent(event,id,epoch))return {selected:false};
      // Native dialog cancellation never replaces or expands an old grant.
      if(result?.canceled===true||!Array.isArray(result?.filePaths)||
         result.filePaths.length!==1)return {selected:false};
      const selected=result.filePaths[0];
      if(!isSafePathInput(selected))denied("WORKSPACE_INVALID_DIRECTORY");
      const root=await filesystem.realpath(selected);
      if(!stillCurrent(event,id,epoch))return {selected:false};
      const stat=await filesystem.stat(root);
      if(!stillCurrent(event,id,epoch))return {selected:false};
      if(!stat.isDirectory())denied("WORKSPACE_INVALID_DIRECTORY");
      grants.set(id,root);
      directoryIdentities.set(id,stat);
      return {selected:true,name:path.basename(root)};
    }finally{
      pendingPickers.delete(id);
    }
  }
  async function readTextFile(event,request){
    const id=sender(event);
    if(!isValidPreviewRequest(request))denied("WORKSPACE_INVALID_FILE_REQUEST");
    const epoch=currentEpoch(id);
    const root=grants.get(id);
    if(root==null)denied("WORKSPACE_NOT_GRANTED");
    // Resolve the actual canonical path; lexical containment alone is unsafe
    // when subdirectories are symbolic links pointing outside the grant.
    let real;
    try{real=await filesystem.realpath(request.path);}
    catch{denied("WORKSPACE_FILE_UNAVAILABLE");}
    if(!isPathInside(root,real))denied("WORKSPACE_OUTSIDE_GRANT");
    if(!isPreviewableTextFile(real))denied("WORKSPACE_UNSUPPORTED_FILE");
    const checked=await filesystem.stat(real);
    if(!checked.isFile())denied("WORKSPACE_NOT_FILE");
    if(checked.size>MAX_PREVIEW_BYTES)denied("WORKSPACE_FILE_TOO_LARGE");
    // A pathname readFile() would re-open after the canonical path check.
    // Open exactly once and pin the file identity. O_NOFOLLOW blocks a
    // final-component symlink introduced after the initial realpath check
    // on POSIX systems supporting this flag.
    let handle;
    try{
      const flags=fsConstants.O_RDONLY|
        (process.platform!=="win32"?(fsConstants.O_NOFOLLOW??0):0);
      handle=await filesystem.open(real,flags);
    }catch{denied("WORKSPACE_FILE_UNAVAILABLE");}
    let bytes;
    try{
      const opened=await handle.stat();
      if(!opened.isFile())denied("WORKSPACE_NOT_FILE");
      if(opened.size>MAX_PREVIEW_BYTES)denied("WORKSPACE_FILE_TOO_LARGE");
      // A file can be replaced after realpath() and before open().
      // Verify that the open handle still matches a fresh canonical path.
      const afterPath=await filesystem.realpath(real);
      if(afterPath!==real||!isPathInside(root,afterPath))
        denied("WORKSPACE_FILE_CHANGED");
      const afterStat=await filesystem.stat(real);
      if(!isSameFileIdentity(opened,checked)||
         !isSameFileIdentity(opened,afterStat))
        denied("WORKSPACE_FILE_CHANGED");
      if(process.platform==="linux"){
        // Linux /proc/self/fd refers to the ACTUAL opened object, not the
        // replaceable path. This defeats a swapped parent symlink even if
        // it is swapped back before our post-open path check.
        let openedPath;
        try{openedPath=await filesystem.realpath(
          `/proc/self/fd/${handle.fd}`);}
        catch{denied("WORKSPACE_FILE_IDENTITY_UNAVAILABLE");}
        if(openedPath!==real||!isPathInside(root,openedPath))
          denied("WORKSPACE_FILE_CHANGED");
      }
      bytes=await readOpenedText(handle);
    }finally{await handle.close();}
    let text;
    try{text=new TextDecoder("utf-8",{fatal:true}).decode(bytes);}
    catch{denied("WORKSPACE_NOT_UTF8");}
    if(text.includes("\u0000"))denied("WORKSPACE_NOT_TEXT");
    // Reads may also span a thread change or a destroyed renderer. Never
    // deliver stale file contents after a revoked grant, even if IO completed.
    if(!stillCurrent(event,id,epoch)||grants.get(id)!==root)
      denied("WORKSPACE_GRANT_REVOKED");
    return {
      name:path.basename(real),relativePath:path.relative(root,real),
      text,...(request.line===undefined?{}:{line:request.line}),
      ...(request.endLine===undefined?{}:{endLine:request.endLine}),
      readOnly:true,
    };
  }
  /** Original Un -> an lists one directory at a time. We only implement
   * a narrow native fallback under the same explicit per-sender grant:
   * no recursive scans, absolute paths or arbitrary host filesystem APIs. */
  async function listDirectory(event,request){
    const id=sender(event);
    if(!validDirectoryRequest(request))denied("WORKSPACE_INVALID_DIRECTORY_REQUEST");
    const epoch=currentEpoch(id),root=grants.get(id);
    if(root==null)denied("WORKSPACE_NOT_GRANTED");
    const grantedIdentity=directoryIdentities.get(id);
    if(grantedIdentity==null)denied("WORKSPACE_NOT_GRANTED");
    const relative=request.relativePath;
    const candidate=relative===""?root:path.join(root,...relative.split("/"));
    // Explicitly reject symlink/junction components, even those pointing
    // back inside the root. This avoids widening the original grant.
    let walked=root;
    for(const segment of relative===""?[]:relative.split("/")){
      walked=path.join(walked,segment);
      let info;
      try{info=await filesystem.lstat(walked);}
      catch{denied("WORKSPACE_DIRECTORY_UNAVAILABLE");}
      if(info.isSymbolicLink()||!info.isDirectory())
        denied("WORKSPACE_DIRECTORY_UNAVAILABLE");
    }
    let real;
    try{real=await filesystem.realpath(candidate);}
    catch{denied("WORKSPACE_DIRECTORY_UNAVAILABLE");}
    if(real!==root&&!isPathInside(root,real))denied("WORKSPACE_OUTSIDE_GRANT");
    // Reject alias paths even when resolved inside root: the caller must
    // traverse only actual directories owned by the selected tree.
    if(real!==candidate)denied("WORKSPACE_DIRECTORY_CHANGED");
    // Keep the selected grant root pinned even when listing its descendants.
    // A child directory has a DIFFERENT inode from its root by design.
    const currentRoot=await filesystem.stat(root);
    if(!sameDirectoryIdentity(currentRoot,grantedIdentity))
      denied("WORKSPACE_DIRECTORY_CHANGED");
    const before=await filesystem.stat(real);
    if(!before.isDirectory())denied("WORKSPACE_DIRECTORY_UNAVAILABLE");
    let handle;
    try{
      handle=await filesystem.open(real,fsConstants.O_RDONLY|
        (fsConstants.O_DIRECTORY??0)|
        (process.platform!=="win32"?(fsConstants.O_NOFOLLOW??0):0));
    }catch{denied("WORKSPACE_DIRECTORY_UNAVAILABLE");}
    const entries=[];
    let truncated=false;
    try{
      const opened=await handle.stat();
      if(!sameDirectoryIdentity(opened,before))
        denied("WORKSPACE_DIRECTORY_CHANGED");
      if(process.platform==="linux"){
        let openedPath;
        try{openedPath=await filesystem.realpath(`/proc/self/fd/${handle.fd}`);}
        catch{denied("WORKSPACE_DIRECTORY_CHANGED");}
        if(openedPath!==real||!isPathInside(root,openedPath)&&openedPath!==root)
          denied("WORKSPACE_DIRECTORY_CHANGED");
      }
      const iteratorPath=process.platform==="linux"?
        `/proc/self/fd/${handle.fd}`:real;
      let dir;
      try{dir=await filesystem.opendir(iteratorPath);}
      catch{denied("WORKSPACE_DIRECTORY_UNAVAILABLE");}
      try{
        for(let scanned=0;scanned<MAX_DIRECTORY_SCAN;scanned++){
          const entry=await dir.read();
          if(entry==null)break;
          if(scanned===MAX_DIRECTORY_SCAN-1)truncated=true;
          if(entry.name.startsWith(".")||!validRelativePath(entry.name)||
            entry.isSymbolicLink())continue;
          const kind=entry.isDirectory()?"directory":
            entry.isFile()&&isPreviewableTextFile(entry.name)?"file":null;
          if(kind==null)continue;
          if(entries.length>=MAX_DIRECTORY_ENTRIES){truncated=true;break;}
          const child=relative?relative+"/"+entry.name:entry.name;
          entries.push({name:entry.name,relativePath:child,kind});
        }
      }finally{await dir.close();}
      const afterPath=await filesystem.realpath(real);
      const after=await filesystem.stat(real);
      if(afterPath!==real||!sameDirectoryIdentity(opened,after))
        denied("WORKSPACE_DIRECTORY_CHANGED");
    }finally{await handle.close();}
    if(!stillCurrent(event,id,epoch)||grants.get(id)!==root||
      directoryIdentities.get(id)!==grantedIdentity)
      denied("WORKSPACE_GRANT_REVOKED");
    entries.sort((a,b)=>(a.kind==="directory"?0:1)-
      (b.kind==="directory"?0:1)||
      a.name.localeCompare(b.name,undefined,{numeric:true,sensitivity:"base"}));
    return {relativePath:relative,entries,truncated};
  }
  async function readTreeTextFile(event,request){
    const id=sender(event);
    if(!validTreeFileRequest(request))denied("WORKSPACE_INVALID_FILE_REQUEST");
    const root=grants.get(id);
    if(root==null)denied("WORKSPACE_NOT_GRANTED");
    const grantedIdentity=directoryIdentities.get(id);
    const before=await filesystem.stat(root);
    if(!sameDirectoryIdentity(before,grantedIdentity))
      denied("WORKSPACE_DIRECTORY_CHANGED");
    const absolute=path.join(root,...request.relativePath.split("/"));
    const file=await readTextFile(event,{
      path:absolute,
      ...(request.line===undefined?{}:{line:request.line}),
      ...(request.endLine===undefined?{}:{endLine:request.endLine}),
    });
    // A new native selection at the same spelling must not resurrect the
    // earlier directory's read after a root replacement.
    if(grants.get(id)!==root||directoryIdentities.get(id)!==grantedIdentity)
      denied("WORKSPACE_GRANT_REVOKED");
    // The path supplied to a tree row is root-relative and cannot leak the
    // selected host root. Canonical source content remains read-only.
    return file;
  }
  // Original SXo writes a file path without first opening its contents.
  // This is a bounded typed file-path action, never a general clipboard IPC.
  function copyFilePath(event,raw){
    sender(event);
    if(!isSafePathInput(raw))denied("WORKSPACE_INVALID_FILE_REQUEST");
    if(typeof writeClipboardText!=="function")denied("WORKSPACE_CLIPBOARD_UNAVAILABLE");
    writeClipboardText(raw);
    return true;
  }
  // File contents are more sensitive: reuse EXACTLY the existing trusted
  // main-frame, folder-grant, realpath, symlink and size/UTF-8 checks.
  async function copyFileContents(event,request){
    const file=await readTextFile(event,request);
    if(typeof writeClipboardText!=="function")denied("WORKSPACE_CLIPBOARD_UNAVAILABLE");
    writeClipboardText(file.text);
    return true;
  }
  function revoke(event){
    const id=sender(event);
    clearSender(id);
    return true;
  }
  return {selectDirectory,readTextFile,listDirectory,readTreeTextFile,
    copyFilePath,copyFileContents,revoke,clearSender,
    // No method intentionally exposes the granted root to a renderer.
  };
}
module.exports={
  MAX_PREVIEW_BYTES,MAX_DIRECTORY_ENTRIES,validRelativePath,
  validDirectoryRequest,validTreeFileRequest,
  isSafePathInput,isPathInside,isPreviewableTextFile,
  isSameFileIdentity,readOpenedText,
  isValidPreviewRequest,createTrustedWorkspacePreviewHost,
};
