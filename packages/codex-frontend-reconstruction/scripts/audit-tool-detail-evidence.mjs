import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
const file=process.argv[2],patchFile=process.argv[3];if(!file||!patchFile){console.error("Usage: node scripts/audit-tool-detail-evidence.mjs /path/to/sites-end-resource-fa77a923096d.js /path/to/app-initial-5851df3f6cb1.js");process.exit(2);}
const b=readFileSync(file),hash=createHash("sha256").update(b).digest("hex");
if(hash!=="a84b2e2181125a3e4d2bc9be458bad4fb36df615243c7f3cc23e076bd4094708"){console.error("Original bundle hash mismatch "+hash);process.exit(1);}
const content=b.toString("utf8");
const patchBytes=readFileSync(patchFile),patchHash=createHash("sha256").update(patchBytes).digest("hex");
if(patchHash!=="c70d95da34ba7e5962a559dbf68d0102d10b4b47b877f5d9933629bb5a1f3a10"){console.error("Original app-initial bundle hash mismatch "+patchHash);process.exit(1);}
const patchContent=patchBytes.toString("utf8");
const patchSignatures=["function s0n(e,t){","function f0n(e){","if(f0n(t)>1048576||e.length*4>1048576","move_path??e"];
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
 "function CC(e){",
 "function RC(e){",
 "function EC(e){",
 "function NC(e){",
 "function SC(e){",
 "function WC(e){",
 "function BT(e){",
 "function VT(e){",
 "function IT(e){",
 "exec-shell-body",
 "toolSummaryForCmd.searchedForInPath",
 "toolSummaryForCmd.exploredFilesInPath",
 "toolSummaryForCmd.read",
 "codex.patch.change.stoppedCreating",
 "codex.patch.change.toggleDiff",
 "codex.patch.change.previewTooLarge",
 "codex.patch.change.autoReviewDeclined",
 "Toggle diff for {fileName}",
 "Diff too large to preview",
 "Started background terminal with {command}",
 "Command declined by auto-review",
 "function PT(e){","u=Gf(n)?\`auto-review-declined\`:n.success===!0?\`applied\`",
 "if(!m&&Object.keys(n.changes).length===0)return null",
 "showDiffDetails:!et",
 "function zO(e){",
 "Mr(Au,{hostId:s.hostId,threadId:s.conversationId,entityKey:n,itemId:o})",
 "Mr(Vd,a.type===`assistant-message`?{hostId:s.hostId,threadId:s.conversationId,entityKey:n,itemId:o}:null)",
 "c?.type===`agentMessage`",
 "c?.type===`commandExecution`",
 "c?.type===`fileChange`",
 "c?.type===`imageGeneration`",
 "c?.type===`mcpToolCall`",
 "c?.type===`dynamicToolCall`",
 "parsedCmd,isFinished:r",
 "success:r},t[31]=a"
];
const missing=[...signatures.filter(s=>!content.includes(s)),...patchSignatures.filter(s=>!patchContent.includes(s))];
if(missing.length){console.error("Missing "+missing.join("\n"));process.exit(1);}
console.log("PASS "+signatures.length+" activity signatures + "+patchSignatures.length+" patch-preview signatures; sites-end-resource SHA256 "+hash+"; app-initial SHA256 "+patchHash);