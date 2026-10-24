"use strict";
/**
 * Security boundary for our independently authored Electron shell, not the
 * proprietary Codex file:// protocol. Use the runtime's platform-aware
 * fileURLToPath instead of hand-stripping URL slashes (Windows drive letters).
 */
const path=require("node:path");
const {fileURLToPath}=require("node:url");
function isAllowedNavigation(url,{devUrl="",indexPath,platform=process.platform}={}){
 if(typeof url!=="string"||typeof indexPath!=="string")return false;
 try{
  const target=new URL(url);
  if(devUrl){
    const origin=new URL(devUrl);
    return (target.protocol==="http:"||target.protocol==="https:") &&
      target.origin===origin.origin;
  }
  if(target.protocol!=="file:")return false;
  if(target.host!=="" && target.host.toLowerCase()!=="localhost")return false;
  const loaded=path.normalize(fileURLToPath(target));
  const expected=path.normalize(indexPath);
  return platform==="win32"
    ?loaded.toLowerCase()===expected.toLowerCase()
    :loaded===expected;
 }catch{return false;}
}
module.exports={isAllowedNavigation};
