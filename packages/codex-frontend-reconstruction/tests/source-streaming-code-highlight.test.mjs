import test from "node:test";
import assert from "node:assert/strict";
import {
  createSourceStreamingCodeHighlightController,
  projectSourceStreamingCodeHighlight,
  SOURCE_STREAMING_CODE_HIGHLIGHT_DELAY_MS,
} from "../build/SourceStreamingCodeHighlight.js";

function harness(){
  let counter=0;
  const callbacks=new Map();
  const calls=[];
  const scheduler={
    schedule(callback,delay){
      assert.equal(delay,500);
      const id=++counter;
      callbacks.set(id,callback);
      return id;
    },
    cancel(id){callbacks.delete(id);},
  };
  const highlight=async(code,language)=>{
    calls.push({code,language});
    return {highlighted:true,segments:[
      {className:"text-codex-syntax-keyword",text:code.slice(0,Math.min(5,code.length))},
      ...(code.length>5?[{className:null,text:code.slice(5)}]:[]),
    ]};
  };
  const tick=async()=>{await Promise.resolve();await Promise.resolve();};
  const fire=async()=>{
    const pending=[...callbacks.entries()];
    callbacks.clear();
    for(const [,callback] of pending)callback();
    await tick();
  };
  return {scheduler,highlight,calls,callbacks,tick,fire};
}
test("source Bt: 500ms append throttle retains highlighted prefix plus raw tail",async()=>{
  const h=harness();
  const controller=createSourceStreamingCodeHighlightController(h);
  const changed=[];
  const off=controller.subscribe(()=>changed.push(controller.getSnapshot().code));
  controller.setInput("const x=1;","typescript",true);
  await h.tick();
  assert.equal(controller.getSnapshot().code,"const x=1;");
  controller.setInput("const x=1; console.log(x);","typescript",true);
  assert.equal(h.callbacks.size,1);
  assert.equal(h.calls.length,1,"append must not parse ahead of timeout");
  const waiting=projectSourceStreamingCodeHighlight(
    "const x=1; console.log(x);",controller.getSnapshot());
  assert.equal(waiting.pending,true);
  assert.equal(waiting.segments.map(x=>x.text).join(""),"const x=1; console.log(x);");
  assert.equal(waiting.segments[0].className,"text-codex-syntax-keyword");
  assert.equal(waiting.segments.at(-1).className,null);
  controller.setInput("const x=1; console.log(x); // extra","typescript",true);
  assert.equal(h.callbacks.size,1,"second fast append must not start another timer");
  await h.fire();
  assert.equal(controller.getSnapshot().code,"const x=1; console.log(x); // extra");
  assert.equal(h.calls.length,2);
  assert.equal(h.calls[1].code,"const x=1; console.log(x); // extra");
  assert.equal(controller.getSnapshot().highlightedSegments.map(p=>p.text).join(""),
    "const x=1; console.log(x); // extra");
  assert.equal(projectSourceStreamingCodeHighlight(
    controller.getSnapshot().code,controller.getSnapshot()).pending,false);
  assert.ok(changed.includes("const x=1;"));
  off();
  controller.dispose();
});
test("source Bt: terminal completion and non-append edits parse immediately and cancel timer",async()=>{
  const h=harness();
  const store=createSourceStreamingCodeHighlightController(h);
  const off=store.subscribe(()=>{});
  store.setInput("const a=1;","ts",true);
  await h.tick();
  store.setInput("const a=1; // new","ts",true);
  assert.equal(h.callbacks.size,1);
  store.setInput("const a=1; // new","ts",false);
  assert.equal(h.callbacks.size,0);
  await h.tick();
  assert.equal(store.getSnapshot().code,"const a=1; // new");
  store.setInput("let b=2;","ts",true);
  await h.tick();
  assert.equal(store.getSnapshot().code,"let b=2;");
  store.setInput("let b=2;","python",true);
  await h.tick();
  assert.equal(h.calls.at(-1).language,"python");
  assert.equal(store.getSnapshot().language,"python");
  assert.equal(projectSourceStreamingCodeHighlight(
    "entirely different",store.getSnapshot()).segments
    .map(p=>p.text).join(""),"entirely different");
  off();store.dispose();
});
test("source Bt: stale async grammar requests cannot overwrite newer language or post-dispose state",async()=>{
  let pending=[];
  const parse=(code,language)=>new Promise(resolve=>pending.push({code,language,resolve}));
  const h=harness();
  const store=createSourceStreamingCodeHighlightController({scheduler:h.scheduler,highlight:parse});
  const events=[];
  const off=store.subscribe(()=>events.push(store.getSnapshot().code));
  store.setInput("const old=1;","ts",true);
  store.setInput("print('new')","python",true);
  assert.equal(pending.length,2);
  pending[1].resolve({segments:[{className:"text-codex-syntax-string",text:"print('new')"}],highlighted:true});
  await h.tick();
  pending[0].resolve({segments:[{className:null,text:"const old=1;"}],highlighted:false});
  await h.tick();
  assert.equal(store.getSnapshot().code,"print('new')");
  assert.deepEqual(events,["print('new')"]);
  store.setInput("print('new') # appended","python",true);
  assert.equal(h.callbacks.size,1);
  off();
  assert.equal(h.callbacks.size,0,"last subscription teardown must cancel scheduled parse");
  store.dispose();
  await h.fire();
  assert.deepEqual(events,["print('new')"]);
});
test("source Ht prefix guard never attaches old token spans to replacement input",()=>{
  const snapshot={
    code:"const a;",language:"ts",
    highlightedSegments:[{className:"text-codex-syntax-keyword",text:"const"},
      {className:null,text:" a;"}],
    highlighted:true,pending:false,
  };
  assert.deepEqual(projectSourceStreamingCodeHighlight("let b;",snapshot),{
    segments:[{className:null,text:"let b;"}],pending:true,
  });
  assert.equal(SOURCE_STREAMING_CODE_HIGHLIGHT_DELAY_MS,500);
});
