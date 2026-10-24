import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {join} from "node:path";
const dir=process.argv[2];
if(!dir){console.error("Usage: node scripts/audit-original-sidebar-thread-menu.mjs <private-frontend/.vite/build>");process.exit(2);}
const file="main-C4DYk222.js";
const bytes=readFileSync(join(dir,file));
const actual=createHash("sha256").update(bytes).digest("hex");
const expected="c8a2af504b21314fa6a64ad1b4ec83dbad80033ede902caf9978fd9c74a2c175";
if(actual!==expected)throw Error("Original native menu source mismatch: "+actual);
const s=bytes.toString("utf8");
const start=s.indexOf("function D0e("),end=s.indexOf("var ",start+20);
const source=s.slice(start,start+16000);
const evidence=[
  "accelerator:i?j(e)[t??0]:void 0",
  "Ne={...N(`toggleSidebar`),click:async()=>",
  "x.sendMessageToWindow(e,{type:`toggle-sidebar`})",
  "st={...N(`previousThread`),click:async",
  "lt={...N(`nextThread`),click:async",
  "x.sendMessageToWindow(n,{type:`run-command`,id:e,originPanel:r??void 0,keyboardEvent:t})",
  "d.sidebarCollapsible?[Ne",
  "st,ct,lt,ut",
];
for(const token of evidence)if(!source.includes(token))
 throw Error("Missing original D0e source signature: "+token);
console.log(file+": SHA-256 and "+evidence.length+"/"+evidence.length+" sidebar/thread menu signatures verified");
