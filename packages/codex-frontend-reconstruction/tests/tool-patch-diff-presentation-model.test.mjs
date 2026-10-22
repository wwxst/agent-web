import { test } from "node:test";
import assert from "node:assert/strict";
import { getToolPatchDiffPresentation as present } from "../build/ToolPatchDiffPresentationModel.js";

test("patch diff stats exclude file headers and track the first added line", () => {
  const diff = [
    "--- a/src/example.ts",
    "+++ b/src/example.ts",
    "@@ -2,3 +2,4 @@",
    " context",
    "-oldValue",
    "+newValue",
    "+anotherValue",
  ].join("\n");
  assert.deepEqual(present(diff), { added: 2, removed: 1, openLocationLine: 3 });
});

test("patch diff stats do not infer additions from a plain new-file preview", () => {
  assert.equal(present("const a = 1;\nconst b = 2;\n"), null);
  assert.equal(present(null), null);
  assert.equal(present(""), null);
});

test("patch diff stats use the first deletion line when no additions exist", () => {
  const diff = [
    "--- a/src/example.ts",
    "+++ b/src/example.ts",
    "@@ -7,2 +7,0 @@",
    "-oldValue",
    "-anotherOldValue",
  ].join("\n");
  assert.deepEqual(present(diff), { added: 0, removed: 2, openLocationLine: 7 });
});

test("patch diff stats fall back to raw +/- counts and line one without a hunk", () => {
  assert.deepEqual(present("+new line\n-old line\n"), {
    added: 1, removed: 1, openLocationLine: 1,
  });
});

test("patch diff stats preserve zero counts for an unchanged parsed unified diff", () => {
  assert.deepEqual(present("--- a/file\n+++ b/file\n@@ -1 +1 @@\n same"), {
    added: 0, removed: 0, openLocationLine: 1,
  });
});

test("patch diff stats omit unchanged plain text", () => {
  assert.equal(present("plain context"), null);
});
