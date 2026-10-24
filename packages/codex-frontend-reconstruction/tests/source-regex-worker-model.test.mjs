import test from "node:test";
import assert from "node:assert/strict";
import {
  runSourceRegexWorkerRequest,expandSourceMathRegexRange,
} from "../build/SourceRegexSearchWorkerModel.js";

test("original regex worker protocol resets g/iu search for each text, counts uncapped matches",()=>{
  const result=runSourceRegexWorkerRequest({
    texts:["A a a","a+ AAA"],query:"a",maxMatches:3,mathTexts:[false,false],
  });
  assert.deepEqual(result,{
    offsets:[[{start:0,end:1},{start:2,end:3},{start:4,end:5}],[]],
    totalMatches:7,
  });
});
test("source original flags support Unicode case folding and regex alternatives",()=>{
  assert.deepEqual(runSourceRegexWorkerRequest({
    texts:["Test テスト test"],query:"TEST|テスト",maxMatches:10,
  }),{
    offsets:[[{start:0,end:4},{start:5,end:8},{start:9,end:13}]],
    totalMatches:3,
  });
});
test("invalid regex and zero-length matches preserve exact source protocol",()=>{
  assert.deepEqual(runSourceRegexWorkerRequest({
    texts:["text"],query:"[",maxMatches:250,
  }),{offsets:[],totalMatches:0,error:"invalid-regex"});
  assert.deepEqual(runSourceRegexWorkerRequest({
    texts:["a",""],query:"(?=a)|(?=$)",maxMatches:250,
  }),{offsets:[[],[]],totalMatches:0});
});
test("source worker math branch extends \\frac arguments and merges overlapping offsets",()=>{
  const expression="\\frac{ab}{cd} + \\sqrt[3]{xy}";
  assert.deepEqual(expandSourceMathRegexRange(expression,{start:2,end:6}),{start:0,end:13});
  const sqrtAt=expression.indexOf("\\sqrt");
  const sqrt=expandSourceMathRegexRange(expression,{start:sqrtAt,end:sqrtAt+5});
  assert.equal(expression.slice(sqrt.start,sqrt.end),"\\sqrt[3]{xy}");
  const result=runSourceRegexWorkerRequest({
    texts:[expression],query:"frac|ab|cd",maxMatches:1,mathTexts:[true],
  });
  assert.deepEqual(result,{offsets:[[{start:0,end:13}]],totalMatches:1});
});
test("source worker keeps separate rows, zero-cap and non-math exact offsets",()=>{
  const result=runSourceRegexWorkerRequest({
    texts:["\\frac{ab}{cd}","ab"],query:"ab",maxMatches:0,mathTexts:[true,false],
  });
  assert.deepEqual(result,{offsets:[[],[]],totalMatches:2});
});
