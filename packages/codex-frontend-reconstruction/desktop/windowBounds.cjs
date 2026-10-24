"use strict";
/**
 * Original compiled i3e.restorePrimaryWindowBounds /
 * persistPrimaryWindowBounds / isWithinDisplayWorkArea, source
 * main-C4DYk222.js. Independent persisted storage uses a small JSON file
 * in app.userData instead of Codex's private globalState.
 */
const fs=require("node:fs");
const path=require("node:path");
const {PRIMARY_MIN_WIDTH,PRIMARY_MIN_HEIGHT}=require("./windowChrome.cjs");
const filename="agent-web-window-bounds.json";
function validRect(rect){
 return rect!=null && ["x","y","width","height"].every(k=>
  typeof rect[k]==="number" && Number.isFinite(rect[k])) &&
  rect.width>0 && rect.height>0;
}
function clampPrimaryWindowBounds(rect){
 if(!validRect(rect))return null;
 return {
  x:Math.round(rect.x),y:Math.round(rect.y),
  width:Math.max(PRIMARY_MIN_WIDTH,Math.round(rect.width)),
  height:Math.max(PRIMARY_MIN_HEIGHT,Math.round(rect.height)),
  isMaximized:rect.isMaximized===true,
 };
}
function isWithinDisplayWorkArea(bounds,displays){
 if(bounds==null)return false;
 if(displays.length===0)return true;
 return displays.some(({workArea:a})=>{
  if(!validRect(a))return false;
  return a.x<bounds.x+bounds.width && a.x+a.width>bounds.x &&
   a.y<bounds.y+bounds.height && a.y+a.height>bounds.y;
 });
}
function getBoundsPath(userData){return path.join(userData,filename);}
function restorePrimaryWindowBounds(userData,displays){
 try{
  const saved=JSON.parse(fs.readFileSync(getBoundsPath(userData),"utf8"));
  const bounds=clampPrimaryWindowBounds(saved);
  return isWithinDisplayWorkArea(bounds,displays)?bounds:null;
 }catch{return null;}
}
function persistPrimaryWindowBounds(userData,bounds){
 const valid=clampPrimaryWindowBounds(bounds);
 if(valid==null)return false;
 try{
  fs.mkdirSync(userData,{recursive:true});
  // Atomically replace a completed JSON file; do not let an interrupted
  // shutdown leave a partly written window geometry entry.
  const dest=getBoundsPath(userData),temp=dest+".tmp";
  fs.writeFileSync(temp,JSON.stringify(valid),"utf8");
  fs.renameSync(temp,dest);
  return true;
 }catch{return false;}
}
module.exports={
 validRect,clampPrimaryWindowBounds,isWithinDisplayWorkArea,
 restorePrimaryWindowBounds,persistPrimaryWindowBounds,
};
