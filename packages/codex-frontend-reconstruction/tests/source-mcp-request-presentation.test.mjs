import test from "node:test";
import assert from "node:assert/strict";
import {
  projectSourceMcpGenericApprovalMessage,
  projectSourceMcpToolApprovalTitle,
} from "../build/SourceMcpApprovalRequestModel.js";

test("original ke/je handles metadata.reason only for nonempty string in plain object",()=>{
  assert.deepEqual(projectSourceMcpGenericApprovalMessage(
    " Tool call needs your approval. Reason: Review file access ",
    {reason:"  Review file access  "}),
    {title:"Review file access",reason:null});
  assert.deepEqual(projectSourceMcpGenericApprovalMessage(
    "Read project files? Reason: For user request",
    {reason:"For user request"}),
    {title:"Read project files?",reason:"For user request"});
  assert.deepEqual(projectSourceMcpGenericApprovalMessage(
    "Read project files?",{reason:"For user request"}),
    {title:"Read project files?",reason:"For user request"});
  assert.deepEqual(projectSourceMcpGenericApprovalMessage(
    "Tool call needs your approval", {reason:"Manual authorization required"}),
    {title:"Manual authorization required",reason:null});
  assert.deepEqual(projectSourceMcpGenericApprovalMessage(
    "Short", {reason:"  "}), {title:"Short",reason:null});
  assert.deepEqual(projectSourceMcpGenericApprovalMessage(
    "Short",[{reason:"do not trust arrays"}]), {title:"Short",reason:null});
  assert.deepEqual(projectSourceMcpGenericApprovalMessage(
    "Short", {reason:4}), {title:"Short",reason:null});
  assert.deepEqual(projectSourceMcpGenericApprovalMessage(
    "Reason: Only text", {reason:"Only text"}),
    {title:"Reason: Only text",reason:"Only text"},
    "original Ae preserves original title when stripping leaves nothing");
});
test("original Se formats only literal quoted MCP tool titles using matched connector name",()=>{
  assert.deepEqual(projectSourceMcpToolApprovalTitle(
    'Allow Untrusted App to run tool "files.search"?',"Trusted Files"),
    {prefix:"Allow Trusted Files to run ",toolName:"files.search",suffix:" tool?"});
  for(const text of [
    "Allow App to use files.search?",
    "Allow App to run tool files.search?",
    'Allow App to run tool "files.search" without question mark',
    "Tool call needs your approval",
  ])assert.equal(projectSourceMcpToolApprovalTitle(text,"Trusted Files"),null,text);
  assert.deepEqual(projectSourceMcpToolApprovalTitle(
    'Allow A to run tool "x"?',"Files"),
    {prefix:"Allow Files to run ",toolName:"x",suffix:" tool?"});
});
