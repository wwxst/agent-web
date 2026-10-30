import {spawn} from "node:child_process";
import {fileURLToPath} from "node:url";
import {resolve} from "node:path";
const cwd=resolve(fileURLToPath(new URL("..",import.meta.url)));
const npm=process.platform==="win32"?"npm.cmd":"npm";
const electron=resolve(cwd,"node_modules",".bin",process.platform==="win32"?"electron.cmd":"electron");
const url="http://127.0.0.1:5173/";
const visualScenario=process.env.AGENT_WEB_VISUAL_SCENARIO;
const appUrl=typeof visualScenario==="string"&&visualScenario.length>0
 ? url+"?visualScenario="+encodeURIComponent(visualScenario)
 : url;
const children=[];
let quitting=false;
function stop(code=0){
 if(quitting)return;
 quitting=true;
 for(const child of children)if(child.exitCode==null)child.kill("SIGTERM");
 process.exitCode=code;
}
process.on("SIGINT",()=>stop(130));
process.on("SIGTERM",()=>stop(143));
const vite=spawn(npm,["run","demo:dev"],{cwd,stdio:"inherit",shell:process.platform==="win32"});
children.push(vite);
vite.on("exit",code=>{if(!quitting)stop(code??1)});
async function waitForVite(){
 for(let attempt=0;attempt<120&&!quitting;attempt++){
  try{
   const response=await fetch(url,{signal:AbortSignal.timeout(800)});
   if(response.ok)return;
  }catch{}
  await new Promise(ok=>setTimeout(ok,300));
 }
 throw new Error("Vite development host is not responding at "+url);
}
try{
 await waitForVite();
 if(!quitting){
  const ui=spawn(electron,["."],{
   cwd,stdio:"inherit",
   shell:process.platform==="win32",
   env:{...process.env,AGENT_WEB_DEV_URL:appUrl},
  });
  children.push(ui);
  ui.on("exit",code=>stop(code??1));
 }
}catch(error){console.error(error);stop(1);}
