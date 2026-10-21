/** Read-only evidence check of the original compiled activity aggregator. */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const suppliedPath = process.argv[2];
if (!suppliedPath) {
  console.error('Usage: node scripts/audit-agent-activity-aggregate-evidence.mjs <path/to/inline-followup-markdown-4751fe20f26d.js>');
  process.exit(2);
}
const input = readFileSync(resolve(suppliedPath));
const digest = createHash('sha256').update(input).digest('hex');
const expected = 'b2a356e8c59b592f16514e9c160cacbbeebfedf0c18b87699564f8c20705fa0b';
if (digest !== expected) {
  console.error(`Original evidence SHA-256 mismatch: ${digest} (expected ${expected})`);
  process.exit(1);
}
const source = input.toString('utf8');
const signatures = [
  'function Le(e){let t=ze()',
  'for(let n of e)Re(n)&&Be(t,n)',
  'function Re(e){return e.type===`other`?!1',
  'function ze(){return{createdPaths:new Set',
  'function Be(e,t){if(t.type===`exploration`)',
  'e.exploredPaths.add(n)',
  'e.loadedToolPaths.add(n)',
  'if(t.type===`patch`)',
  'e.visualizationActivitiesByPath.set(n.path',
  'if(t.type===`exec`)',
  'e.commandCount+=1',
  'e.runningCommandCount+=1',
  'e.completedWebSearchCommandCount+=1',
  'if(t.type===`automatic-approval-review`)',
  'if(t.type===`mcp-tool-call`)',
  'e.mcpToolCallSources.set(t.source.key',
  'if(t.type===`web-search`)',
  'function Ve(e){let t=[...e.visualizationActivitiesByPath.values()]',
  'createdFileCount:e.createdPaths.size',
  'mcpToolCallSources:[...e.mcpToolCallSources.values()]',
  'function Z(e,t){for(let n of t??[])He(e,n)',
  'function He(e,t){if(!e.automaticApprovalReviewFailureIds.has(t.id))',
];
const failed = signatures.filter(s => !source.includes(s));
if (failed.length) {
  console.error('Signature mismatch:\n' + failed.join('\n'));
  process.exit(1);
}
console.log(`SHA-256 OK ${digest}`);
console.log(`PASS ${signatures.length}/${signatures.length} aggregator function signatures`);
