"use strict";
/**
 * Independent Electron host persistence for the already-mounted Composer.
 * Original app-primary Hlt/Composer calls controller.getPersistedText(),
 * restoreDraft(...) and preserveComposerDraft via its PRIVATE host store.
 * This is a bounded alternative for demo session IDs, NOT original IPC.
 */
const fs=require("node:fs");
const path=require("node:path");

const DRAFT_FILENAME="agent-web-composer-drafts.json";
const ALLOWED_DEMO_THREADS=Object.freeze(["frontend","review"]);
const MAX_DRAFT_LENGTH=64*1024;
const MAX_STORED_BYTES=160*1024;

function isDemoThread(id){return ALLOWED_DEMO_THREADS.includes(id);}
function isDraft(text){return typeof text==="string" && text.length<=MAX_DRAFT_LENGTH;}
function draftPath(userData){return path.join(userData,DRAFT_FILENAME);}

function readComposerDrafts(userData){
  try{
    const filename=draftPath(userData);
    const stat=fs.statSync(filename);
    if(!stat.isFile()||stat.size>MAX_STORED_BYTES)return {};
    const raw=JSON.parse(fs.readFileSync(filename,"utf8"));
    if(raw==null||raw.version!==1||typeof raw.drafts!=="object"||raw.drafts==null||Array.isArray(raw.drafts))return {};
    const result={};
    for(const key of ALLOWED_DEMO_THREADS){
      if(Object.prototype.hasOwnProperty.call(raw.drafts,key)&&isDraft(raw.drafts[key])){
        result[key]=raw.drafts[key];
      }
    }
    return result;
  }catch{return {};}
}
function writeComposerDraft(userData,threadId,text){
  if(!isDemoThread(threadId)||!isDraft(text))return false;
  const next=readComposerDrafts(userData);
  if(text.length===0)delete next[threadId];
  else next[threadId]=text;
  const filename=draftPath(userData);
  const temp=filename+"."+process.pid+".tmp";
  try{
    fs.mkdirSync(userData,{recursive:true,mode:0o700});
    fs.writeFileSync(temp,JSON.stringify({version:1,drafts:next}),{encoding:"utf8",mode:0o600,flag:"w"});
    fs.renameSync(temp,filename);
    return true;
  }catch{
    try{fs.unlinkSync(temp);}catch{}
    return false;
  }
}
module.exports={
  DRAFT_FILENAME,MAX_DRAFT_LENGTH,isDemoThread,isDraft,
  readComposerDrafts,writeComposerDraft,
};
