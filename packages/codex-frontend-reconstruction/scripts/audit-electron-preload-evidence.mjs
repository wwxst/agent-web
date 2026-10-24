import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {join} from "node:path";
const dir=process.argv[2];
if(!dir){
 console.error("Usage: node scripts/audit-electron-preload-evidence.mjs <original-frontend/.vite/build>");
 process.exit(2);
}
const bytes=readFileSync(join(dir,"preload.js"));
const expected="a3e622f8d80a83e58fb3cfcc640fa7e14e6461cccdae9ef7d7b0c821dde256b7";
const sha=createHash("sha256").update(bytes).digest("hex");
if(sha!==expected)throw Error("Original preload SHA-256 mismatch "+sha);
const code=bytes.toString("utf8");
const tokens=[
 "codex_desktop:message-from-view",
 "codex_desktop:message-for-view",
 "contextBridge.exposeInMainWorld(\`electronBridge\`",
 "sendMessageFromView:async",
 "getSystemThemeVariant",
 "getInitialSidebarBootstrap",
 "codex_desktop:worker:",
 "codex-host-chunked-message-v1",
];
for(const token of tokens)if(!code.includes(token))
 throw Error("Original preload missing "+token);
console.log("Original compiled Electron preload SHA-256 + "+tokens.length+"/"+tokens.length+" signatures verified");
