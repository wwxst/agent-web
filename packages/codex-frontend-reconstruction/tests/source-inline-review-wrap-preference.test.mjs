import test from "node:test";
import assert from "node:assert/strict";
import {createSourceInlineReviewWrapPreference}
  from "../build/SourceInlineReviewWrapPreference.js";

test("original inline diff C retains one snapshot across independent review cards",()=>{
  const preference=createSourceInlineReviewWrapPreference();
  assert.equal(preference.getSnapshot(),false);
  let first=0,second=0;
  const offFirst=preference.subscribe(()=>first++);
  const offSecond=preference.subscribe(()=>second++);
  preference.setEnabled(true);
  assert.equal(preference.getSnapshot(),true);
  assert.deepEqual([first,second],[1,1]);
  preference.setEnabled(true);
  assert.deepEqual([first,second],[1,1],"same value emits no redundant update");
  offFirst();
  preference.setEnabled(false);
  assert.deepEqual([first,second],[1,2]);
  const remountedRead=preference.getSnapshot();
  assert.equal(remountedRead,false,"review remount must read host preference");
  offSecond();
  preference.setEnabled(true);
  assert.deepEqual([first,second],[1,2],"unsubscribed panels receive no updates");
});
