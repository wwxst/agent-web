import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {join} from "node:path";
const root=process.argv[2];
if(!root) {
  console.error("Usage: node scripts/audit-aeon-partition-evidence.mjs <extracted-frontend/webview/assets>");
  process.exit(2);
}
const assets=[
  {filename:"app-initial-5851df3f6cb1.js",sha:"c70d95da34ba7e5962a559dbf68d0102d10b4b47b877f5d9933629bb5a1f3a10",tokens:[
    "function Smn({hostId:e,isAeonThread:t,items:n})",
    "if(!t)return n.length===0?[]:[{type:`activity`,items:n}]",
    "t.type===`mcp-tool-call`?_mn(t,e):null",
    "i?.type===`activity`?i.items.push(t):r.push({type:`activity`,items:[t]})",
    "function _mn(e,t,n=`all`)",
  ]},
  {filename:"local-conversation-turn-69783815d57d.js",sha:"e40ee63884bc75af917583fe70afade4b6c683adbd93d9536b7636eb6d8f54d4",tokens:[
    "ayr as hn", "r=hn({hostId:l,isAeonThread:B,items:t})",
    "if(i.type!==`activity`)", "p=Wa(i.items,{mcpServerStatuses:x})",
  ]},
];
let count=0;
for(const asset of assets){
  const bytes=readFileSync(join(root,asset.filename));
  const got=createHash("sha256").update(bytes).digest("hex");
  if(got!==asset.sha)throw Error(asset.filename+" expected SHA-256 "+asset.sha+" received "+got);
  const text=bytes.toString("utf8");
  for(const token of asset.tokens) {
    if(!text.includes(token))throw Error(asset.filename+" missing signature "+token);
    count++;
  }
  console.log(asset.filename+": hash and "+asset.tokens.length+" signatures verified");
}
console.log("Smn/hn verified: "+count+"/"+count+" source signatures");
