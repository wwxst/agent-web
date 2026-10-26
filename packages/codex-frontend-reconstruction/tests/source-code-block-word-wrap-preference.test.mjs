import test from "node:test";
import assert from "node:assert/strict";
import {
  createSourceCodeBlockWordWrapPreference,
  sourceCodeBlockWrapState,
} from "../build/SourceCodeBlockWordWrapPreference.js";

test("source Jrd wraps always/never/user-controlled without fabricated toggle",()=>{
  assert.deepEqual(sourceCodeBlockWrapState({policy:"always",preference:false}),
    {wrapLines:true,canToggle:false});
  assert.deepEqual(sourceCodeBlockWrapState({policy:"never",preference:true}),
    {wrapLines:false,canToggle:false});
  assert.deepEqual(sourceCodeBlockWrapState({policy:"user-controlled",preference:false}),
    {wrapLines:false,canToggle:true});
  assert.deepEqual(sourceCodeBlockWrapState({policy:"user-controlled",preference:true}),
    {wrapLines:true,canToggle:true});
});

test("shared source preference notifies all mounted subscribers only on a change",()=>{
  const preference=createSourceCodeBlockWordWrapPreference();
  let a=0,b=0;
  const unsubscribeA=preference.subscribe(()=>a++);
  const unsubscribeB=preference.subscribe(()=>b++);
  assert.equal(preference.getSnapshot(),false);
  preference.setEnabled(true);
  preference.setEnabled(true);
  assert.equal(preference.getSnapshot(),true);
  assert.deepEqual([a,b],[1,1]);
  unsubscribeA();
  preference.setEnabled(false);
  assert.deepEqual([a,b],[1,2]);
  unsubscribeB();
  preference.setEnabled(true);
  assert.deepEqual([a,b],[1,2]);
});
