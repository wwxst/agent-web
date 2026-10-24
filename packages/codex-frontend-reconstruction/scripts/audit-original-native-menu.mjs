import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {join} from "node:path";
const dir=process.argv[2];
if(!dir){
 console.error("Usage: node scripts/audit-original-native-menu.mjs <frontend/.vite/build>");
 process.exit(2);
}
const file="main-C4DYk222.js";
const bytes=readFileSync(join(dir,file));
const hash=createHash("sha256").update(bytes).digest("hex");
const expected="c8a2af504b21314fa6a64ad1b4ec83dbad80033ede902caf9978fd9c74a2c175";
if(hash!==expected)throw Error("Original source hash mismatch "+hash);
const code=bytes.toString("utf8");
const signatures=[
 "function w0e({nativeIntl:e,isMacOS:t})",
 "role:`editMenu`",
 "role:`undo`",
 "role:`redo`",
 "role:`cut`",
 "role:`copy`",
 "role:`paste`",
 "role:`delete`",
 "role:`selectAll`",
 "role:`pasteAndMatchStyle`,accelerator:`Command+Option+Shift+V`",
 "accelerator:`CmdOrCtrl+Plus`",
 "accelerator:`CmdOrCtrl+-`",
 "accelerator:`CmdOrCtrl+0`",
 "accelerator:`F11`,click:St",
 "D.Menu.setApplicationMenu(Bt)",
 "type:`step-window-zoom`,delta:e",
 "type:`reset-window-zoom`",
];
for(const sig of signatures)if(!code.includes(sig))
 throw Error(file+" missing source fingerprint "+sig);
console.log(file+": SHA-256 and "+signatures.length+"/"+signatures.length+" native menu fingerprints verified");
