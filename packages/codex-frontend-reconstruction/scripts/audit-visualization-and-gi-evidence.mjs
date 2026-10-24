import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {join} from "node:path";
const root=process.argv[2];
if(!root){console.error("Usage: node scripts/audit-visualization-and-gi-evidence.mjs <original-frontend/webview/assets>");process.exit(2);}
const files=[
 {file:"skill-exploration-labels-dbc7ec897dab.js",hash:"26c09e991cbfa31950d34e9106bb7f76c4efd6220cb30a606f6c81e7e26399c4",
  signatures:["function g(e){return!x.test(e)||!S.test(e)?null:","function _(e){if(e==null)return!0;","function v(e){return e?.isSkillDefinitionFile===!0","function P({summary:e,cwd:t})","export{g as a,v as c,b as i,_ as l"]},
 {file:"agent-activity-item-1be092f0c744.js",hash:"e64adbffa15ebaa08ffd854743e1409325303481313656bf6749407b4c53d1ca",
  signatures:["function fr(e,t){return e.type===`exec`&&Jt(e.executionStatus)&&Kt(e.parsedCmd.cmd)","e.parsedCmd.type===`read`&&qt(Zt({summary:e.parsedCmd,cwd:e.cwd})"]},
 {file:"local-conversation-turn-69783815d57d.js",hash:"e40ee63884bc75af917583fe70afade4b6c683adbd93d9536b7636eb6d8f54d4",
  signatures:["Gi=K&&!ai&&!Wi","Bi=U&&rn!=null&&!we","Ui=G(Qr,Vi)","ii=ar&&ri&&Y?.phase===`commentary`","ai=ri&&!ii","ni=!Ze&&Ht(Y)","K=Ge==null?x.status===`in_progress`:Ge===`inProgress`","isMostRecentTurn:O"]},
 {file:"app-initial-5851df3f6cb1.js",hash:"c70d95da34ba7e5962a559dbf68d0102d10b4b47b877f5d9933629bb5a1f3a10",
  signatures:["function $9l(e){","function teu(e,t){","function neu(e,t){","function reu({skillId:e,skillRootPath:t,pluginId:n"]},
];
let found=0;
for(const entry of files){
 const data=readFileSync(join(root,entry.file));
 const hash=createHash("sha256").update(data).digest("hex");
 if(hash!==entry.hash)throw Error(entry.file+" SHA-256 mismatch "+hash);
 const text=data.toString("utf8");
 for(const signature of entry.signatures){
  if(!text.includes(signature))throw Error(entry.file+" missing "+signature);
  found++;
 }
 console.log(entry.file+": SHA-256 and "+entry.signatures.length+" exact signatures");
}
console.log("Source Gi/Jt/Kt/qt/fr/skill-path evidence: "+found+"/"+found);
