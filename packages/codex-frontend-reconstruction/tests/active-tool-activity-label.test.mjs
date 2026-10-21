import assert from 'node:assert/strict';
import { formatSearchQueryTerms, getActiveToolActivityLabel, activeToolMessages, getVisualizationAction } from '../build/ActiveToolActivityLabel.js';

assert.equal(formatSearchQueryTerms('alpha|beta'), '“alpha” and “beta”');
assert.equal(formatSearchQueryTerms('alpha|beta|gamma'), '“alpha”, “beta”, and “gamma”');
assert.equal(formatSearchQueryTerms('alpha\\|beta'), '“alpha|beta”');
assert.equal(formatSearchQueryTerms('a.*'), '“a.*”');
assert.equal(formatSearchQueryTerms('alpha||beta'), '“alpha||beta”');
assert.equal(getVisualizationAction('mkdir C:/work/visualizations/demo'), 'create');
assert.equal(getVisualizationAction("apply_patch <<'PATCH'\n*** Update File: C:/work/visualizations/demo.html\nPATCH"), 'update');
assert.equal(getVisualizationAction("apply_patch <<'PATCH'\n*** Delete File: C:/work/visualizations/demo.html\nPATCH"), null);

const dependencies = {
  formatReadTarget: (x) => x == null ? '(unknown)' : `target:${x}`, 
  getSkillReadInfo: () => null,
  isInternalKnowledgeSkill: () => false,
  formatPath: (x) => x,
};
const old = { type: 'exec', callId: 'old', executionStatus: 'completed', parsedCmd: { type: 'test', cmd: 'pnpm test', isFinished: true } };
const running = { type: 'exec', callId: 'running', executionStatus: 'running', parsedCmd: { type: 'test', cmd: 'pnpm test', isFinished: false } };
const result = getActiveToolActivityLabel({ items: [old, running], threadDetailLevel: 'STEPS_PROSE', dependencies });
assert.equal(result.activityKey, 'running');
assert.equal(result.message, activeToolMessages.commandRunningWithDetail);
assert.deepEqual(result.values, { command: 'pnpm test' });
const fallback = getActiveToolActivityLabel({ items: [old], threadDetailLevel: 'SUMMARY', dependencies });
assert.equal(fallback.activityKey, 'old');
assert.equal(fallback.message, activeToolMessages.commandRanWithDetail);

const searchProse = getActiveToolActivityLabel({
  items: [{ type: 'exec', callId: 'search-prose', executionStatus: 'completed', parsedCmd: { type: 'search', query: 'alpha|beta', isFinished: true } }],
  threadDetailLevel: 'STEPS_PROSE', dependencies,
});
assert.equal(searchProse.values.query, '“alpha” and “beta”');
const searchSummary = getActiveToolActivityLabel({
  items: [{ type: 'exec', callId: 'search-summary', executionStatus: 'completed', parsedCmd: { type: 'search', query: 'alpha|beta', isFinished: true } }],
  threadDetailLevel: 'SUMMARY', dependencies,
});
assert.equal(searchSummary.values.query, 'alpha|beta');
const readLabel = getActiveToolActivityLabel({
  items: [{ type: 'exec', callId: 'read', executionStatus: 'completed', parsedCmd: { type: 'read', path: 'src/a.ts', isFinished: true } }],
  threadDetailLevel: 'SUMMARY', dependencies,
});
assert.equal(readLabel.values.target, 'target:src/a.ts');
const skillDependencies = { ...dependencies, getSkillReadInfo: () => ({ isSkillDefinitionFile: true, skillName: 'test' }) };
const skillLabel = getActiveToolActivityLabel({
  items: [{ type: 'exec', callId: 'skill', executionStatus: 'completed', parsedCmd: { type: 'read', path: 'SKILL.md', isFinished: true } }],
  threadDetailLevel: 'SUMMARY', dependencies: skillDependencies,
});
assert.equal(skillLabel.message, activeToolMessages.readSkill);
assert.equal(skillLabel.values.skillName, 'test');
const internalDependencies = { ...skillDependencies, isInternalKnowledgeSkill: () => true };
const internalLabel = getActiveToolActivityLabel({
  items: [{ type: 'exec', callId: 'internal', executionStatus: 'completed', parsedCmd: { type: 'read', path: 'SKILL.md', isFinished: true } }],
  threadDetailLevel: 'SUMMARY', dependencies: internalDependencies,
});
assert.equal(internalLabel.icon, 'internal-knowledge');
assert.equal(internalLabel.message, activeToolMessages.readInternalKnowledge);
const listLabel = getActiveToolActivityLabel({
  items: [{ type: 'exec', callId: 'list', executionStatus: 'completed', parsedCmd: { type: 'list_files', path: 'src', isFinished: true } }],
  threadDetailLevel: 'SUMMARY', dependencies,
});
assert.equal(listLabel.values.folder, 'src');
console.log('ActiveToolActivityLabel: 19 assertions passed');
