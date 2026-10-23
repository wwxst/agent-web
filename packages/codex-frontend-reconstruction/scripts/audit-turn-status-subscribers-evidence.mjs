import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {join} from "node:path";
const dir=process.argv[2];
if(!dir){console.error("Usage: node scripts/audit-turn-status-subscribers-evidence.mjs <private-frontend/webview/assets>");process.exit(2);}
const filename="local-conversation-turn-69783815d57d.js";
const bytes=readFileSync(join(dir,filename));
const sha=createHash("sha256").update(bytes).digest("hex");
const pinned="e40ee63884bc75af917583fe70afade4b6c683adbd93d9536b7636eb6d8f54d4";
if(sha!==pinned)throw Error(filename+" source hash mismatch: "+sha);
const source=bytes.toString("utf8");
const signatures=[
 'We=f==null||x.status!==`in_progress`?null:{hostId:d,threadId:u,entityKey:f}',
 'Ge=G(qn,We)',
 'K=Ge==null?x.status===`in_progress`:Ge===`inProgress`',
 'Bi=U&&rn!=null&&!we',
 'Vi=Bi?{hostId:d,threadId:u}:null',
 'Ui=G(Qr,Vi)',
 'Wi=Bi&&!Ui',
 'Gi=K&&!ai&&!Wi',
 'Ki=n===`latest`?Ga(Ri,Gi):Ri',
];
for(const signature of signatures){
 if(!source.includes(signature))throw Error("Missing compiled source signature: "+signature);
}
console.log(filename+": SHA-256 and "+signatures.length+"/"+signatures.length+" runtime query signatures verified");
