import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {join} from "node:path";
const root=process.argv[2];
if(!root){console.error("Usage: node scripts/audit-historical-turn-hydration-evidence.mjs <original-frontend/webview/assets>");process.exit(2);}
const file="local-conversation-thread-turn-entries-ed0916a7814f.js";
const pinned="425119f9ef6c93afaf78b9f48656b357384d360ca2d0ca1b22ff5f983c5fc45f";
const bytes=readFileSync(join(root,file));
const hash=createHash("sha256").update(bytes).digest("hex");
if(hash!==pinned)throw Error(file+" SHA-256 mismatch "+hash);
const source=bytes.toString("utf8");
const signatures=[
 "let v=t.historyEntityKey!=null&&!t.isAeonThread&&!t.preserveServerUserMessages&&t.turnState==null&&t.transcriptBlock==null",
 "turn:v?void 0:t.turn",
 "turnItemIds:v?t.turn?.items.map(e=>e.id):void 0",
 "turnStatus:v?t.turn?.status:void 0",
 "historyEntityKey:l.historyEntityKey",
 "turn:`turn`in l?l.turn:void 0",
 "preserveServerUserMessages:l.preserveServerUserMessages",
];
for(const signature of signatures){
 if(!source.includes(signature))throw Error(file+" missing signature "+signature);
}
console.log(file+": SHA-256 and "+signatures.length+"/"+signatures.length+" source history summary signatures verified");
