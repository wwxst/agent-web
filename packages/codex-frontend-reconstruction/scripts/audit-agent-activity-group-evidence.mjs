/**
 * Read-only audit of compiled-source signatures used by the group header stage.
 * Usage: node scripts/audit-agent-activity-group-evidence.mjs /.../frontend/webview/assets
 * Does not copy or publish proprietary bundled source files.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const directory=process.argv[2];
if(!directory){console.error('Pass the extracted original frontend/webview/assets directory.');process.exit(2)}
const originals=[
  {
    file:'inline-followup-markdown-4751fe20f26d.js',
    sha:'b2a356e8c59b592f16514e9c160cacbbeebfedf0c18b87699564f8c20705fa0b',
    fragments:[
      'function Xe({unit:e,isLatestVisibleUnit:t,isTurnInProgress:n,isActivitySliceClosed:r,isExploring:i})',
      'if(!(t&&n&&!r))return{kind:`summary`}',
      'function Ze(e)', 'function Q(e)', 'function K(e)', 'function I(e)',
      'case`automatic-approval-review`:return e.item.status===`inProgress`',
      'function We(e,{mcpServerStatuses:t,resolvedApps:n=[],modelProvider:r,isTurnCancelled:i=!1}',
      'function je(e,t,n)', 'function Ye(e,t)', 'function Le(e)',
      'function Ae({items:e,toolActivity:t,resolvedApps:n})',
    ],
  },
  {
    file:'sites-end-resource-fa77a923096d.js',
    sha:'a84b2e2181125a3e4d2bc9be458bad4fb36df615243c7f3cc23e076bd4094708',
    fragments:[
      'function nk(e)', 'function ak(e)', 'function sk(e)',
      'function pk(e)', 'function mk({item:e},t)',
      'function A_(e)', 'canExpand:W,onExpand:se,children:ce',
      'summaryTransition:ae','summaryKey:ie',
      'function fk(e)', 'collapsedMessageCount',
      'localConversation.agentActivity.runningCommandGeneric',
      'localConversation.agentActivity.runningCommand',
      'localConversation.agentActivity.editingFiles',
      'localConversation.agentActivity.searchingWebForQuery',
    ],
  },
];
let count=0;
for(const original of originals){
  const bytes=readFileSync(resolve(directory,original.file));
  const sha=createHash('sha256').update(bytes).digest('hex');
  if(sha!==original.sha)throw Error(`Source SHA mismatch for ${original.file}: ${sha}`);
  const body=bytes.toString('utf8');
  for(const text of original.fragments){
    if(!body.includes(text))throw Error(`Signature ${JSON.stringify(text)} missing from ${original.file}`);
    count++;
  }
  console.log(`Verified ${original.file}: ${original.fragments.length} signatures, SHA-256 ${sha}`);
}
console.log(`Source-aligned group activity: ${originals.length} original files, ${count} signatures`);
