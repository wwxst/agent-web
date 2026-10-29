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
const path=require("node:path");
const {TextDecoder}=require("node:util");
const MAX_PREVIEW_BYTES=1024*1024;
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
    Object.keys(input).every(k=>["path","line"].includes(k))&&
    Object.hasOwn(input,"path")&&isSafePathInput(input.path)&&
    (input.line===undefined||(Number.isSafeInteger(input.line)&&
      input.line>=1&&input.line<=10000000));
}
function createTrustedWorkspacePreviewHost({
  isTrustedRenderer,chooseDirectory,filesystem=fs,
}){
  if(typeof isTrustedRenderer!=="function"||typeof chooseDirectory!=="function")
    throw new TypeError("WORKSPACE_HOST_CAPABILITY_REQUIRED");
  const grants=new Map();
  const sender=(event)=>{
    if(!isTrustedRenderer(event))denied("WORKSPACE_UNTRUSTED_RENDERER");
    const id=event?.sender?.id;
    if(!Number.isSafeInteger(id))denied("WORKSPACE_INVALID_SENDER");
    return id;
  };
  async function selectDirectory(event){
    const id=sender(event);
    const result=await chooseDirectory(event);
    // Native dialog cancellation never replaces or expands an old grant.
    if(result?.canceled===true||!Array.isArray(result?.filePaths)||
       result.filePaths.length!==1)return {selected:false};
    const selected=result.filePaths[0];
    if(!isSafePathInput(selected))denied("WORKSPACE_INVALID_DIRECTORY");
    const root=await filesystem.realpath(selected);
    const stat=await filesystem.stat(root);
    if(!stat.isDirectory())denied("WORKSPACE_INVALID_DIRECTORY");
    grants.set(id,root);
    return {selected:true,name:path.basename(root)};
  }
  async function readTextFile(event,request){
    const id=sender(event);
    if(!isValidPreviewRequest(request))denied("WORKSPACE_INVALID_FILE_REQUEST");
    const root=grants.get(id);
    if(root==null)denied("WORKSPACE_NOT_GRANTED");
    // Resolve the actual canonical path; lexical containment alone is unsafe
    // when subdirectories are symbolic links pointing outside the grant.
    let real;
    try{real=await filesystem.realpath(request.path);}
    catch{denied("WORKSPACE_FILE_UNAVAILABLE");}
    if(!isPathInside(root,real))denied("WORKSPACE_OUTSIDE_GRANT");
    if(!isPreviewableTextFile(real))denied("WORKSPACE_UNSUPPORTED_FILE");
    const stat=await filesystem.stat(real);
    if(!stat.isFile())denied("WORKSPACE_NOT_FILE");
    if(stat.size>MAX_PREVIEW_BYTES)denied("WORKSPACE_FILE_TOO_LARGE");
    // Byte limit is checked again after read: stat may be stale.
    const bytes=await filesystem.readFile(real);
    if(bytes.length>MAX_PREVIEW_BYTES)denied("WORKSPACE_FILE_TOO_LARGE");
    let text;
    try{text=new TextDecoder("utf-8",{fatal:true}).decode(bytes);}
    catch{denied("WORKSPACE_NOT_UTF8");}
    if(text.includes("\u0000"))denied("WORKSPACE_NOT_TEXT");
    return {
      name:path.basename(real),relativePath:path.relative(root,real),
      text,...(request.line===undefined?{}:{line:request.line}),
      readOnly:true,
    };
  }
  function revoke(event){
    const id=sender(event);
    grants.delete(id);
    return true;
  }
  function clearSender(id){grants.delete(id);}
  return {selectDirectory,readTextFile,revoke,clearSender,
    // No method intentionally exposes the granted root to a renderer.
  };
}
module.exports={
  MAX_PREVIEW_BYTES,isSafePathInput,isPathInside,isPreviewableTextFile,
  isValidPreviewRequest,createTrustedWorkspacePreviewHost,
};
