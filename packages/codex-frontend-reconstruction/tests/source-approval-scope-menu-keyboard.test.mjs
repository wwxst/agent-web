import test from "node:test";
import assert from "node:assert/strict";
import {nextSourceApprovalMenuIndex as move} from "../build/SourceApprovalScopeMenuKeyboardModel.js";

test("source qbd scoped menu roves focus with arrows, wrapping and Home/End",()=>{
 assert.equal(move("ArrowDown",0,2),1);
 assert.equal(move("ArrowDown",1,2),0);
 assert.equal(move("ArrowUp",0,2),1);
 assert.equal(move("ArrowUp",1,2),0);
 assert.equal(move("Home",1,2),0);
 assert.equal(move("End",0,2),1);
 assert.equal(move("ArrowDown",-1,2),0);
 assert.equal(move("ArrowUp",-1,2),1);
 assert.equal(move("Home",12,2),0);
 assert.equal(move("ArrowDown",0,0),null);
 assert.equal(move("End",0,-1),null);
 assert.equal(move("ArrowDown",0,1),0);
});
