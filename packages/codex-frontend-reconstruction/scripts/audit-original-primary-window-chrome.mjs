import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {join} from "node:path";
const dir=process.argv[2];
if(!dir){
 console.error("Usage: node scripts/audit-original-primary-window-chrome.mjs <frontend/.vite/build>");
 process.exit(2);
}
const file="main-C4DYk222.js",bytes=readFileSync(join(dir,file));
const hash=createHash("sha256").update(bytes).digest("hex");
const expected="c8a2af504b21314fa6a64ad1b4ec83dbad80033ede902caf9978fd9c74a2c175";
if(hash!==expected)throw Error("Original compiled main changed "+hash);
const src=bytes.toString("utf8");
const patterns=[
 "O9=44,X4e=14,Z4e=16,Q4e=36",
 "function k9(e,t){return{x:Z4e,y:Math.round((e*t-X4e)/2)}}",
 "function A9(e=1){return{color:D9,symbolColor:D.nativeTheme.shouldUseDarkColors?e3e:$4e,height:Math.round(Q4e*e)}}",
 "case\`primary\`:return n===\`darwin\`?{titleBarStyle:\`hiddenInset\`",
 "n===\`win32\`||n===\`linux\`?{titleBarStyle:\`hidden\`,titleBarOverlay:A9(r)}",
 "getPrimaryMinimumSize(){return{width:480,height:600}}",
 "installApplicationMenuTitleBarOverlaySync(e,t)",
 "D.nativeTheme.on(\`updated\`,n)",
 "z.webContents.once(\`did-finish-load\`,()=>{z.webContents.setZoomLevel(0)",
];
for(const pattern of patterns)if(!src.includes(pattern))
 throw Error("Source missing primary window evidence: "+pattern);
console.log(file+": SHA-256 and "+patterns.length+"/"+patterns.length+" source signatures verified");
