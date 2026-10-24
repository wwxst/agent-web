import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {
  CHROME_HEIGHT,PRIMARY_MIN_WIDTH,PRIMARY_MIN_HEIGHT,
  sourcePrimaryChromeOptions,
}=require("./windowChrome.cjs");

test("Codex original A9 win32/light titleBarOverlay is transparent, 36px, dark symbols",()=>{
 const chrome=sourcePrimaryChromeOptions("win32",false);
 assert.equal(chrome.titleBarStyle,"hidden");
 assert.deepEqual(chrome.titleBarOverlay,{
  color:"#00000000",symbolColor:"#1f1f1f",height:36,
 });
 assert.equal(CHROME_HEIGHT,36);
 assert.equal(PRIMARY_MIN_WIDTH,480);
 assert.equal(PRIMARY_MIN_HEIGHT,600);
});
test("Codex A9 dark symbols and zoomed titlebar are source-derived",()=>{
 assert.deepEqual(sourcePrimaryChromeOptions("win32",true,1.25).titleBarOverlay,{
  color:"#00000000",symbolColor:"#ffffff",height:45,
 });
 assert.equal(sourcePrimaryChromeOptions("linux",true).titleBarStyle,"hidden");
});
test("Codex original macOS primary traffic light position changes with zoom",()=>{
 assert.deepEqual(sourcePrimaryChromeOptions("darwin",false),{
  titleBarStyle:"hiddenInset",trafficLightPosition:{x:16,y:15},
  acceptFirstMouse:true,
 });
 assert.equal(sourcePrimaryChromeOptions("darwin",false,1.25).trafficLightPosition.y,21);
 assert.equal(sourcePrimaryChromeOptions("freebsd").titleBarStyle,"default");
});
