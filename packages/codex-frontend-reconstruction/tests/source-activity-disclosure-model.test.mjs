import {test} from "node:test";
import assert from "node:assert/strict";
import {
 initialSourceDisclosurePhase, toggleSourceDisclosurePhase,
 frameSourceDisclosurePhase, finishSourceDisclosurePhase,
 isSourceDisclosureOpen, isSourceDisclosureMounted,
} from "../build/SourceActivityDisclosureModel.js";

test("A_ defaults to collapsed unless defaultExpanded is true",()=>{
 assert.equal(initialSourceDisclosurePhase({}),"collapsed");
 assert.equal(initialSourceDisclosurePhase({defaultExpanded:true}),"expanded");
 assert.equal(initialSourceDisclosurePhase({defaultExpanded:true,canExpand:false}),"collapsed");
});
test("A_ only initially animates non-lazy children when requested",()=>{
 assert.equal(initialSourceDisclosurePhase({shouldAnimateInitialCollapse:true,hasLazyChildren:false}),"closing");
 assert.equal(initialSourceDisclosurePhase({shouldAnimateInitialCollapse:true,hasLazyChildren:true}),"collapsed");
});
test("A_ opening, closing, and interrupted-closing transitions",()=>{
 let a=toggleSourceDisclosurePhase("collapsed");
 assert.deepEqual(a,{phase:"opening",invokeOnExpand:true});
 assert.equal(isSourceDisclosureOpen(a.phase),true);
 assert.equal(isSourceDisclosureMounted(a.phase),true);
 assert.equal(frameSourceDisclosurePhase(a.phase),"expanded");
 a=toggleSourceDisclosurePhase("opening");
 assert.deepEqual(a,{phase:"closing",invokeOnExpand:false});
 assert.equal(isSourceDisclosureOpen(a.phase),false);
 assert.equal(isSourceDisclosureMounted(a.phase),true);
 assert.deepEqual(toggleSourceDisclosurePhase("closing"),{phase:"expanded",invokeOnExpand:false});
 assert.equal(finishSourceDisclosurePhase("closing"),"collapsed");
 assert.equal(isSourceDisclosureMounted("collapsed"),false);
 assert.equal(finishSourceDisclosurePhase("expanded"),"expanded");
});
test("A_ ignores toggle when the host disallows expansion",()=>{
 assert.deepEqual(toggleSourceDisclosurePhase("collapsed",false),{phase:"collapsed",invokeOnExpand:false});
 assert.deepEqual(toggleSourceDisclosurePhase("expanded",false),{phase:"collapsed",invokeOnExpand:false});
});
