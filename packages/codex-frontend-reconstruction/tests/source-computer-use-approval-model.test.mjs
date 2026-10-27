import test from "node:test";
import assert from "node:assert/strict";
import {
  sourceComputerUseDecision,sourceComputerUseRequestKey,
  sourceComputerUseSubtitle,sourceComputerUseTitle,
  SOURCE_COMPUTER_USE_FIRST_USE_DISCLOSURE,
} from "../build/SourceComputerUseApprovalModel.js";

test("original Computer Use E first-use disclosure and two-paragraph subtitle",()=>{
 const initial={hasPreviouslyApproved:false,subtitle:"Request-specific subtitle"};
 const subtitle=sourceComputerUseSubtitle(initial);
 assert.equal(subtitle,SOURCE_COMPUTER_USE_FIRST_USE_DISCLOSURE+
   "\n\nRequest-specific subtitle");
 assert.match(subtitle,/screenshots/);
 assert.equal(sourceComputerUseSubtitle({...initial,hasPreviouslyApproved:true}),
   "Request-specific subtitle");
 assert.equal(sourceComputerUseSubtitle({hasPreviouslyApproved:true,subtitle:" "}),null);
 assert.equal(sourceComputerUseSubtitle({hasPreviouslyApproved:false,subtitle:null}),
   SOURCE_COMPUTER_USE_FIRST_USE_DISCLOSURE);
 assert.equal(sourceComputerUseTitle({appDisplayName:"Visual Studio Code"}),
   "Allow ChatGPT to use Visual Studio Code?");
});
test("source E scopes default primary to session, always only explicit and never persists decline",()=>{
 const request={disabled:false,persistModes:["session","always"]};
 assert.deepEqual(sourceComputerUseDecision(request,"accept"),
   {decision:"accept",persist:"session"});
 assert.deepEqual(sourceComputerUseDecision(request,"accept","always"),
   {decision:"accept",persist:"always"});
 assert.deepEqual(sourceComputerUseDecision(request,"decline","always"),
   {decision:"decline"});
 const sessionOnly={disabled:false,persistModes:["session"]};
 assert.equal(sourceComputerUseDecision(sessionOnly,"accept","always"),null);
 assert.deepEqual(sourceComputerUseDecision({disabled:false,persistModes:[]},"accept"),
   {decision:"accept"});
 assert.equal(sourceComputerUseDecision({...request,disabled:true},"decline"),null);
 assert.equal(sourceComputerUseDecision({...request,disabled:true},"accept"),null);
});
test("original E per-request guard is scoped to hostId conversationId and requestId",()=>{
 const request={hostId:"host-a",conversationId:"thread-a",requestId:"request-1"};
 assert.deepEqual(JSON.parse(sourceComputerUseRequestKey(request)),
   ["host-a","thread-a","request-1"]);
 for(const identity of [
  {...request,hostId:"host-b"},
  {...request,conversationId:"thread-b"},
  {...request,requestId:"request-2"},
 ])assert.notEqual(sourceComputerUseRequestKey(identity),sourceComputerUseRequestKey(request));
});
