/** Read-only SHA256 and signature audit; original compiled JS stays private. */
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {resolve} from "node:path";
const file=process.argv[2];
if(!file){console.error("Usage: node scripts/audit-agent-activity-raw-classifier-evidence.mjs <original-inline-followup.js>");process.exit(2);}
const bytes=readFileSync(resolve(file)),hash=createHash("sha256").update(bytes).digest("hex");
if(hash!=="b2a356e8c59b592f16514e9c160cacbbeebfedf0c18b87699564f8c20705fa0b"){
 console.error("Original source SHA256 mismatch: "+hash);process.exit(1);
}
const source=bytes.toString("utf8");
const signature=[
 "function xe(e,{mcpServerStatuses:",
 "if(e.type===\`external-event\`)return{type:\`mcp-tool-call\`,isInProgress:!1,source:T(e,n)}",
 "if(e.type===\`patch\`)return{...Te(e,a),...O(e.automaticApprovalReviews)}",
 "if(e.type===\`exec\`){if(Se(e,i)",
 "e.parsedCmd.type===\`read\`&&!e.parsedCmd.isFinished&&x(",
 "e.parsedCmd.type===\`unknown\`?e.parsedCmd.cmd:null",
 "o&&(t||e.output?.exitCode===0)",
 "if(e.type===\`mcp-tool-call\`)return he(",
 "if(e.type===\`automatic-approval-review\`)switch(e.status)",
 "function D(e){if(!/^\\s*curl(?:\\s|$)/.test(e)",
 "t!==\`localhost\`&&!t.startsWith(\`127.\`)",
 "function O(e){let t=[]",
 "case\`denied\`:case\`timedOut\`:t.push({id:n.id,status:n.status})",
 "function we(e){let t=[],n=[],r=[],i=[],a=[]",
 "u.parsedCmd.type===\`search\`)",
 "if(u.parsedCmd.type===\`list_files\`)",
 "if(u.parsedCmd.type===\`read\`)",
 "function Te(e,t){if(Object.keys(e.changes).length===0",
 "runningCreatedLineCount:a,changedLineCount:o",
 "visualizationActivity:d",
];
const missing=signature.filter(v=>!source.includes(v));
if(missing.length){console.error("Source signatures missing:\n"+missing.join("\n"));process.exit(1);}
console.log("PASS "+signature.length+"/"+signature.length+" original xe/we/Te/O/D signatures; SHA256 "+hash);
