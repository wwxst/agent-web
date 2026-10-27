import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {sourceSafeExternalHttpsUrl,handleExternalUrlOpen,MAX_EXTERNAL_URL_LENGTH}
  =require("./externalUrlAction.cjs");

test("original dt independent native external-open bridge only accepts bounded HTTPS URLs",()=>{
 assert.equal(sourceSafeExternalHttpsUrl("https://example.org/docs"),"https://example.org/docs");
 for(const input of [
  "",null,"javascript:alert(1)","file:///etc/passwd","http://example.org/",
  "data:text/html,hi","https://user:pw@example.org/","https://example.org/\ncmd",
  "https://example.org/"+"x".repeat(MAX_EXTERNAL_URL_LENGTH),
 ]){
  assert.equal(sourceSafeExternalHttpsUrl(input),null,JSON.stringify(input));
 }
});
test("native opener rejects untrusted renderer and invalid URLs without executing shell",async()=>{
 const sent=[];
 const options={isTrustedRenderer:()=>true,openExternal:async url=>{sent.push(url);}};
 await assert.rejects(()=>handleExternalUrlOpen({
  ...options,isTrustedRenderer:()=>false,
 },{},"https://example.org"),/EXTERNAL_URL_UNTRUSTED_RENDERER/);
 await assert.rejects(()=>handleExternalUrlOpen(options,{},"javascript:alert(1)"),
  /EXTERNAL_URL_INVALID/);
 assert.deepEqual(sent,[]);
 assert.equal(await handleExternalUrlOpen(options,{},"https://example.org/docs"),true);
 assert.deepEqual(sent,["https://example.org/docs"]);
});
test("failed native open rejects without falsely transitioning URL action to Continue",async()=>{
 await assert.rejects(()=>handleExternalUrlOpen({
  isTrustedRenderer:()=>true,
  openExternal:async()=>{throw new Error("native open failed");},
 },{},"https://example.org"),/native open failed/);
});
