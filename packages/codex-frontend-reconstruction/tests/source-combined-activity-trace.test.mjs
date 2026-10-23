import assert from "node:assert/strict";
import test from "node:test";
import { combineSourceActivityTrace } from "../build/SourceCombinedActivityTrace.js";

const command={id:"cmd",type:"exec"};
const patch={id:"patch",type:"patch"};
const review={id:"approval",type:"permission-request"};
const units=[
  {kind:"group",key:"agent-activity-group:cmd",items:[command]},
  {kind:"standalone",key:"agent-activity-standalone:approval",item:review},
  {kind:"group",key:"agent-activity-group:patch",items:[patch]},
];

test("ek/ok retains units unchanged without host combinedUnitKey",()=>{
  assert.strictEqual(combineSourceActivityTrace(units,null),units);
  assert.strictEqual(combineSourceActivityTrace(units,undefined),units);
  assert.deepEqual(combineSourceActivityTrace([], "trace-id"), []);
});
test("ek/ok combines all grouped and standalone items in source order",()=>{
  const result=combineSourceActivityTrace(units,"turn-trace-17");
  assert.equal(result.length,1);
  assert.deepEqual(result[0],{
    kind:"group",key:"agent-activity-trace:turn-trace-17",
    items:[command,review,patch],
  });
  assert.equal(units.length,3);
  assert.equal(units[0].items.length,1);
});
test("ek/ok keys one trace stably and handles an explicitly empty key",()=>{
  assert.equal(combineSourceActivityTrace(units,"").at(0).key,"agent-activity-trace:");
  assert.equal(combineSourceActivityTrace(units,"abc").at(0).key,"agent-activity-trace:abc");
  assert.equal(combineSourceActivityTrace(units,"xyz").at(0).key,"agent-activity-trace:xyz");
});
