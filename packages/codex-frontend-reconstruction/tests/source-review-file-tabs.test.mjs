import test from "node:test";
import assert from "node:assert/strict";
import {
  sourceReviewFileTabId,sourceEmptyLocalReadOnlyTabState,
  sourceOpenLocalReadOnlyFileTab,sourceSelectLocalReadOnlyFileTab,
  sourceCloseLocalReadOnlyFileTab,
} from "../build/SourceReviewFileTabModel.js";

test("original app-initial k3o file tab id uses host and environment only when present",()=>{
  assert.equal(sourceReviewFileTabId("/workspace/src/App.ts"),"file:/workspace/src/App.ts");
  assert.equal(sourceReviewFileTabId(null),"file:");
  assert.equal(sourceReviewFileTabId("/workspace/src/App.ts",{hostId:"local"}),
    "file:local:/workspace/src/App.ts");
  assert.equal(sourceReviewFileTabId("/workspace/src/App.ts",{hostId:"cloud"}),
    "file:cloud:/workspace/src/App.ts");
  assert.equal(sourceReviewFileTabId("/workspace/src/App.ts",{
    hostId:"cloud",environmentId:"env-3",
  }),"file:cloud:env-3:/workspace/src/App.ts");
  assert.equal(sourceReviewFileTabId("/workspace/src/App.ts",{
    hostId:"cloud",environmentId:"env-3",tabId:"explicit-id",
  }),"explicit-id");
});
test("source IX identity deduplicates file tabs, preserves order and updates range/content when reopened",()=>{
  const first={id:"file:/workspace/a.ts",path:"/workspace/a.ts",
    content:{text:"first",line:3}};
  const other={id:"file:/workspace/b.ts",path:"/workspace/b.ts",
    content:{text:"second",line:4}};
  const empty=sourceEmptyLocalReadOnlyTabState();
  const one=sourceOpenLocalReadOnlyFileTab(empty,first);
  assert.deepEqual(one,{tabs:[first],activeTabId:first.id});
  assert.deepEqual(empty,{tabs:[],activeTabId:null});
  const two=sourceOpenLocalReadOnlyFileTab(one,other);
  assert.deepEqual(two.tabs,[first,other]);
  assert.equal(two.activeTabId,other.id);
  const updated={...first,content:{text:"updated",line:14,endLine:28}};
  const reopened=sourceOpenLocalReadOnlyFileTab(two,updated);
  assert.equal(reopened.tabs.length,2);
  assert.deepEqual(reopened.tabs,[updated,other]);
  assert.equal(reopened.activeTabId,first.id);
  const selected=sourceSelectLocalReadOnlyFileTab(reopened,other.id);
  assert.equal(selected.activeTabId,other.id);
  assert.equal(sourceSelectLocalReadOnlyFileTab(selected,"unknown"),selected);
  assert.equal(sourceSelectLocalReadOnlyFileTab(selected,other.id),selected);
});
test("independent read-only tab strip closes selected tab without losing surviving files",()=>{
  const a={id:"file:a",path:"a",content:"a"};
  const b={id:"file:b",path:"b",content:"b"};
  const c={id:"file:c",path:"c",content:"c"};
  const state=[a,b,c].reduce(sourceOpenLocalReadOnlyFileTab,sourceEmptyLocalReadOnlyTabState());
  const withB=sourceSelectLocalReadOnlyFileTab(state,b.id);
  const closeB=sourceCloseLocalReadOnlyFileTab(withB,b.id);
  assert.equal(closeB.activeTabId,c.id);
  assert.deepEqual(closeB.tabs,[a,c]);
  const closeA=sourceCloseLocalReadOnlyFileTab(closeB,a.id);
  assert.equal(closeA.activeTabId,c.id);
  const closeC=sourceCloseLocalReadOnlyFileTab(closeA,c.id);
  assert.deepEqual(closeC,sourceEmptyLocalReadOnlyTabState());
  assert.equal(sourceCloseLocalReadOnlyFileTab(closeC,"unknown"),closeC);
});
