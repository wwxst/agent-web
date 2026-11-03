"use strict";
/**
 * Independent one-shot Agent CIL --print bridge, NOT Codex's private IPC.
 * The Electron host selects both CLI entry and user-authorized workspace.
 * There is no generic command, model-option, tool or approval RPC.
 */
const fs=require("node:fs");
const path=require("node:path");
const {spawn:nodeSpawn}=require("node:child_process");
const {StringDecoder}=require("node:string_decoder");

const MAX_PROMPT_CHARS=16384;
const MAX_STDOUT_BYTES=1024*1024;
const MAX_STDERR_BYTES=16*1024;
const TIMEOUT_MS=5*60*1000;
const CANCEL_GRACE_MS=3000;
const REQUEST_ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function safeAgentCilEntry(entry){
  if(typeof entry!=="string"||!path.isAbsolute(entry))return null;
  try{
    const real=fs.realpathSync.native(entry);
    return fs.statSync(real).isFile()?real:null;
  }catch{return null;}
}
function createAgentCilPrintBridge({
  cliEntry,spawnImpl=nodeSpawn,nodeExecutable=process.execPath,
  env=process.env,maxOutputBytes=MAX_STDOUT_BYTES,runTimeoutMs=TIMEOUT_MS,
  killGraceMs=CANCEL_GRACE_MS,
}={}){
  const entry=safeAgentCilEntry(cliEntry);
  const active=new Map();
  const ready=()=>entry!==null;
  function finish(owner,run,code,errorCode){
    if(run.done)return;
    run.done=true;
    if(run.timer)clearTimeout(run.timer);
    if(run.killTimer)clearTimeout(run.killTimer);
    active.delete(owner);
    run.send({type:"finished",requestId:run.requestId,
      exitCode:Number.isInteger(code)?code:null,
      cancelled:run.cancelled,errorCode:errorCode??(run.cancelled?"CANCELLED":code===0?null:"CLI_EXIT_NONZERO")});
  }
  function cancel(owner,requestId){
    const run=active.get(owner);
    if(!run||run.done||run.requestId!==requestId)return false;
    run.cancelled=true;
    try{run.child.kill("SIGINT");}catch{/* handled by forced shutdown */}
    if(!run.killTimer)run.killTimer=setTimeout(()=>{
      if(run.done)return;
      try{run.child.kill("SIGKILL");}catch{/* already exited */}
    },killGraceMs);
    return true;
  }
  function start({owner,requestId,prompt,workspace,send}){
    if(!ready())throw Object.assign(new Error("Agent CIL CLI not installed."),{code:"AGENT_CIL_UNAVAILABLE"});
    if(typeof owner!=="number"||!Number.isSafeInteger(owner)||owner<1)
      throw Object.assign(new TypeError("Invalid owner."),{code:"AGENT_CIL_INVALID_OWNER"});
    if(typeof requestId!=="string"||!REQUEST_ID.test(requestId))
      throw Object.assign(new TypeError("Invalid correlation ID."),{code:"AGENT_CIL_INVALID_REQUEST"});
    if(typeof prompt!=="string"||!prompt.trim()||prompt.length>MAX_PROMPT_CHARS||
      /[\u0000]/u.test(prompt))
      throw Object.assign(new TypeError("Invalid prompt."),{code:"AGENT_CIL_INVALID_PROMPT"});
    if(typeof workspace!=="string"||!path.isAbsolute(workspace)||
      !fs.statSync(workspace).isDirectory())
      throw Object.assign(new TypeError("Invalid workspace."),{code:"AGENT_CIL_INVALID_WORKSPACE"});
    if(typeof send!=="function")throw new TypeError("send callback required");
    if(active.has(owner))throw Object.assign(new Error("A turn is already running."),{code:"AGENT_CIL_BUSY"});
    // Fixed argv; the prompt is sent over stdin, never interpolated into a
    // shell command, extra CLI switches or a process-list-visible argv field.
    const child=spawnImpl(nodeExecutable,[entry,"--print","--cwd",workspace],{
      cwd:workspace,env:{...env,ELECTRON_RUN_AS_NODE:"1"},
      stdio:["pipe","pipe","pipe"],shell:false,windowsHide:true,
    });
    const run={child,requestId,send,done:false,cancelled:false,
      timer:null,killTimer:null,stdoutBytes:0,stderrBytes:0,decoder:new StringDecoder("utf8")};
    active.set(owner,run);
    child.on("error",()=>finish(owner,run,null,"CLI_SPAWN_FAILED"));
    child.stdout.on("data",chunk=>{
      if(run.done)return;
      run.stdoutBytes+=chunk.length;
      if(run.stdoutBytes>maxOutputBytes){
        try{child.kill("SIGKILL");}catch{}
        finish(owner,run,null,"CLI_OUTPUT_LIMIT");
        return;
      }
      const text=run.decoder.write(chunk);
      if(text)send({type:"delta",requestId,text});
    });
    child.stderr.on("data",chunk=>{
      run.stderrBytes+=chunk.length;
      // Do not send raw stderr to an unprivileged renderer.
      if(run.stderrBytes>MAX_STDERR_BYTES)run.stderrBytes=MAX_STDERR_BYTES;
    });
    child.on("close",code=>{
      if(run.done)return;
      const trailing=run.decoder.end();
      if(trailing)send({type:"delta",requestId,text:trailing});
      finish(owner,run,code);
    });
    run.timer=setTimeout(()=>{
      if(run.done)return;
      try{child.kill("SIGKILL");}catch{}
      finish(owner,run,null,"CLI_TIMEOUT");
    },runTimeoutMs);
    send({type:"started",requestId});
    child.stdin.on("error",()=>{/* the exit event settles the run */});
    child.stdin.end(prompt,"utf8");
    return {accepted:true,requestId};
  }
  function close(){
    for(const [owner,run] of [...active]){
      cancel(owner,run.requestId);
      try{run.child.kill("SIGKILL");}catch{}
      finish(owner,run,null,"CLI_HOST_CLOSED");
    }
  }
  return Object.freeze({ready,start,cancel,close,activeCount:()=>active.size});
}
module.exports={createAgentCilPrintBridge,safeAgentCilEntry,MAX_PROMPT_CHARS};
