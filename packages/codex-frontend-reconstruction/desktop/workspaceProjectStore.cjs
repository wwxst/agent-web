"use strict";
const fs=require("node:fs");
const path=require("node:path");
const {randomUUID}=require("node:crypto");

const WORKSPACE_PROJECTS_FILENAME="agent-web-workspace-projects.json";
const MAX_WORKSPACE_PROJECTS=100;
const MAX_STORE_BYTES=512*1024;
const INVALID_STORE=()=>Object.assign(new Error("WORKSPACE_PROJECT_STORE_INVALID"),{code:"WORKSPACE_PROJECT_STORE_INVALID"});

function isRecord(value){
  return value!=null&&typeof value==="object"&&!Array.isArray(value)&&
    (Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null);
}
function validText(value,max){
  return typeof value==="string"&&value.length>0&&value.length<=max&&
    !/[\u0000-\u001f\u007f]/u.test(value);
}
function validProjectId(value){
  return typeof value==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
}
function validTimestamp(value){
  return value===null||typeof value==="string"&&value.length<=40&&
    Number.isFinite(Date.parse(value));
}
function validStoredProject(project){
  return isRecord(project)&&Object.keys(project).every(key=>
    ["id","name","path","device","inode","createdAt","lastOpenedAt"].includes(key))&&
    Object.keys(project).length===7&&validProjectId(project.id)&&
    validText(project.name,128)&&validText(project.path,4096)&&
    path.isAbsolute(project.path)&&validText(project.device,128)&&
    validText(project.inode,128)&&validTimestamp(project.createdAt)&&
    typeof project.createdAt==="string"&&validTimestamp(project.lastOpenedAt);
}
function storePath(userData){
  if(typeof userData!=="string"||!path.isAbsolute(userData))
    throw new TypeError("WORKSPACE_PROJECT_STORE_PATH_INVALID");
  return path.join(userData,WORKSPACE_PROJECTS_FILENAME);
}
function readWorkspaceProjects(userData,{filesystem=fs}={}){
  const filename=storePath(userData);
  let stat;
  try{stat=filesystem.lstatSync(filename);}
  catch(error){if(error?.code==="ENOENT")return [];throw error;}
  if(!stat.isFile()||stat.isSymbolicLink()||stat.size>MAX_STORE_BYTES)throw INVALID_STORE();
  let parsed;
  try{parsed=JSON.parse(filesystem.readFileSync(filename,"utf8"));}
  catch{throw INVALID_STORE();}
  if(!isRecord(parsed)||parsed.version!==1||!Array.isArray(parsed.projects)||
    parsed.projects.length>MAX_WORKSPACE_PROJECTS)throw INVALID_STORE();
  const ids=new Set(),paths=new Set(),identities=new Set();
  for(const project of parsed.projects){
    if(!validStoredProject(project)||ids.has(project.id))throw INVALID_STORE();
    const canonical=process.platform==="win32"?project.path.toLowerCase():project.path;
    const identity=project.device+":"+project.inode;
    if(paths.has(canonical)||identities.has(identity))throw INVALID_STORE();
    ids.add(project.id);paths.add(canonical);identities.add(identity);
  }
  return parsed.projects.map(project=>({...project}));
}
function writeWorkspaceProjects(userData,projects,{filesystem=fs}={}){
  if(!Array.isArray(projects)||projects.length>MAX_WORKSPACE_PROJECTS||
    projects.some(project=>!validStoredProject(project)))throw INVALID_STORE();
  const filename=storePath(userData);
  const temporary=filename+"."+process.pid+"."+randomUUID()+".tmp";
  filesystem.mkdirSync(userData,{recursive:true,mode:0o700});
  let descriptor;
  try{
    descriptor=filesystem.openSync(temporary,"wx",0o600);
    filesystem.writeFileSync(descriptor,JSON.stringify({version:1,projects}),"utf8");
    filesystem.fsyncSync(descriptor);
    filesystem.closeSync(descriptor);descriptor=undefined;
    filesystem.renameSync(temporary,filename);
    try{filesystem.chmodSync(filename,0o600);}catch{}
  }catch(error){
    if(descriptor!==undefined)try{filesystem.closeSync(descriptor);}catch{}
    try{filesystem.unlinkSync(temporary);}catch{}
    throw error;
  }
}
function canonicalDirectory(selectedPath,{filesystem=fs,platform=process.platform}={}){
  if(!validText(selectedPath,4096)||!path.isAbsolute(selectedPath))
    throw Object.assign(new Error("WORKSPACE_PROJECT_DIRECTORY_INVALID"),{code:"WORKSPACE_PROJECT_DIRECTORY_INVALID"});
  let canonical,stat;
  try{
    canonical=filesystem.realpathSync(selectedPath);
    stat=filesystem.statSync(canonical);
  }catch{
    throw Object.assign(new Error("WORKSPACE_PROJECT_DIRECTORY_UNAVAILABLE"),{code:"WORKSPACE_PROJECT_DIRECTORY_UNAVAILABLE"});
  }
  if(!stat.isDirectory())throw Object.assign(new Error("WORKSPACE_PROJECT_DIRECTORY_INVALID"),{code:"WORKSPACE_PROJECT_DIRECTORY_INVALID"});
  const device=String(stat.dev),inode=String(stat.ino);
  if(!device||!inode||inode==="0")
    throw Object.assign(new Error("WORKSPACE_PROJECT_IDENTITY_UNAVAILABLE"),{code:"WORKSPACE_PROJECT_IDENTITY_UNAVAILABLE"});
  let name=path.basename(canonical)||canonical;
  name=name.replace(/[\u0000-\u001f\u007f]/gu,"").slice(0,128)||"Workspace";
  return {path:canonical,name,device,inode};
}
function sameCanonicalPath(left,right,platform=process.platform){
  const a=path.resolve(left),b=path.resolve(right);
  return platform==="win32"?a.toLowerCase()===b.toLowerCase():a===b;
}
function addWorkspaceProject(userData,selectedPath,{filesystem=fs,clock=()=>new Date().toISOString(),platform=process.platform}={}){
  const directory=canonicalDirectory(selectedPath,{filesystem,platform});
  const projects=readWorkspaceProjects(userData,{filesystem});
  const existing=projects.find(project=>
    sameCanonicalPath(project.path,directory.path,platform)||
    project.device===directory.device&&project.inode===directory.inode);
  if(existing)return {project:{...existing},created:false};
  if(projects.length>=MAX_WORKSPACE_PROJECTS)
    throw Object.assign(new Error("WORKSPACE_PROJECT_LIMIT_REACHED"),{code:"WORKSPACE_PROJECT_LIMIT_REACHED"});
  const now=clock();
  if(typeof now!=="string"||!Number.isFinite(Date.parse(now)))
    throw new TypeError("WORKSPACE_PROJECT_CLOCK_INVALID");
  const project={
    id:randomUUID(),name:directory.name,path:directory.path,
    device:directory.device,inode:directory.inode,
    createdAt:now,lastOpenedAt:now,
  };
  const next=[...projects,project];
  writeWorkspaceProjects(userData,next,{filesystem});
  return {project:{...project},created:true};
}
function getWorkspaceProject(userData,id,options){
  if(!validProjectId(id))return null;
  return readWorkspaceProjects(userData,options).find(project=>project.id===id)??null;
}
function listWorkspaceProjects(userData,options){
  return readWorkspaceProjects(userData,options).map(({id,name,createdAt,lastOpenedAt})=>({
    id,name,createdAt,lastOpenedAt,
  }));
}
function markWorkspaceProjectOpened(userData,id,{filesystem=fs,clock=()=>new Date().toISOString()}={}){
  if(!validProjectId(id))return false;
  const projects=readWorkspaceProjects(userData,{filesystem});
  const index=projects.findIndex(project=>project.id===id);
  if(index<0)return false;
  const now=clock();
  if(typeof now!=="string"||!Number.isFinite(Date.parse(now)))
    throw new TypeError("WORKSPACE_PROJECT_CLOCK_INVALID");
  projects[index]={...projects[index],lastOpenedAt:now};
  writeWorkspaceProjects(userData,projects,{filesystem});
  return true;
}
function removeWorkspaceProject(userData,id,{filesystem=fs}={}){
  if(!validProjectId(id))return false;
  const projects=readWorkspaceProjects(userData,{filesystem});
  const next=projects.filter(project=>project.id!==id);
  if(next.length===projects.length)return false;
  writeWorkspaceProjects(userData,next,{filesystem});
  return true;
}
module.exports={
  WORKSPACE_PROJECTS_FILENAME,MAX_WORKSPACE_PROJECTS,MAX_STORE_BYTES,
  validProjectId,validStoredProject,readWorkspaceProjects,writeWorkspaceProjects,
  canonicalDirectory,addWorkspaceProject,getWorkspaceProject,listWorkspaceProjects,
  markWorkspaceProjectOpened,removeWorkspaceProject,
};
