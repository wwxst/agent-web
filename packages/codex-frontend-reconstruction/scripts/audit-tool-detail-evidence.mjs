import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
const file=process.argv[2];if(!file){console.error("Usage: node scripts/audit-tool-detail-evidence.mjs /path/to/sites-end-resource-fa77a923096d.js");process.exit(2);}
const b=readFileSync(file),hash=createHash("sha256").update(b).digest("hex");
if(hash!=="a84b2e2181125a3e4d2bc9be458bad4fb36df615243c7f3cc23e076bd4094708"){console.error("Original bundle hash mismatch "+hash);process.exit(1);}
const content=b.toString("utf8");
const signatures=[
 "function fk(e){","standaloneActivityContentByItemId:O","if(R!=null)return R",
 "(0,vk.jsx)(LO,{item:M,showShimmer:k","wrapSearchableContent:T",
 "function LO(e){","function HO(e){",
 "if(e.type===\`exec\`)return e.commandExecutionItemId??e.callId",
 "function zO(e){","c?.type===\`commandExecution\`",
 "function SO(e){","case\`exec\`:{let e=NO(n);","case\`patch\`:{",
 "case\`mcp-tool-call\`:{","case\`automatic-approval-review\`:{",
 "function NO(e){return e.parsedCmd.type===\`read\`",
 "function xC(e){","isBackgroundTerminalRunning:b","isBackgroundTerminalFinished:x",
 "function PT(e){","u=Gf(n)?\`auto-review-declined\`:n.success===!0?\`applied\`",
 "if(!m&&Object.keys(n.changes).length===0)return null",
 "showDiffDetails:!et"
];
const missing=signatures.filter(s=>!content.includes(s));
if(missing.length){console.error("Missing "+missing.join("\n"));process.exit(1);}
console.log("PASS "+signatures.length+"/"+signatures.length+" original fk/LO/SO/xC/PT signatures; SHA256 "+hash);