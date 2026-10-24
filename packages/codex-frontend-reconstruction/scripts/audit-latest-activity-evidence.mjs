import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {join} from "node:path";

// SHA-pinned against the private frontend.zip supplied in this conversation.
// The compiled bundles themselves must never be committed to this repository.
const assets=[
  {name:"inline-followup-markdown-4751fe20f26d.js",
   sha:"b2a356e8c59b592f16514e9c160cacbbeebfedf0c18b87699564f8c20705fa0b",
   snippets:[
     "function Ke(e,{includeGeneratedImages:",
     "if(w(i,e[a+1]))return[]",
     "function qe(e,t){let n=e.findLastIndex",
     "e.items.some(Q)",
     "function Q(e){switch(e.item.type)",
   ]},
  {name:"agent-activity-item-1be092f0c744.js",
   sha:"e64adbffa15ebaa08ffd854743e1409325303481313656bf6749407b4c53d1ca",
   snippets:[
     "function fr(e,t){return e.type===`exec`",
     "t?.type===`patch`&&t.visualizationActivities!=null",
     "e.parsedCmd.type===`read`&&qt(Zt({summary:e.parsedCmd,cwd:e.cwd}))",
   ]},
  {name:"app-initial-5851df3f6cb1.js",
   sha:"c70d95da34ba7e5962a559dbf68d0102d10b4b47b877f5d9933629bb5a1f3a10",
   snippets:[
     "function F$n(e){return e!=null&&(e.content.trim().length>0||e.completed||e.structuredOutput!=null)",
   ]},
];
const root=process.argv[2];
if(!root){
 console.error("Usage: node scripts/audit-latest-activity-evidence.mjs <frontend/webview/assets>");
 process.exit(2);
}
let signatures=0;
for(const asset of assets){
 const data=readFileSync(join(root,asset.name));
 const sha=createHash("sha256").update(data).digest("hex");
 if(sha!==asset.sha)throw Error(asset.name+" unexpected SHA-256 "+sha);
 const body=data.toString("utf8");
 for(const snippet of asset.snippets){
  if(!body.includes(snippet))throw Error(asset.name+" missing signature "+snippet);
  signatures++;
 }
 console.log(asset.name+": "+asset.snippets.length+" signatures verified");
}
console.log("Ke/fr/qe/F$n verified: "+signatures+"/"+signatures);
