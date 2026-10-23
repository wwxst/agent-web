import test from "node:test";
import assert from "node:assert/strict";
import {
  clampSourceSidebarWidth,sourceSidebarMaxWidth,sourceSidebarWidthFromKey,
} from "../build/SourceSidebarResizeModel.js";
test("original tb retains 240/520 range and 240px main-space reserve",()=>{
  assert.equal(clampSourceSidebarWidth(200,1352),240);
  assert.equal(clampSourceSidebarWidth(900,1352),520);
  assert.equal(clampSourceSidebarWidth(450,600),360);
  assert.equal(clampSourceSidebarWidth(330,430),240);
  assert.equal(clampSourceSidebarWidth(NaN,1352),340);
  assert.equal(sourceSidebarMaxWidth(1352),520);
});
test("original lbi horizontal right-edge keyboard handler uses 10px and bounds",()=>{
  assert.equal(sourceSidebarWidthFromKey(275,"ArrowRight",1352),285);
  assert.equal(sourceSidebarWidthFromKey(275,"ArrowLeft",1352),265);
  assert.equal(sourceSidebarWidthFromKey(275,"Home",1352),240);
  assert.equal(sourceSidebarWidthFromKey(275,"End",1352),520);
  assert.equal(sourceSidebarWidthFromKey(275,"Space",1352),null);
});
