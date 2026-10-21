import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isUnfinishedGroupItem, isActiveGroupMember, isExplorationCommand,
  projectActivityGroupHeader, getActiveActivityHeaderLabel,
  projectCompletedGroupHeaderParts,
} from '../build/AgentActivityGroupPresentation.js';

const exec = (cmd, finished = false, kind = 'unknown') => ({ type: 'exec', parsedCmd: { cmd, type: kind, isFinished: finished } });
const project = (items, overrides = {}) => projectActivityGroupHeader({
  items, isLatestVisibleUnit: true, isHeaderInProgress: true,
  isActivitySliceClosed: false, isExploring: false, ...overrides,
});

test('Xe: completed or nonlatest group is summary even with unfinished tool', () => {
  assert.deepEqual(project([exec('pwd')], { isHeaderInProgress: false }), {kind:'summary'});
  assert.deepEqual(project([exec('pwd')], { isLatestVisibleUnit: false }), {kind:'summary'});
  assert.deepEqual(project([exec('pwd')], { isActivitySliceClosed: true }), {kind:'summary'});
});
test('Xe: active state chooses last unfinished item, not first', () => {
  const a = exec('first'); const b = {type:'web-search', completed: false};
  assert.deepEqual(project([a,b]), {kind:'active',item:b});
});
test('Xe: pending automatic review chooses Thinking over active detail', () => {
  assert.deepEqual(project([exec('done',true),{type:'automatic-approval-review',status:'inProgress'}]), {kind:'thinking'});
});
test('Xe: no unfinished item while header is in progress displays Thinking', () => {
  assert.deepEqual(project([exec('done',true),{type:'worked-for',completed:false}]), {kind:'thinking'});
  assert.deepEqual(project([]), {kind:'thinking'});
});
test('Xe: interrupted exec is not treated as active, even if unfinished', () => {
  assert.deepEqual(project([{...exec('sleep 1'),executionStatus:'interrupted'}]), {kind:'thinking'});
});
test('Ze: exploring prioritizes trailing read/search/list_files, including completed fallback', () => {
  const read = exec('cat a',true,'read');const search = exec('rg x',false,'search');
  assert.deepEqual(project([read,search,{type:'reasoning',completed:false}],{isExploring:true}),{kind:'active',item:search});
  assert.deepEqual(project([exec('pwd'),read,{type:'worked-for'}],{isExploring:true}),{kind:'active',item:read});
});
test('Ze: exploring stops at first nonexploration after choosing trailing candidate', () => {
  const prior = exec('rg prior', false,'search'); const latest = exec('cat current',true,'read');
  assert.deepEqual(project([prior,{type:'patch',success:true},latest],{isExploring:true}),{kind:'active',item:latest});
});
test('Ze: with no exploration falls back to Q on latest unfinished item', () => {
  const patch = {type:'patch',success:null};assert.deepEqual(project([patch],{isExploring:true}),{kind:'active',item:patch});
});
test('Q: exec, patch, web and tools use source-specific completion flags', () => {
  assert.equal(isActiveGroupMember({...exec('echo'),executionStatus:'interrupted'}),false);
  assert.equal(isActiveGroupMember({type:'patch',success:undefined}),true);
  assert.equal(isActiveGroupMember({type:'mcp-tool-call',completed:false}),true);
  assert.equal(isActiveGroupMember({type:'web-search',completed:true}),false);
});
test('K: reasoning, todo, multiagent and context-compaction are not a generic !completed', () => {
  assert.equal(isUnfinishedGroupItem({type:'reasoning',completed:false}),true);
  assert.equal(isUnfinishedGroupItem({type:'todo-list',plan:[{status:'completed'},{status:'pending'}]}),true);
  assert.equal(isUnfinishedGroupItem({type:'todo-list',plan:[{status:'completed'}]}),false);
  assert.equal(isUnfinishedGroupItem({type:'context-compaction',status:'inProgress'}),true);
  assert.equal(isUnfinishedGroupItem({type:'multi-agent-action',status:'inProgress'}),true);
  assert.equal(isUnfinishedGroupItem({type:'generated-image',completed:false}),false);
});
test('I: only read/search/list_files exec are exploration commands', () => {
  assert.equal(isExplorationCommand(exec('cat',false,'read')),true);
  assert.equal(isExplorationCommand(exec('rg',false,'search')),true);
  assert.equal(isExplorationCommand(exec('ls',false,'list_files')),true);
  assert.equal(isExplorationCommand(exec('npm test',false,'test')),false);
  assert.equal(isExplorationCommand({type:'web-search'}),false);
});
test('sk: command label honors STEPS_PROSE and verbose command', () => {
  assert.deepEqual(getActiveActivityHeaderLabel(exec(' git status '),'STEPS_PROSE'),{
    kind:'message',message:{id:'localConversation.agentActivity.runningCommandGeneric',defaultMessage:'Running command'},
  });
  assert.deepEqual(getActiveActivityHeaderLabel(exec(' git status '),'DETAILED'),{
    kind:'message',message:{id:'localConversation.agentActivity.runningCommand',defaultMessage:'Running {command}',values:{command:'git status'}},
  });
});
test('sk: patch and web search text use source identifiers and private formatter hook', () => {
  assert.equal(getActiveActivityHeaderLabel({type:'patch'},'DETAILED').message.id,'localConversation.agentActivity.editingFiles');
  assert.deepEqual(getActiveActivityHeaderLabel({type:'web-search',title:'Searching API'},'DETAILED'),{kind:'text',text:'Searching API'});
  assert.deepEqual(getActiveActivityHeaderLabel({type:'web-search',action:'search',query:'foo'},'DETAILED',(action,query)=>`${action} ${query}`),{
    kind:'message',message:{id:'localConversation.agentActivity.searchingWebForQuery',defaultMessage:'Searching the web for {query}',values:{query:'search foo'}},
  });
});
test('sk: unknown MCP/dynamic labels require host instead of fake title', () => {
  assert.deepEqual(getActiveActivityHeaderLabel({type:'mcp-tool-call'},'DETAILED'),{kind:'host-required',type:'mcp-tool-call'});
  assert.deepEqual(getActiveActivityHeaderLabel({type:'dynamic-tool-call'},'DETAILED'),{kind:'host-required',type:'dynamic-tool-call'});
  assert.deepEqual(getActiveActivityHeaderLabel(exec(undefined),'DETAILED'),{kind:'host-required',type:'exec'});
});
const empty = {loadedToolCount:0,mcpToolCallCount:0,mcpToolCallSources:[],createdFileCount:0,editedFileCount:0,deletedFileCount:0,stoppedCreatedFileCount:0,exploredFileCount:0,searchCount:0,listCount:0,visualizationActivity:null,commandCount:0,completedVisualizationCommandCount:0,runningVisualizationCommandCount:0,completedWebSearchCommandCount:0,runningWebSearchCommandCount:0,webSearchCount:0};
test('je: completed header parts match original ordering and file count deductions', () => {
  const results=projectCompletedGroupHeaderParts({...empty,loadedToolCount:2,createdFileCount:3,editedFileCount:1,deletedFileCount:2,stoppedCreatedFileCount:1,searchCount:1,commandCount:5,webSearchCount:1},[]);
  assert.deepEqual(results.map(x=>x.kind),['loaded-tools','file-changes','stopped-file-creation','exploration','commands','web-search']);
  assert.equal(results[1].count,5);
});
test('je: named MCP and special source command adjustment and extra parts', () => {
  const a={key:'app',count:2},b={key:'special',count:1};
  const parts=projectCompletedGroupHeaderParts({...empty,mcpToolCallSources:[a,b],mcpToolCallCount:5,commandCount:4,completedWebSearchCommandCount:1},[a], [{kind:'web-search',title:'example'}],key=>key==='special');
  assert.deepEqual(parts.map(x=>x.kind),['mcp-sources','unnamed-mcp-calls','commands','web-search','web-search']);
  assert.equal(parts[1].count,2);
  assert.equal(parts[2].count,4);
});
test('je: zero/negative counts are suppressed without inventing summaries', () => {
  assert.deepEqual(projectCompletedGroupHeaderParts({...empty,commandCount:1,completedVisualizationCommandCount:3},[]),[]);
});

test('Ye: completed single nonpatch group becomes standalone; unfinished and multi stay grouped', async () => {
  const {shouldDemoteCompletedSingleGroup: demote}=await import('../build/AgentActivityGroupPresentation.js');
  const summary={kind:'summary'};
  assert.equal(demote([exec('git status',true)],summary),true);
  assert.equal(demote([exec('git status',false)],summary),false);
  assert.equal(demote([exec('a',true),exec('b',true)],summary),false);
  assert.equal(demote([exec('git status',true)],{kind:'thinking'}),false);
  assert.equal(demote([{type:'patch',success:true,changes:{'a.ts':{}}}],summary),true);
  assert.equal(demote([{type:'patch',success:true,changes:{'a.ts':{},'b.ts':{}}}],summary),false);
  assert.equal(demote([{type:'patch',success:true,changes:{'a.ts':{}},visualizationActivities:[{}]}],summary),false);
});
