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
  assert.deepEqual(present(diff, { type: "update", unified_diff: diff }), {
    added: 2,
    removed: 1,
    openLocationLine: 3,
  });
});

test("patch diff stats fall back to content line counts for added files", () => {
  assert.deepEqual(present("const a = 1;\nconst b = 2;\n", {
    type: "add",
    content: "const a = 1;\nconst b = 2;\n",
  }), { added: 2, removed: 0, openLocationLine: 1 });
});

test("patch diff stats use the first deletion line when no additions exist", () => {
  const diff = [
    "--- a/src/example.ts",
    "+++ b/src/example.ts",
    "@@ -7,2 +7,0 @@",
    "-oldValue",
    "-anotherOldValue",
  ].join("\n");
  assert.deepEqual(present(diff, { type: "update", unified_diff: diff }), {
    added: 0,
    removed: 2,
    openLocationLine: 7,
  });
});

test("patch diff stats fall back to line one for deleted-file content", () => {
  assert.deepEqual(present("old line\nsecond old line", {
    type: "delete",
    content: "old line\nsecond old line",
  }), { added: 0, removed: 2, openLocationLine: 1 });
});

test("patch diff stats omit empty content and preserve zero counts for unchanged unified diffs", () => {
  assert.equal(present(null, { type: "add", content: "" }), null);
  assert.equal(present("plain context", { type: "update" }), null);
  assert.deepEqual(present("--- a/file\n+++ b/file\n@@ -1 +1 @@\n same", {
    type: "update",
    unified_diff: "--- a/file\n+++ b/file\n@@ -1 +1 @@\n same",
  }), { added: 0, removed: 0, openLocationLine: 1 });
});
