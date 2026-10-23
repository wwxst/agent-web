import test from "node:test";
import assert from "node:assert/strict";
import {
 isSourceVisualizationExecutionStatus,
 classifySourceVisualizationCommand,
 isSourceVisualizationSkillRead,
} from "../build/SourceVisualizationActivityPredicates.js";
import {isSourcePreGroupExecSuppressed} from "../build/SourcePreGroupExecFilter.js";
import {resolveSourceSkillDefinitionFromRead} from "../build/ToolActivityHistorySourceTransforms.js";

const read=(path,cwd)=>({
 type:"exec",parsedCmd:{type:"read",path,isFinished:true},
 ...(cwd==null?{}:{cwd}),
});
const cmd=(text,status)=>({
 type:"exec",parsedCmd:{type:"unknown",cmd:text,isFinished:status==="completed"},
 ...(status===undefined?{}:{executionStatus:status}),
});
const patch={type:"patch",visualizationActivities:[{path:"preview.html",kind:"create"}]};

test("original Jt handles nullable, in-progress and explicitly failed statuses",()=>{
 for(const status of [null,undefined,"inProgress","completed"])
  assert.equal(isSourceVisualizationExecutionStatus(status),true);
 for(const status of ["failed","declined","interrupted","aborted","complete"])
  assert.equal(isSourceVisualizationExecutionStatus(status),false);
});
test("original Kt recognizes only visualizations modifications, not generic commands",()=>{
 assert.equal(classifySourceVisualizationCommand("touch visualizations/view.html"),"create");
 assert.equal(classifySourceVisualizationCommand("mkdir .codex/visualizations"),"create");
 assert.equal(classifySourceVisualizationCommand("*** Add File: src/visualizations/new.html\napply_patch"),"create");
 assert.equal(classifySourceVisualizationCommand("*** Update File: src/visualizations/a.html\napply_patch"),"update");
 assert.equal(classifySourceVisualizationCommand("*** Delete File: src/visualizations/a.html\napply_patch"),null);
 assert.equal(classifySourceVisualizationCommand("grep visualizations/page.html"),null);
 assert.equal(classifySourceVisualizationCommand("touch src/code.ts"),null);
 assert.equal(classifySourceVisualizationCommand("echo hi > file.txt"),null);
 assert.equal(classifySourceVisualizationCommand(undefined),null);
});
test("original qt recognizes visualize skill definitions but not normal skills",()=>{
 assert.equal(isSourceVisualizationSkillRead(read(".codex/skills/visualize/SKILL.md")),true);
 assert.equal(isSourceVisualizationSkillRead(read(".agents/skills/visualize/SKILL.md")),true);
 assert.equal(isSourceVisualizationSkillRead(read("skills/visualize/SKILL.md","C:/team/.codex")),true);
 assert.equal(isSourceVisualizationSkillRead(read("plugins/visualize/skills/live/SKILL.md")),true);
 assert.equal(isSourceVisualizationSkillRead(read("plugins/visualize/skills/persisted/SKILL.md")),true);
 assert.equal(isSourceVisualizationSkillRead(read("plugins/visualize/skills/other/SKILL.md")),false);
 assert.equal(isSourceVisualizationSkillRead(read(".agents/skills/other/SKILL.md")),false);
 assert.equal(isSourceVisualizationSkillRead(read(".codex/skills/visualize/scripts/generate.py")),false);
 assert.equal(isSourceVisualizationSkillRead(read(".codex/skills/other/SKILL.md")),false);
 assert.equal(resolveSourceSkillDefinitionFromRead(read("plugins/visualize/skills/live/SKILL.md")).pluginId,"visualize");
});
test("Ke/fr source defaults suppress source-confirmed reads and visual command/patch pairs",()=>{
 assert.equal(isSourcePreGroupExecSuppressed(cmd("touch visualizations/page.html","inProgress"),patch),true);
 assert.equal(isSourcePreGroupExecSuppressed(cmd("touch visualizations/page.html","completed"),patch),true);
 assert.equal(isSourcePreGroupExecSuppressed(cmd("touch visualizations/page.html","failed"),patch),false);
 assert.equal(isSourcePreGroupExecSuppressed(cmd("touch visualizations/page.html","completed"),{type:"patch",visualizationActivities:[]}),false);
 assert.equal(isSourcePreGroupExecSuppressed(read(".codex/skills/visualize/SKILL.md"),undefined),true);
 assert.equal(isSourcePreGroupExecSuppressed(read(".codex/skills/ordinary/SKILL.md"),undefined),false);
});
test("explicit negative host metadata blocks auto classification",()=>{
 const candidate=cmd("touch visualizations/preview.html","completed");
 assert.equal(isSourcePreGroupExecSuppressed(candidate,patch,{classifyVisualizationCommand:()=>null}),false);
 assert.equal(isSourcePreGroupExecSuppressed(read(".codex/skills/visualize/SKILL.md"),undefined,{isVisualizationSkillRead:()=>false}),false);
});
