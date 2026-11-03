import test from "node:test";
import assert from "node:assert/strict";
import {existsSync} from "node:fs";
import {mkdtemp,readdir,readFile,rm} from "node:fs/promises";
import {createServer} from "node:http";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {_electron as electron} from "playwright";

const frontendRoot=resolve(fileURLToPath(new URL("..",import.meta.url)));
const repoRoot=resolve(frontendRoot,"../..");
const agentCilEntry=join(repoRoot,"agent-cil","packages","cli","src","index.js");
const mandatory=process.env.AGENT_CIL_REQUIRE_REAL_RUNTIME==="1";
const executablePath=resolve(frontendRoot,"node_modules","electron","dist",
  process.platform==="win32"?"electron.exe":
    process.platform==="darwin"?"Electron.app/Contents/MacOS/Electron":"electron");

const sse=(type,data={})=>
  "event: "+type+"\ndata: "+JSON.stringify({type,...data})+"\n\n";

test("actual Agent CIL CLI and AgentLoop stream through native Electron into React",{
  timeout:120000,
  skip:!existsSync(agentCilEntry)&&!mandatory
    ?"Agent CIL checkout not present; explicit CI checkout is required":false,
},async()=>{
  assert.ok(existsSync(agentCilEntry),"Pinned agent-cil checkout must be installed for real runtime test");
  const profile=await mkdtemp(join(tmpdir(),"agent-web-real-cli-profile-"));
  const workspace=await mkdtemp(join(tmpdir(),"agent-web-real-cli-workspace-"));
  const prompt="Verify the actual independent Agent CIL runtime integration.";
  const response="AGENT_CIL_REAL_RUNTIME_OK";
  const requests=[];
  const server=createServer(async(req,res)=>{
    try{
      const buffers=[];
      for await(const chunk of req)buffers.push(chunk);
      requests.push({
        path:req.url,
        body:JSON.parse(Buffer.concat(buffers).toString("utf8")),
      });
      res.writeHead(200,{"content-type":"text/event-stream","cache-control":"no-cache"});
      res.end(
        sse("message_start",{message:{usage:{input_tokens:20}}})+
        sse("content_block_start",{index:0,content_block:{type:"text",text:""}})+
        sse("content_block_delta",{index:0,delta:{type:"text_delta",text:response}})+
        sse("content_block_stop",{index:0})+
        sse("message_delta",{delta:{stop_reason:"end_turn"},usage:{output_tokens:9}})+
        sse("message_stop"),
      );
    }catch(error){
      res.writeHead(500,{"content-type":"text/plain"});
      res.end("invalid fixture request");
    }
  });
  let app;
  try{
    await new Promise((resolveListen,reject)=>{
      server.once("error",reject);
      server.listen(0,"127.0.0.1",resolveListen);
    });
    const port=server.address().port;
    app=await electron.launch({
      executablePath,
      args:[".",...(process.platform==="linux"&&process.env.CI?["--no-sandbox"]:[])],
      cwd:frontendRoot,
      env:{...process.env,AGENT_WEB_DEV_URL:"",AGENT_WEB_DESKTOP_FIXTURE:"",
        AGENT_WEB_USER_DATA_DIR:profile,AGENT_CIL_ENTRY:agentCilEntry,
        ANTHROPIC_API_KEY:"local-fixture-credential-not-for-real-services",
        ANTHROPIC_BASE_URL:"http://127.0.0.1:"+port+"/anthropic",
        ELECTRON_DISABLE_SECURITY_WARNINGS:"true",
      },
      timeout:40000,
    });
    const page=await app.firstWindow();
    await page.locator('[data-app-shell-frame="true"]').waitFor({timeout:20000});
    const info=await page.evaluate(()=>window.agentWebDesktopHost.getHostInfo());
    assert.equal(info.backendConnected,false,"test provider does not establish production connectivity");
    assert.equal(info.agentCilAvailable,true,"actual CLI entry must be available");
    await app.evaluate(({dialog},directory)=>{
      dialog.showOpenDialog=async()=>({canceled:false,filePaths:[directory]});
    },workspace);
    await page.locator('[data-app-action-sidebar-section-key="projects"] .demo-sidebar-section__header').hover();
    await page.getByRole("button",{name:"Add new project"}).click();
    await page.locator('[data-app-action-sidebar-select-project][aria-current="page"]')
      .waitFor({state:"visible",timeout:15000});
    await page.getByRole("textbox",{name:"Do anything"}).fill(prompt);
    await page.getByTestId("send-button").click();
    await page.getByText(response,{exact:false}).waitFor({state:"visible",timeout:35000});
    await page.getByText(/单轮请求已完成/).waitFor({state:"visible",timeout:20000});
    assert.equal(requests.length,1,"actual AgentLoop must issue one model request");
    const request=requests[0].body;
    assert.ok(Array.isArray(request.messages));
    assert.ok(request.messages.some(message=>message.role==="user"&&
      (typeof message.content==="string"
        ?message.content.includes(prompt)
        :JSON.stringify(message.content).includes(prompt))),
    "CLI must pass the real user message to its model gateway");
    const sessions=await readdir(join(workspace,".agent-cil","sessions"));
    assert.equal(sessions.length,1,"actual CLI must create one durable session");
    const journal=await readFile(join(workspace,".agent-cil","sessions",sessions[0],
      "transcript.jsonl"),"utf8");
    const commits=journal.trim().split("\n").map(line=>JSON.parse(line));
    assert.ok(commits.some(commit=>commit.kind==="input"),"real CLI must persist the user input");
    assert.ok(commits.some(commit=>commit.kind==="finished"),"real CLI must persist the completed turn");
    assert.equal(await page.getByText(/模拟回复/).count(),0);
  }finally{
    if(app)await app.close();
    server.closeAllConnections?.();
    if(server.listening)await new Promise(resolveClose=>server.close(resolveClose));
    await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});
    await rm(workspace,{recursive:true,force:true,maxRetries:5,retryDelay:100});
  }
});
