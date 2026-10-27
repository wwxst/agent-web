import test from "node:test";
import assert from "node:assert/strict";
import {formatDemoWorkDuration,projectSourceWorkStatus}
  from "../build/SourceWorkStatusModel.js";

test("original SG source labels are status-gated, not a constant thread header",()=>{
 const base={startedAtMs:1_000,completedAtMs:132_000};
 assert.deepEqual(projectSourceWorkStatus({...base,status:"worked"},170_000),{
  status:"worked",label:"Worked for 2m 11s",elapsedMs:131_000
 });
 assert.deepEqual(projectSourceWorkStatus({...base,status:"stopped"},170_000),{
  status:"stopped",label:"You stopped after 2m 11s",elapsedMs:131_000
 });
 assert.equal(projectSourceWorkStatus({...base,status:"not-supported"},170_000),null);
});

test("working source divider distinguishes initial Working and elapsed duration",()=>{
 assert.deepEqual(projectSourceWorkStatus({status:"working",startedAtMs:10_000},10_999),{
  status:"working",label:"Working",elapsedMs:999
 });
 assert.deepEqual(projectSourceWorkStatus({status:"working",startedAtMs:10_000},11_000),{
  status:"working",label:"Working for 1s",elapsedMs:1000
 });
});

test("synchronizing, unknown, paused and invalid timestamp remain explicit",()=>{
 assert.equal(projectSourceWorkStatus({status:"loading"},0)?.label,"Loading activity status");
 assert.equal(projectSourceWorkStatus({status:"unknown"},0)?.label,"Activity");
 assert.equal(projectSourceWorkStatus({status:"paused"},0)?.label,"Paused");
 assert.equal(projectSourceWorkStatus({status:"worked",startedAtMs:0},2000),null);
 assert.equal(projectSourceWorkStatus({status:"worked",startedAtMs:NaN,completedAtMs:2000},2000),null);
 assert.equal(projectSourceWorkStatus({status:"stopped",startedAtMs:3000,completedAtMs:1000},2000)?.elapsedMs,0);
 assert.equal(formatDemoWorkDuration(3_661_000),"1h 1m");
});
