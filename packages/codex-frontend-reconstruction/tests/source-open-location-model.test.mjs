import test from "node:test";
import assert from "node:assert/strict";
import {sourceOpenLocationRequest} from "../build/SourceOpenLocationModel.js";

test("original onOpenLocation converts zero-based range start and resets stale tab state",()=>{
  assert.deepEqual(sourceOpenLocationRequest({
    path:"/workspace/src/App.tsx",
    range:{start:{line:13,character:3},end:{line:14,character:8}},
  }),{
    path:"/workspace/src/App.tsx",
    line:14,column:4,resetTabState:true,
  });
});

test("source onOpenLocation route uses only the target start, not range end",()=>{
  const request=sourceOpenLocationRequest({
    path:"C:\\workspace\\src\\App.tsx",
    range:{start:{line:0,character:0},end:{line:9,character:12}},
  });
  assert.deepEqual(request,{
    path:"C:\\workspace\\src\\App.tsx",
    line:1,column:1,resetTabState:true,
  });
  assert.equal(request && "endLine" in request,false);
});

test("invalid or unbounded source locations fail closed",()=>{
  const valid={path:"/workspace/a.ts",range:{start:{line:0,character:0}}};
  for(const location of [
    null,undefined,{}, {path:"",range:valid.range},
    {path:"/workspace/\u0000a.ts",range:valid.range},
    {path:"/workspace/a.ts",range:{}},
    {path:"/workspace/a.ts",range:{start:{line:-1,character:0}}},
    {path:"/workspace/a.ts",range:{start:{line:0,character:-1}}},
    {path:"/workspace/a.ts",range:{start:{line:1.5,character:0}}},
    {path:"/workspace/a.ts",range:{start:{line:0,character:Number.MAX_SAFE_INTEGER}}},
    {path:"/workspace/a.ts",range:{start:{line:10_000_000,character:0}}},
  ])assert.equal(sourceOpenLocationRequest(location),null,JSON.stringify(location));
});

test("source location route preserves path spelling without leaking native-only fields",()=>{
  const path="/workspace/with spaces/src/file.ts";
  assert.deepEqual(sourceOpenLocationRequest({
    path,range:{start:{line:2,character:7}},
  }),{path,line:3,column:8,resetTabState:true});
});
