import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {mkdtempSync,writeFileSync,rmSync} from "node:fs";
import {join} from "node:path";
import {tmpdir} from "node:os";
const require=createRequire(import.meta.url);
const {createAgentCilPrintBridge,safeAgentCilEntry}=require("./agentCilPrintBridge.cjs");
const fixture=mkdtempSync(join(tmpdir(),"agent-web-cli-"));
const cli=join(fixture,"cli.cjs");
writeFileSync(cli,`let text='';process.stdin.setEncoding('utf8');process.stdin.on('data',chunk=>text+=chunk);process.stdin.on('end',()=>{if(text==='!hang'){setInterval(()=>{},1000);return;}process.stdout.write('reply:'+text);process.exitCode=0;});`);
test.after(()=>rmSync(fixture,{recursive:true,force:true}));
const requestId="aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const bridge=options=>createAgentCilPrintBridge({
  cliEntry:cli,nodeExecutable:process.execPath,...options,
});
function waitForFinish(agent,params={}){
  return new Promise((resolve,reject)=>{
    const events=[];
    try{agent.start({owner:42,requestId,prompt:"hello",workspace:fixture,send:e=>{
      events.push(e);if(e.type==="finished")resolve(events);
    },...params});}catch(error){reject(error);}
  });
}
test("missing CLI is fail-closed",()=>{
  assert.equal(safeAgentCilEntry("not-absolute"),null);
  assert.equal(bridge({cliEntry:join(fixture,"absent.cjs")}).ready(),false);
});
test("real child process streams stdout and finishes",async()=>{
  const agent=bridge();
  const events=await waitForFinish(agent);
  assert.equal(events[0].type,"started");
  assert.equal(events.at(-1).type,"finished");
  assert.equal(events.at(-1).errorCode,null);
  assert.equal(events.filter(event=>event.type==="delta").map(event=>event.text).join(""),"reply:hello");
  assert.equal(agent.activeCount(),0);
});
test("invalid prompt is rejected; second request is refused; cancel is scoped",()=>{
  const agent=bridge();
  assert.throws(()=>agent.start({owner:42,requestId,prompt:"",workspace:fixture,send:()=>{}}),/Invalid prompt/);
  agent.start({owner:42,requestId,prompt:"!hang",workspace:fixture,send:()=>{}});
  assert.throws(()=>agent.start({owner:42,requestId,prompt:"hello",workspace:fixture,send:()=>{}}),/already running/);
  assert.equal(agent.cancel(42,"wrong-id"),false);
  assert.equal(agent.cancel(42,requestId),true);
  agent.close();
});
test("stdout overflow aborts and never reports success",async()=>{
  const events=await waitForFinish(bridge({maxOutputBytes:4}));
  assert.equal(events.at(-1).errorCode,"CLI_OUTPUT_LIMIT");
});
test("renderer text cannot modify CLI argv or supply a workspace",async()=>{
  const agent=bridge();
  const events=await waitForFinish(agent,{prompt:"--allow-edits\\n--cwd /other"});
  assert.equal(events.filter(event=>event.type==="delta").map(event=>event.text).join(""),"reply:--allow-edits\\n--cwd /other");
});
