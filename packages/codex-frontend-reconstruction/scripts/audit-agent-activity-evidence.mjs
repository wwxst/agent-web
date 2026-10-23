/**
 * Read-only source signature audit. Usage:
 * node scripts/audit-agent-activity-evidence.mjs /path/to/original/frontend/webview/assets
 * Never uploads the original proprietary compiled files to GitHub.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const assets = process.argv[2];
if (!assets) { console.error("Pass the extracted original frontend/webview/assets directory."); process.exit(2); }
const files = [
  {
    file:"sites-end-resource-fa77a923096d.js",
    sha:"a84b2e2181125a3e4d2bc9be458bad4fb36df615243c7f3cc23e076bd4094708",
    fragments:["function Lk({hasFinalAssistantStarted", "function kk(e,{hasFollowingFinalAnswer", "function Ak({unit:e", "function Bk(e,t)", "function Rk(e)", "function Hk(e)", "persistentUnits", "preToggleUnits", "collapsedMessageCount", "hasInlineSubagentActivity", "data-auto-review-denied"],
  },
  {
    file:"local-conversation-turn-69783815d57d.js",
    sha:"e40ee63884bc75af917583fe70afade4b6c683adbd93d9536b7636eb6d8f54d4",
    fragments:["case`agent-activity`", "collapseWhenPossible", "isActivitySliceClosed", "standaloneActivityContentByItemId", "persistedCollapsed", "onSetCollapsed", "forceExpanded", "preventAutoCollapse"],
  },
  {
    file:"agent-activity-item-1be092f0c744.js",
    sha:"e64adbffa15ebaa08ffd854743e1409325303481313656bf6749407b4c53d1ca",
    fragments:["function dr(e,", "case`dynamic-tool-call`", "automaticApprovalReviews", "persistentInCollapsedConversation"],
  },
];
let checked = 0;
for(const source of files){
  const body = readFileSync(resolve(assets,source.file));
  const digest = createHash("sha256").update(body).digest("hex");
  if(digest!==source.sha)throw Error(`Source mismatch: ${source.file} ${digest}`);
  const text = body.toString("utf8");
  for(const fragment of source.fragments){
    if(!text.includes(fragment))throw Error(`Missing ${fragment} in ${source.file}`);
    checked += 1;
  }
  console.log(`OK ${source.file} ${digest} (${source.fragments.length} signatures)`);
}
console.log(`AgentActivity compiled source verified: ${files.length} files, ${checked} signatures`);
