import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
const [initialPath,primaryPath,sharedPath,skillPath]=process.argv.slice(2);
if(!initialPath||!primaryPath||!sharedPath||!skillPath){
 console.error("Usage: node scripts/audit-tool-history-transforms-evidence.mjs <original-app-initial.js> <original-app-primary.js> <original-app-shared.js> <original-skill-exploration-labels.js>");
 process.exit(2);
}
const sources=[
 {name:"app-initial",path:initialPath,hash:"c70d95da34ba7e5962a559dbf68d0102d10b4b47b877f5d9933629bb5a1f3a10",
  signatures:["function Lpn({","function Cpn(e,","function O0n(e){","function umn(e){","function O$n(e){",
   "function rhn(e,t){","function nS(e,t,n,r){","function amn(e){","function rmn(e){","function Spn(e){",
   "function wpn(e,t){","function mpn(e){","function Tpn(e){","function Epn(e,t=0){",
   "function Z9l(e)","function $9l(e)","function teu(e,t)","function neu(e,t)","function reu("]},
 {name:"app-primary",path:primaryPath,hash:"2a05e25229bd7a38c12c55d90f82fb07087e80b4e16070116b215484498478f2",
  signatures:["function oit(e){"]},
 {name:"app-shared",path:sharedPath,hash:"a6579611db8acf9c9908e2a29e70a88687eaa1d8f8dbcdc258de58f286051e9d",
  signatures:["function Rct(e){","function zct(e){","Wct=/(?:^|[\\\\/])"]},
 {name:"skill-exploration-labels",path:skillPath,hash:"26c09e991cbfa31950d34e9106bb7f76c4efd6220cb30a606f6c81e7e26399c4",
  signatures:["function N({summary:e,cwd:t})","function P({summary:e,cwd:t})","function F({summary:e,cwd:t})","function I({path:e,cwd:t})"]}
];
let failures=0;
for(const source of sources){
 const bytes=readFileSync(source.path),hash=createHash("sha256").update(bytes).digest("hex");
 if(hash!==source.hash){console.error("FAIL "+source.name+" SHA256 "+hash);failures++;continue;}
 const content=bytes.toString("utf8"),missing=source.signatures.filter(s=>!content.includes(s));
 if(missing.length){console.error("FAIL "+source.name+" missing "+missing.join(", "));failures++;continue;}
 console.log("PASS "+source.name+" "+source.signatures.length+"/"+source.signatures.length+" signatures; SHA256 "+hash);
}
if(failures)process.exit(1);
