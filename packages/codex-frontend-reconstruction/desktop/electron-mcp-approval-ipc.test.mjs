import test from "node:test";
import assert from "node:assert/strict";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {_electron as electron} from "playwright";

const root=resolve(fileURLToPath(new URL("..",import.meta.url)));
const executablePath=resolve(root,"node_modules","electron","dist",
 process.platform==="win32"?"electron.exe":
 process.platform==="darwin"?"Electron.app/Contents/MacOS/Electron":"electron");

test("real context-isolated Electron preload routes MCP reply into trusted main IPC and fails closed",{
 timeout:90000,
},async()=>{
 const app=await electron.launch({
  executablePath,
  args:[".",...(process.platform==="linux"&&process.env.CI?["--no-sandbox"]:[])],
  cwd:root,env:{...process.env,AGENT_WEB_DEV_URL:"",
    ELECTRON_DISABLE_SECURITY_WARNINGS:"true"},
  timeout:40000,
 });
 try{
  const page=await app.firstWindow();
  await page.locator('[aria-label="演示会话导航"]').waitFor({timeout:20000});
  const observation=await page.evaluate(async()=>{
   const host=window.agentWebDesktopHost;
   const payload={
     hostId:"demo-host",conversationId:"frontend",
     requestId:"mcp-approval:integration-1",
     response:{decision:"accept",persist:"session"},
   };
   const reject=async argument=>{
     try{await host.replyToMcpApproval(argument);return "UNEXPECTED_SUCCESS";}
     catch(error){return String(error);}
   };
   return {
     backendConnected:(await host.getHostInfo()).backendConnected,
     hasReply:typeof host.replyToMcpApproval,
     nodeType:typeof window.require,
     invalid:await reject({...payload,requestId:""}),
     invalidScope:await reject({...payload,response:{decision:"decline",persist:"always"}}),
     valid:await reject(payload),
     decline:await reject({...payload,response:{decision:"decline"}}),
   };
  });
  assert.equal(observation.backendConnected,false);
  assert.equal(observation.nodeType,"undefined");
  assert.equal(observation.hasReply,"function");
  assert.match(observation.invalid,/MCP_INVALID_REPLY/);
  assert.match(observation.invalidScope,/MCP_INVALID_REPLY/);
  assert.match(observation.valid,/MCP_BACKEND_UNAVAILABLE/,
    "a real preload-to-main invocation must explicitly reject without verified backend");
  assert.match(observation.decline,/MCP_BACKEND_UNAVAILABLE/,
    "even a denial still requires delivery to a real backend");
 }finally{await app.close();}
});
