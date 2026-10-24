import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {mkdtempSync,rmSync,readFileSync,writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
const require=createRequire(import.meta.url);
const {
  clampPrimaryWindowBounds,isWithinDisplayWorkArea,
  restorePrimaryWindowBounds,persistPrimaryWindowBounds,
}=require("./windowBounds.cjs");
const displays=[{workArea:{x:0,y:0,width:1920,height:1080}}];

test("i3e clamps primary bounds to 480x600 and retains maximized state",()=>{
 assert.deepEqual(clampPrimaryWindowBounds({
  x:35.4,y:11.6,width:100,height:200,isMaximized:true,
 }),{x:35,y:12,width:480,height:600,isMaximized:true});
 assert.equal(clampPrimaryWindowBounds({x:1,y:2,width:NaN,height:300}),null);
 assert.equal(clampPrimaryWindowBounds({x:1,y:2,width:-1,height:300}),null);
});
test("i3e preserves only windows intersecting at least one display work area",()=>{
 assert.equal(isWithinDisplayWorkArea({
  x:1910,y:100,width:480,height:600,
 },displays),true);
 assert.equal(isWithinDisplayWorkArea({
  x:1920,y:100,width:480,height:600,
 },displays),false);
 assert.equal(isWithinDisplayWorkArea({
  x:-480,y:20,width:480,height:600,
 },displays),false);
 assert.equal(isWithinDisplayWorkArea({
  x:2500,y:20,width:480,height:600,
 },[{workArea:{x:2000,y:0,width:1920,height:1080}}]),true);
 assert.equal(isWithinDisplayWorkArea({x:25,y:20,width:480,height:600},[]),true);
});
test("independent Electron host saves and restores window state atomically",()=>{
 const folder=mkdtempSync(join(tmpdir(),"agent-web-bounds-"));
 try{
  assert.equal(restorePrimaryWindowBounds(folder,displays),null);
  assert.equal(persistPrimaryWindowBounds(folder,{
   x:24,y:16,width:920,height:700,isMaximized:true,
  }),true);
  assert.deepEqual(restorePrimaryWindowBounds(folder,displays),{
   x:24,y:16,width:920,height:700,isMaximized:true,
  });
  assert.equal(restorePrimaryWindowBounds(folder,[{
   workArea:{x:3000,y:0,width:1920,height:1080},
  }]),null);
  const saved=JSON.parse(readFileSync(join(folder,"agent-web-window-bounds.json"),"utf8"));
  assert.equal(saved.width,920);
  assert.equal(saved.isMaximized,true);
  writeFileSync(join(folder,"agent-web-window-bounds.json"),"{");
  assert.equal(restorePrimaryWindowBounds(folder,displays),null);
 }finally{rmSync(folder,{recursive:true,force:true});}
});
