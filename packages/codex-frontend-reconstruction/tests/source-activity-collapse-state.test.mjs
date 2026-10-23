import test from "node:test";
import assert from "node:assert/strict";
import {createSourceActivityCollapseState} from "../build/SourceActivityCollapseState.js";

test("Rk host collapse state is keyed and survives the row lifecycle",()=>{
  const store=createSourceActivityCollapseState();
  const seen=[];
  const unsubscribe=store.subscribe(()=>seen.push(store.getSnapshot("c1:t1:a")));
  assert.equal(store.getSnapshot("c1:t1:a"),null);
  store.setCollapsed("c1:t1:a",false);
  assert.equal(store.getSnapshot("c1:t1:a"),false);
  assert.equal(store.getSnapshot("c2:t1:a"),null);
  store.setCollapsed("c1:t1:a",false);
  assert.deepEqual(seen,[false]);
  // Simulates a new row reading the same host-owned key.
  assert.equal(store.getSnapshot("c1:t1:a"),false);
  store.setCollapsed("c2:t1:a",true);
  assert.equal(store.getSnapshot("c2:t1:a"),true);
  unsubscribe();
  store.clear();
  assert.equal(store.getSnapshot("c1:t1:a"),null);
  store.dispose();
  store.setCollapsed("c1:t1:a",true);
  assert.equal(store.getSnapshot("c1:t1:a"),null);
});
test("source subscriptions are removable without losing stored collapse state",()=>{
  const store=createSourceActivityCollapseState();
  let calls=0;
  const stop=store.subscribe(()=>calls++);
  store.setCollapsed("key",true);
  stop();
  store.setCollapsed("key",false);
  assert.equal(calls,1);
  assert.equal(store.getSnapshot("key"),false);
  store.dispose();
});
