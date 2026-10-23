import { test } from "node:test";
import assert from "node:assert/strict";
import { shouldBlockComposerOuterTransfer } from "../build/ComposerOuterFormModel.js";

test("YMt pd/hd only capture-block transfers in voice mode without p0 policy", () => {
  for (const integratedVoiceModeActive of [false, true]) {
    for (const hasUploadPolicy of [false, true]) {
      assert.equal(
        shouldBlockComposerOuterTransfer({ integratedVoiceModeActive, hasUploadPolicy }),
        integratedVoiceModeActive && !hasUploadPolicy,
      );
    }
  }
});
