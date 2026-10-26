import test from "node:test";
import assert from "node:assert/strict";
import {
  isAutomaticApprovalReviewInProgress,
  isHighRiskDeniedAutomaticReview,
  getExplicitAuthorizationNotice,
} from "../build/ActivityStatusPresentation.js";

test("original D activates shimmer only for literal inProgress status",()=>{
  for(const status of ["pending","approved","denied","completed","Working",undefined]){
    assert.equal(isAutomaticApprovalReviewInProgress({status}),false,status);
  }
  assert.equal(isAutomaticApprovalReviewInProgress({status:"inProgress"}),true);
  assert.equal(isAutomaticApprovalReviewInProgress({status:"inProgress",riskLevel:"high"}),true);
});
test("source declined state removes review rows and chooses high-risk authorization notice",()=>{
  const high={id:"a",status:"denied",riskLevel:"high"};
  const low={id:"b",status:"denied",riskLevel:"low"};
  assert.equal(isHighRiskDeniedAutomaticReview(high),true);
  assert.equal(isHighRiskDeniedAutomaticReview(low),false);
  assert.equal(getExplicitAuthorizationNotice([high]).id,
    "localConversation.automaticApprovalReview.explicitAuthorizationHighRisk");
  assert.equal(getExplicitAuthorizationNotice([low]).id,
    "localConversation.automaticApprovalReview.explicitAuthorization");
  assert.equal(getExplicitAuthorizationNotice([
    {status:"inProgress",riskLevel:"high"},low,
  ]).id,"localConversation.automaticApprovalReview.explicitAuthorization");
});
