import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {MENU_IDS,buildSourceNativeMenus,isAllowedMenuId,sanitizeMenuAnchor}=require("./nativeMenu.cjs");

const names=["closeWindow","quit","zoomIn","zoomOut","actualSize","toggleFullScreen","documentation"];
function makeActions(){
 const calls=[];
 const actions=Object.fromEntries(names.map(name=>[name,()=>calls.push(name)]));
 return {actions,calls};
}
const item=(template,id)=>template.flatMap(group=>group.submenu??[]).find(it=>it.id===id);

test("source w0e Edit native roles match original, no invented menu commands",()=>{
 const {actions}=makeActions();
 const menus=buildSourceNativeMenus({platform:"win32",actions});
 assert.deepEqual(menus.map(entry=>entry.id),MENU_IDS);
 assert.deepEqual(menus[1].submenu.filter(x=>x.role).map(x=>x.role),[
  "undo","redo","cut","copy","paste","delete","selectAll",
 ]);
 assert.equal(item(menus,"newTask"),undefined);
 assert.equal(item(menus,"searchFiles"),undefined);
 assert.equal(item(menus,"openFolder"),undefined);
 assert.equal(item(menus,"closeWindow").accelerator,"Ctrl+W");
 assert.equal(item(menus,"quit").accelerator,"Ctrl+Q");
});
test("source D0e View accelerators and real IPC action subset",()=>{
 const {actions,calls}=makeActions();
 const menus=buildSourceNativeMenus({platform:"linux",actions});
 const shortcuts=[
  ["zoomIn","CmdOrCtrl+Plus"],
  ["zoomOut","CmdOrCtrl+-"],
  ["actualSize","CmdOrCtrl+0"],
  ["toggleFullScreen","F11"],
 ];
 for(const [id,expected] of shortcuts){
  assert.equal(item(menus,id).accelerator,expected);
  item(menus,id).click();
 }
 assert.deepEqual(calls,["zoomIn","zoomOut","actualSize","toggleFullScreen"]);
 assert.equal(item(menus,"documentation").label,"Documentation");
});
test("macOS edit/window branch retains original roles and full screen shortcut",()=>{
 const {actions}=makeActions();
 const menus=buildSourceNativeMenus({platform:"darwin",actions});
 assert.equal(menus[0].role,"appMenu");
 assert.equal(menus.find(x=>x.label==="Window").role,"windowMenu");
 assert.equal(menus.find(x=>x.id==="edit").submenu.find(x=>x.role==="pasteAndMatchStyle").accelerator,
  "Command+Option+Shift+V");
 assert.equal(item(menus,"toggleFullScreen").accelerator,"Command+Control+F");
});
test("renderer may request only explicit menu ids and finite window anchors",()=>{
 for(const id of MENU_IDS)assert.equal(isAllowedMenuId(id),true);
 for(const id of ["quit","newTask","zoomIn","DevTools","__proto__","",null,0])
  assert.equal(isAllowedMenuId(id),false);
 assert.deepEqual(sanitizeMenuAnchor({x:10.2,y:35.9}),{x:10,y:36});
 assert.deepEqual(sanitizeMenuAnchor({x:-9,y:50000}),{x:0,y:4096});
 for(const anchor of [null,{}, {x:NaN,y:1},{x:1,y:Infinity},{x:"1",y:3}])
  assert.equal(sanitizeMenuAnchor(anchor),null);
});
